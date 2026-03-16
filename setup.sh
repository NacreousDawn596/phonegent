#!/data/data/com.termux/files/usr/bin/bash
# ════════════════════════════════════════════════════════════════
# PhoneGent — Termux Install Script
# Run this inside Termux on your Android phone.
# ════════════════════════════════════════════════════════════════

set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

say()   { echo -e "${CYAN}▶ $1${NC}"; }
ok()    { echo -e "${GREEN}✓ $1${NC}"; }
warn()  { echo -e "${YELLOW}⚠ $1${NC}"; }
die()   { echo -e "${RED}✗ $1${NC}"; exit 1; }

echo ""
echo -e "${BOLD}  PhoneGent — Local AI Agent Setup${NC}"
echo -e "  ─────────────────────────────────────"
echo ""

# ── 1. Update packages ───────────────────────────────────────
say "Updating Termux packages…"
pkg update -y && pkg upgrade -y
ok "Packages updated"

# ── 2. Core dependencies ─────────────────────────────────────
say "Installing core dependencies…"
pkg install -y \
  python \
  python-pip \
  git \
  curl \
  wget \
  openssl \
  libsqlite \
  libjpeg-turbo \
  build-essential
ok "Core dependencies installed"

# ── 3. Termux:API ────────────────────────────────────────────
say "Installing termux-api package…"
pkg install -y termux-api
ok "termux-api installed"
warn "IMPORTANT: Install the 'Termux:API' companion app from F-Droid too!"
warn "Grant ALL permissions to Termux:API in Android Settings → Apps."

# ── 4. Ollama ────────────────────────────────────────────────
say "Installing Ollama…"
if ! command -v ollama &> /dev/null; then
  curl -fsSL https://ollama.ai/install.sh | sh
  ok "Ollama installed"
else
  ok "Ollama already installed"
fi

# ── 5. Pull models ───────────────────────────────────────────
say "Pulling LLaMA 3 (text model)…"
warn "This will download ~4GB. Make sure you're on WiFi."
ollama pull llama3 || warn "llama3 pull failed — try manually: ollama pull llama3"

say "Pulling LLaVA (vision model)…"
ollama pull llava || warn "llava pull failed — try manually: ollama pull llava"
ok "Models ready"

# ── 6. Python deps ───────────────────────────────────────────
say "Installing Python dependencies…"
BACKEND_DIR="$(dirname "$0")/backend"
if [ -f "$BACKEND_DIR/requirements.txt" ]; then
  pip install --upgrade pip
  pip install -r "$BACKEND_DIR/requirements.txt"
  ok "Python dependencies installed"
else
  warn "backend/requirements.txt not found — install manually"
fi

# ── 7. Environment ───────────────────────────────────────────
say "Setting up .env file…"
if [ ! -f "$BACKEND_DIR/.env" ]; then
  cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
  ok ".env created from template"
else
  ok ".env already exists"
fi

# ── 8. Get IP address ────────────────────────────────────────
echo ""
say "Detecting your local IP address…"
IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7; exit}' || hostname -I | awk '{print $1}')
ok "Your phone's IP: ${BOLD}${IP}${NC}"
echo ""
echo -e "  In the React Native app Settings, enter:"
echo -e "  ${BOLD}ws://${IP}:8000${NC}"
echo ""

# ── Done ─────────────────────────────────────────────────────
echo -e "${GREEN}${BOLD}  ✓ Setup complete!${NC}"
echo ""
echo -e "  To start the backend:"
echo -e "  ${BOLD}cd backend && python main.py${NC}"
echo ""
echo -e "  To start Ollama (if not running):"
echo -e "  ${BOLD}ollama serve${NC}"
echo ""
