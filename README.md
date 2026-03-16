# PhoneGent

**A fully local AI agent running on your Android phone via Termux.**  
Ollama LLM + FastAPI backend + React Native frontend. No cloud. No API keys. Full hardware control.

```
                  ┌──────────────────────────────────┐
                  │         React Native App          │
                  │   (Expo · TypeScript · NativeWind) │
                  │                                    │
                  │  Home → Chat → Memory → Settings   │
                  └──────────────┬───────────────────┘
                                 │ WebSocket (ws://LOCAL_IP:8000)
                  ┌──────────────▼───────────────────┐
                  │        FastAPI Backend             │
                  │   (Python · Uvicorn · SQLite)      │
                  │                                    │
                  │  Agent loop → Ollama tool-calling  │
                  │  Memory (SQLite) · Media files      │
                  └──────────────┬───────────────────┘
                                 │ subprocess
                  ┌──────────────▼───────────────────┐
                  │        Termux:API Layer            │
                  │                                    │
                  │  Camera · SMS · Location · Sensors │
                  │  TTS · STT · Flashlight · Vibrate  │
                  │  Fingerprint · Notifications · ...  │
                  └──────────────────────────────────┘
```

---

## Features

| Category        | Tools                                                                 |
|-----------------|-----------------------------------------------------------------------|
| **System**      | Battery, WiFi scan, device info, cellular info                        |
| **Location**    | GPS (via `termux-location`)                                           |
| **Sensors**     | Accelerometer, gyroscope, magnetometer, step counter                  |
| **Camera**      | Photo capture → auto-fed to vision model (LLaVA)                     |
| **Audio**       | Microphone recording, speech-to-text, text-to-speech                  |
| **Controls**    | Flashlight, vibration, brightness, clipboard, notifications           |
| **Comms**       | Read SMS, send SMS, call log                                          |
| **Biometrics**  | Fingerprint authentication                                            |
| **Memory**      | Persistent key/value store — agent auto-saves facts about you         |

---

## Project Structure

```
phonegent/
├── backend/
│   ├── main.py          ← FastAPI server (WebSocket + REST)
│   ├── agent.py         ← LLM agent loop (Ollama tool-calling + streaming)
│   ├── memory.py        ← SQLite: conversations, messages, memories
│   ├── config.py        ← Settings (Pydantic, .env)
│   ├── tools/
│   │   └── __init__.py  ← All 25+ Termux tool wrappers + registry
│   ├── routes/
│   │   └── stt.py       ← Speech-to-text upload endpoint
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── app/
│   │   ├── _layout.tsx  ← Root Expo Router layout
│   │   ├── index.tsx    ← Home: conversation list
│   │   ├── chat.tsx     ← Chat interface (streaming, voice)
│   │   ├── memory.tsx   ← Memory viewer + editor
│   │   └── settings.tsx ← Server URL + diagnostics
│   ├── components/
│   │   ├── ChatBubble.tsx    ← User / assistant / tool bubbles
│   │   ├── VoiceButton.tsx   ← Animated press-hold mic button
│   │   └── ToolIndicator.tsx ← Live tool execution banner
│   ├── hooks/
│   │   ├── useApi.ts         ← HTTP REST client
│   │   ├── useWebSocket.ts   ← WebSocket + streaming handler
│   │   └── useVoice.ts       ← Microphone recording
│   ├── store/
│   │   └── index.ts          ← Zustand global state
│   ├── constants/
│   │   └── theme.ts          ← Colors, typography, spacing
│   └── package.json
│
├── setup.sh   ← One-shot Termux install script
├── start.sh   ← Starts Ollama + backend
└── README.md
```

---

## Setup

### Prerequisites on your Android phone

