#!/bin/bash
# PatchBoards — start script
# Usage: ./start.sh

set -e

# ── Proxy settings (optional) ─────────────────────────
# Only needed if running through a proxy. Leave blank if not.
# export HTTP_PROXY="http://your-proxy:port"
# export HTTPS_PROXY="http://your-proxy:port"
# export NO_PROXY="localhost,127.0.0.1,::1"
# ──────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER="$SCRIPT_DIR/server/server.py"
URL="http://localhost:4242"

# Check Python 3
if ! command -v python3 &>/dev/null; then
  echo "❌  Python 3 is required. Install it from https://python.org"
  exit 1
fi

# Check Homebrew
if ! command -v brew &>/dev/null; then
  echo "⚠️  Homebrew not found. Install from https://brew.sh"
  echo "   Continuing anyway — winget-only mode."
fi

echo ""
echo "  Starting PatchBoards..."
echo ""

# Start the local server in the background
python3 "$SERVER" &
SERVER_PID=$!

# Give it a moment to start
sleep 1

# Open the dashboard
if [[ "$OSTYPE" == "darwin"* ]] || command -v open &>/dev/null; then
  open "$URL"
elif command -v xdg-open &>/dev/null; then
  xdg-open "$URL"
elif [[ "$OS" == "Windows_NT" ]]; then
  cmd.exe /c start "" "$URL"
else
  echo "  Open $URL in your browser"
fi

echo "  Dashboard opened at $URL  (Server PID: $SERVER_PID)"
echo "  Press Ctrl+C to stop the server."
echo ""

# Wait for Ctrl+C and clean up
trap "kill $SERVER_PID 2>/dev/null; echo '  Server stopped.'; exit 0" INT
wait $SERVER_PID
