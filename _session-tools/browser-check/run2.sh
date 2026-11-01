#!/bin/sh
cd /home/claude/work && STORE_BACKEND=memory SECRET_KEY=test python3 -c "from learning_dna import create_app; create_app().run(port=5055)" > /home/claude/shots/api.log 2>&1 &
API=$!
python3 /home/claude/shots/serve.py > /home/claude/shots/serve.log 2>&1 &
SRV=$!
sleep 4
cd /home/claude/shots && timeout 560 node interact.mjs
kill $API $SRV 2>/dev/null
