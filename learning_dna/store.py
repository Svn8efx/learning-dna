"""Persistence layer.

Per-student data (plan, quiz state, accessibility profile and preferences), quiz results,
monitoring events and learning content are stored through a small `Store` interface with two
implementations: MongoDB (default when reachable) and an in-memory fallback so the demo still
runs on a laptop with no database installed.

The browser only keeps an opaque `student_id` in the Flask session cookie.
"""
from __future__ import annotations

import copy
import logging
import threading
import time
import uuid
from collections.abc import MutableMapping

from flask import g, session

from learning_dna import config

log = logging.getLogger("learning_dna.store")

PLAN_KEYS = ("profile", "quiz_items", "assessment", "answers")
_DOT = "\uff0e"      # MongoDB field names should not contain '.', URLs used as keys do
_DOLLAR = "\uff04"


def _encode(obj):
    if isinstance(obj, dict):
        return {str(k).replace(".", _DOT).replace("$", _DOLLAR): _encode(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_encode(v) for v in obj]
    return obj


def _decode(obj):
    if isinstance(obj, dict):
        return {k.replace(_DOT, ".").replace(_DOLLAR, "$"): _decode(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_decode(v) for v in obj]
    return obj


class MemoryStore:
    name = "memory"

    def __init__(self):
        self._lock = threading.Lock()
        self._students, self._results, self._events, self._content = {}, [], [], {}

    def load_student(self, sid):
        with self._lock:
            return copy.deepcopy(self._students.get(sid, {}))

    def save_student(self, sid, fields, unset=()):
        with self._lock:
            doc = self._students.setdefault(sid, {"student_id": sid, "created_at": time.time()})
            doc.update(copy.deepcopy(fields))
            for key in unset:
                doc.pop(key, None)
            doc["updated_at"] = time.time()

    def add_quiz_result(self, sid, doc):
        with self._lock:
            self._results.append({"student_id": sid, **copy.deepcopy(doc)})

    def list_quiz_results(self, sid):
        with self._lock:
            return [copy.deepcopy(r) for r in self._results if r["student_id"] == sid]

    def add_event(self, sid, doc):
        with self._lock:
            self._events.append({"student_id": sid, **copy.deepcopy(doc)})

    def list_events(self, sid, limit=2000):
        with self._lock:
            return [copy.deepcopy(e) for e in self._events if e["student_id"] == sid][-limit:]

    def get_content(self, topic):
        with self._lock:
            return copy.deepcopy(self._content.get(topic))

    def upsert_content(self, topic, doc):
        with self._lock:
            self._content[topic] = copy.deepcopy(doc)


class MongoStore:
    name = "mongodb"

    def __init__(self, uri, db_name):
        from pymongo import ASCENDING, MongoClient

        self.client = MongoClient(uri, serverSelectionTimeoutMS=2000)
        self.client.admin.command("ping")          # fail fast if the server is not reachable
        self.db = self.client[db_name]
        self.db.students.create_index("student_id", unique=True)
        self.db.quiz_results.create_index([("student_id", ASCENDING), ("ts", ASCENDING)])
        self.db.events.create_index([("student_id", ASCENDING), ("ts", ASCENDING)])
        self.db.content.create_index("topic", unique=True)

    def load_student(self, sid):
        doc = self.db.students.find_one({"student_id": sid}, {"_id": 0}) or {}
        return _decode(doc)

    def save_student(self, sid, fields, unset=()):
        update = {"$set": {**_encode(fields), "updated_at": time.time()},
                  "$setOnInsert": {"student_id": sid, "created_at": time.time()}}
        if unset:
            update["$unset"] = {k: "" for k in unset}
        self.db.students.update_one({"student_id": sid}, update, upsert=True)

    def add_quiz_result(self, sid, doc):
        self.db.quiz_results.insert_one({"student_id": sid, **_encode(doc)})

    def list_quiz_results(self, sid):
        return [_decode(d) for d in self.db.quiz_results.find({"student_id": sid}, {"_id": 0}).sort("ts", 1)]

    def add_event(self, sid, doc):
        self.db.events.insert_one({"student_id": sid, **_encode(doc)})

    def list_events(self, sid, limit=2000):
        cursor = self.db.events.find({"student_id": sid}, {"_id": 0}).sort("ts", -1).limit(limit)
        return [_decode(d) for d in reversed(list(cursor))]

    def get_content(self, topic):
        doc = self.db.content.find_one({"topic": topic}, {"_id": 0})
        return _decode(doc) if doc else None

    def upsert_content(self, topic, doc):
        self.db.content.update_one({"topic": topic}, {"$set": _encode({**doc, "topic": topic})}, upsert=True)


def create_store(backend=None, uri=None, db_name=None):
    backend = (backend or config.STORE_BACKEND).lower()
    if backend != "memory":
        try:
            store = MongoStore(uri or config.MONGO_URI, db_name or config.MONGO_DB)
            log.warning("Using MongoDB store (%s)", db_name or config.MONGO_DB)
            return store
        except Exception as exc:                       # noqa: BLE001 - any connection problem
            if backend == "mongo":
                raise RuntimeError(f"STORE_BACKEND=mongo but MongoDB is not reachable: {exc}") from exc
            log.warning("MongoDB not reachable (%s). Falling back to in-memory store.", exc)
    return MemoryStore()


class _StoreHolder:
    """Lets the rest of the code import `store` before the app (and the database) is created."""
    def __init__(self):
        self.impl = MemoryStore()

    def __getattr__(self, item):
        return getattr(self.impl, item)


store = _StoreHolder()


def init_store(backend=None, uri=None, db_name=None):
    store.impl = create_store(backend, uri, db_name)
    return store.impl


class StudentState(MutableMapping):
    """Dict-like view of the current student's saved data, backed by `store`.

    Behaves like Flask's `session` (get / [] / pop) but writes through to the database.
    """

    def student_id(self):
        sid = session.get("student_id")
        if not sid:
            sid = uuid.uuid4().hex
            session["student_id"] = sid
        session.permanent = True
        return sid

    def _doc(self):
        sid = self.student_id()
        cache = g.__dict__.setdefault("_student_cache", {})
        if sid not in cache:
            cache[sid] = store.load_student(sid)
        return cache[sid]

    def __getitem__(self, key):
        return self._doc()[key]

    def __setitem__(self, key, value):
        self._doc()[key] = value
        store.save_student(self.student_id(), {key: value})

    def __delitem__(self, key):
        doc = self._doc()
        if key in doc:
            del doc[key]
            store.save_student(self.student_id(), {}, unset=(key,))

    def __iter__(self):
        return iter(self._doc())

    def __len__(self):
        return len(self._doc())

    def clear_plan(self):
        """Start a new study plan but keep the student's accessibility settings and history."""
        for key in PLAN_KEYS:
            self.pop(key, None)


state = StudentState()
