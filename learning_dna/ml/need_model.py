"""Learning-need classifier (TensorFlow / Keras).

Given a student's self-declared intake answers, the model suggests which *presentation style*
will probably suit them best. It does NOT diagnose a disability: every answer is declared by the
student, and the student can change every setting afterwards.

Classes
  audio_first       screen reader + text-to-speech, audio-friendly content, high contrast
  captioned_visual  captions, transcripts, visual alerts, diagram-rich content
  hands_free        keyboard and voice control, large targets, little precise pointing
  balanced          standard layout with light adjustments

Training data is SYNTHETIC: labels come from transparent scoring rules plus noise (see
`make_synthetic_data`). The accuracy printed by train() therefore measures how well the network
learned those rules, not how well it predicts real students. Replace the generator with real,
consented data from a pilot to improve it.

If TensorFlow is not installed the same interface falls back to scikit-learn.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

import numpy as np

CLASSES = ["audio_first", "captioned_visual", "hands_free", "balanced"]
FEATURES = [
    "vision_need", "hearing_need", "motor_need",
    "prefers_audio", "prefers_captions", "prefers_visuals",
    "prefers_slow_pace", "recent_quiz_score",
]
FEATURE_LABELS = {
    "vision_need": "vision needs",
    "hearing_need": "hearing needs",
    "motor_need": "hand or mobility needs",
    "prefers_audio": "preference for audio",
    "prefers_captions": "preference for captions",
    "prefers_visuals": "preference for visuals",
    "prefers_slow_pace": "preference for a slower pace",
    "recent_quiz_score": "recent quiz score",
}
MODEL_DIR = Path(__file__).resolve().parents[2] / "models"
MODEL_PATH = MODEL_DIR / "need_classifier.keras"
META_PATH = MODEL_DIR / "need_classifier.json"


def make_synthetic_data(n: int = 5000, seed: int = 7):
    rng = np.random.default_rng(seed)
    vision = rng.choice([0, 0.5, 1.0], n, p=[0.6, 0.2, 0.2])
    hearing = rng.choice([0, 0.5, 1.0], n, p=[0.6, 0.2, 0.2])
    motor = rng.choice([0, 0.5, 1.0], n, p=[0.6, 0.2, 0.2])
    audio = rng.integers(0, 2, n).astype(float)
    captions = rng.integers(0, 2, n).astype(float)
    visuals = rng.integers(0, 2, n).astype(float)
    slow = rng.integers(0, 2, n).astype(float)
    quiz = rng.uniform(0, 1, n)
    X = np.stack([vision, hearing, motor, audio, captions, visuals, slow, quiz], axis=1).astype("float32")

    scores = np.stack([
        1.4 * vision + 0.7 * audio - 0.4 * hearing,                                    # audio_first
        1.4 * hearing + 0.7 * captions + 0.3 * visuals - 0.8 * vision,                 # captioned_visual
        1.4 * motor + 0.1 * slow - 0.2 * vision,                                       # hands_free
        np.full(n, 0.55) + 0.1 * (quiz < 0.4),                                         # balanced
    ], axis=1)
    scores = scores + rng.normal(0, 0.12, scores.shape)
    y = scores.argmax(axis=1)
    return X, y


def encode_intake(intake: dict, quiz_score_pct: float | None = None) -> np.ndarray:
    """Turn questionnaire answers (see routes/profiling.py) into the model's input vector."""
    level = {"none": 0.0, "some": 0.5, "high": 1.0}
    vec = [
        level.get(intake.get("vision", "none"), 0.0),
        level.get(intake.get("hearing", "none"), 0.0),
        level.get(intake.get("motor", "none"), 0.0),
        1.0 if intake.get("prefers_audio") else 0.0,
        1.0 if intake.get("prefers_captions") else 0.0,
        1.0 if intake.get("prefers_visuals") else 0.0,
        1.0 if intake.get("pace") == "slow" else 0.0,
        0.5 if quiz_score_pct is None else max(0.0, min(1.0, quiz_score_pct / 100.0)),
    ]
    return np.array([vec], dtype="float32")


