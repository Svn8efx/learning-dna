#!/bin/sh
# usage: run.sh <node args...>   (starts the backend and static server, runs the browser harness, stops everything)
cd /home/claude/work && STORE_BACKEND=memory SECRET_KEY=test python3 -c "from learning_dna import create_app; create_app().run(port=5055)" > /home/claude/shots/api.log 2>&1 &
API=$!
python3 /home/claude/shots/serve.py > /home/claude/shots/serve.log 2>&1 &
SRV=$!
sleep 4
cd /home/claude/shots && timeout 500 node shoot.mjs "$@"
kill $API $SRV 2>/dev/null
