#!/data/data/com.termux/files/usr/bin/bash
# ════════════════════════════════════════════════════════════════
# PhoneGent — Start script
# Launches Ollama + FastAPI backend in one command.
# Usage:  bash start.sh
# ════════════════════════════════════════════════════════════════

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

say()  { echo -e "${CYAN}▶ $1${NC}"; }
ok()   { echo -e "${GREEN}✓ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── Start Ollama if not running ──────────────────────────────
if ! pgrep -x "ollama" > /dev/null; then
  say "Starting Ollama…"
  ollama serve &>/dev/null &
  OLLAMA_PID=$!
  sleep 3
  ok "Ollama started (PID $OLLAMA_PID)"
else
  ok "Ollama already running"
fi

# ── Print IP ────────────────────────────────────────────────
IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7; exit}' || hostname -I | awk '{print $1}')
ok "Phone IP: ${IP}"
echo ""
echo -e "  App server URL:  ${CYAN}ws://${IP}:8000${NC}"
echo ""

# ── Start backend ────────────────────────────────────────────
say "Starting PhoneGent backend…"
cd "$SCRIPT_DIR/backend"
python main.py