class NeedClassifier:
    def __init__(self):
        self.backend = "uninitialised"
        self.model = None
        self.metrics: dict = {}

    # ---- training / loading ----
    def train(self, epochs: int = 40, save: bool = True) -> dict:
        X, y = make_synthetic_data()
        split = int(len(X) * 0.8)
        Xtr, ytr, Xva, yva = X[:split], y[:split], X[split:], y[split:]
        try:
            import tensorflow as tf
            tf.keras.utils.set_random_seed(7)
            model = tf.keras.Sequential([
                tf.keras.layers.Input(shape=(len(FEATURES),)),
                tf.keras.layers.Dense(16, activation="relu"),
                tf.keras.layers.Dense(8, activation="relu"),
                tf.keras.layers.Dense(len(CLASSES), activation="softmax"),
            ])
            model.compile(optimizer="adam", loss="sparse_categorical_crossentropy", metrics=["accuracy"])
            model.fit(Xtr, ytr, epochs=epochs, batch_size=64, verbose=0, validation_data=(Xva, yva))
            _, acc = model.evaluate(Xva, yva, verbose=0)
            self.model, self.backend = model, "tensorflow"
            if save:
                MODEL_DIR.mkdir(exist_ok=True)
                model.save(MODEL_PATH)
        except ImportError:
            from sklearn.linear_model import LogisticRegression
            clf = LogisticRegression(max_iter=1000).fit(Xtr, ytr)
            acc = float(clf.score(Xva, yva))
            self.model, self.backend = clf, "scikit-learn-fallback"
        self.metrics = {"backend": self.backend, "validation_accuracy": round(float(acc), 3),
                        "training_data": "synthetic (rule-generated with noise)", "samples": int(len(X))}
        if save:
            MODEL_DIR.mkdir(exist_ok=True)
            META_PATH.write_text(json.dumps(self.metrics, indent=2))
        return self.metrics

    def load_or_train(self):
        if self.model is not None:
            return self
        try:
            import tensorflow as tf
            if MODEL_PATH.exists():
                self.model = tf.keras.models.load_model(MODEL_PATH)
                self.backend = "tensorflow"
                if META_PATH.exists():
                    self.metrics = json.loads(META_PATH.read_text())
                return self
        except ImportError:
            pass
        self.train(save=False)
        return self

    # ---- inference ----
    def predict(self, x: np.ndarray) -> dict:
        self.load_or_train()
        if self.backend == "tensorflow":
            probs = self.model.predict(x, verbose=0)[0]
        else:
            probs = self.model.predict_proba(x)[0]
        best = int(np.argmax(probs))
        return {
            "mode": CLASSES[best],
            "confidence": round(float(probs[best]), 3),
            "probabilities": {c: round(float(p), 3) for c, p in zip(CLASSES, probs)},
            "drivers": self.explain(x, best),
        }

    def explain(self, x: np.ndarray, class_index: int, top_k: int = 3) -> list[dict]:
        """Which answers pushed the model towards this class (gradient x input on the raw scores).

        Raw scores (logits) are used instead of the softmax output, because a confident softmax
        has almost no gradient. `strength` is each answer's share of the total explanation.
        """
        if self.backend == "tensorflow":
            import tensorflow as tf
            tx = tf.convert_to_tensor(x)
            with tf.GradientTape() as tape:
                tape.watch(tx)
                hidden = tx
                for layer in self.model.layers[:-1]:
                    hidden = layer(hidden)
                out = self.model.layers[-1]
                logits = tf.matmul(hidden, out.kernel) + out.bias
                others = tf.reduce_mean(tf.concat([logits[:, :class_index], logits[:, class_index + 1:]], axis=1))
                margin = logits[0, class_index] - others
            attribution = (tape.gradient(margin, tx).numpy() * x)[0]
        else:
            coef = self.model.coef_
            others = np.delete(coef, class_index, axis=0).mean(axis=0)
            attribution = (coef[class_index] - others) * x[0]
        total = float(np.abs(attribution).sum()) or 1.0
        order = np.argsort(-np.abs(attribution))[:top_k]
        return [{"feature": FEATURE_LABELS[FEATURES[i]],
                 "effect": "towards" if attribution[i] > 0 else "away from",
                 "strength": round(float(abs(attribution[i]) / total), 3)}
                for i in order if abs(attribution[i]) > 1e-6]


classifier = NeedClassifier()
