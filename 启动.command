#!/bin/bash
cd "$(dirname "$0")" || exit 1
export PORT="${PORT:-8899}"
export HOST="${HOST:-0.0.0.0}"
if ! command -v node >/dev/null 2>&1; then
  printf '%s\n' '联机服务需要 Node.js 18 或更新版本。也可以双击 index.html 进行单机练习。'
  exit 1
fi

if ! node -e 'require("ws")' >/dev/null 2>&1; then
  npm ci --no-audit --no-fund || exit 1
fi

node server.js &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null || true' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

for attempt in {1..25}; do
  if ! kill -0 "$server_pid" 2>/dev/null; then
    wait "$server_pid"
    exit $?
  fi
  if curl --noproxy '*' --silent --fail "http://127.0.0.1:$PORT/" >/dev/null; then
    open "http://localhost:$PORT/"
    break
  fi
  sleep 0.2
done
wait "$server_pid"