1. Install **Termux** from [F-Droid](https://f-droid.org/packages/com.termux/) (not Play Store)
2. Install **Termux:API** from [F-Droid](https://f-droid.org/packages/com.termux.api/)
3. In Android Settings → Apps → Termux:API → grant **all permissions**
4. In Android Settings → Battery → Termux → **disable battery optimization**

---

### Backend (Termux on your phone)

```bash
# 1. Clone or copy the project into Termux
cd ~
git clone https://github.com/you/phonegent
cd phonegent

# 2. Run the install script (downloads Ollama + models + Python deps)
bash setup.sh

# 3. Start everything
bash start.sh
```

The script will print your phone's local IP, e.g. `192.168.1.42`.

---

### Frontend (React Native)

```bash
cd frontend

# Install JS dependencies
npm install

# Start Expo
npx expo start

# Scan the QR code with Expo Go on your phone
# OR build an APK:
npx expo run:android
```

In the app → **Settings** → set the WebSocket URL to:
```
ws://192.168.1.42:8000
```
(replace with your phone's actual IP from `start.sh` output)

---

## Configuration

Edit `backend/.env`:

```env
OLLAMA_MODEL=llama3          # Text model — llama3, mistral, phi3, etc.
OLLAMA_VISION_MODEL=llava    # Vision model — llava, llava-phi3
OLLAMA_TIMEOUT=120           # Seconds before timeout

HOST=0.0.0.0
PORT=8000

DB_PATH=./phonegent.db
MEDIA_DIR=./media
```

---

## API Reference

### WebSocket  `ws://HOST:8000/ws/chat/{conv_id}`

**Send:**
```json
{ "message": "What's my battery level?" }
```

**Receive (streaming events):**
```json
{ "type": "text",        "content": "Your battery is at " }
{ "type": "text",        "content": "87%." }
{ "type": "tool_start",  "name": "get_battery_status", "args": {} }
{ "type": "tool_result", "name": "get_battery_status", "result": { "percentage": 87 } }
{ "type": "done" }
```

### REST

| Method | Path                              | Description                |
|--------|-----------------------------------|----------------------------|
| POST   | `/api/conversations`              | Create conversation        |
| GET    | `/api/conversations`              | List all conversations     |
| GET    | `/api/conversations/{id}/messages`| Get messages               |
| DELETE | `/api/conversations/{id}`         | Delete conversation        |
| GET    | `/api/memories`                   | List all memories          |
| POST   | `/api/memories`                   | Upsert a memory            |
| DELETE | `/api/memories/{key}`             | Delete a memory            |
| POST   | `/api/stt`                        | Upload audio → transcribe  |
| GET    | `/health`                         | Health + model info        |

---

## Adding a New Tool

1. Write the async function in `backend/tools/__init__.py`:

```python
async def my_new_tool(args: dict) -> dict:
    """What it does."""
    return await _arun(["termux-something", args.get("param", "")])
```

2. Register it in `TOOL_REGISTRY`:

```python
"my_new_tool": {
    "fn": my_new_tool,
    "description": "Description the LLM sees.",
    "parameters": {
        "type": "object",
        "properties": {
            "param": {"type": "string", "description": "..."}
        },
        "required": ["param"],
    },
},
```

3. Add an icon in `frontend/components/ToolIndicator.tsx`:

```typescript
my_new_tool: '🛠️',
```

That's it — the agent can now call it automatically.

---

## Model Recommendations

| Phone RAM | Recommended model         | Notes                      |
|-----------|---------------------------|----------------------------|
| 4 GB      | `phi3:mini`               | Fast, capable              |
| 6 GB      | `llama3` / `mistral:7b`   | Best balance               |
| 8 GB+     | `llama3:8b` / `mixtral`   | Best quality               |
| Vision    | `llava` / `llava-phi3`    | Required for take_photo    |

Change `OLLAMA_MODEL` in `.env` and restart.

---

## Sensitive Tool Policy

The following tools ask for user confirmation before executing:
- `send_sms` — sends a real SMS
- `read_sms` — reads private messages
- `take_photo` — activates the camera
- `record_audio` — activates the microphone
- `authenticate_fingerprint` — biometric prompt

The system prompt enforces this — the agent will always ask before calling them.

---

## Troubleshooting

**"Could not connect" in the app:**
- Make sure `start.sh` is running in Termux
- Phone and computer must be on the same WiFi
- Try `curl http://YOUR_IP:8000/health` from another device

**Ollama is slow:**
- Use a smaller model: `phi3:mini` or `tinyllama`
- Close other apps to free RAM
- Enable `termux-wake-lock` to prevent CPU throttling

**termux-api commands fail:**
- Ensure Termux:API app is installed from F-Droid
- Check all permissions are granted in Android Settings
- Test manually: `termux-battery-status` in Termux

**Vision doesn't work:**
- Run: `ollama pull llava`
- Set `OLLAMA_VISION_MODEL=llava` in `.env`

---

## License

MIT — build whatever you want.
