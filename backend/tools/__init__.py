"""
tools/__init__.py — All Termux hardware tools + registry
"""
from __future__ import annotations

import asyncio
import base64
import json
import subprocess
import time
from pathlib import Path
from typing import Any, Callable, Coroutine

from config import settings
from loguru import logger

MEDIA_DIR = Path(settings.MEDIA_DIR)
MEDIA_DIR.mkdir(parents=True, exist_ok=True)


# ──────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────
def _run(cmd: list[str], timeout: int = 15) -> dict:
    """Run a Termux API command synchronously and parse JSON output."""
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        if result.returncode != 0:
            return {"error": result.stderr.strip() or "Command failed"}
        if not result.stdout.strip():
            return {"status": "ok"}
        return json.loads(result.stdout)
    except subprocess.TimeoutExpired:
        return {"error": f"Command timed out after {timeout}s"}
    except json.JSONDecodeError:
        return {"raw": result.stdout.strip()}
    except Exception as e:
        return {"error": str(e)}


async def _arun(cmd: list[str], timeout: int = 15) -> dict:
    """Async wrapper around _run."""
    return await asyncio.to_thread(_run, cmd, timeout)


# ──────────────────────────────────────────────────────────
# SYSTEM
# ──────────────────────────────────────────────────────────
async def get_battery_status(_: dict = {}) -> dict:
    """Returns battery percentage, health, temperature, and charging status."""
    return await _arun(["termux-battery-status"])

async def get_device_info(_: dict = {}) -> dict:
    """Returns device model, manufacturer, Android version, and unique ID."""
    return await _arun(["termux-telephony-deviceinfo"])

# ──────────────────────────────────────────────────────────
# LOCATION
# ──────────────────────────────────────────────────────────
async def get_location(args: dict = {}) -> dict:
    """
    Returns GPS latitude, longitude, altitude, accuracy, and bearing.
    args: { "provider": "gps" | "network" | "passive" }
    """
    provider = args.get("provider", "gps")
    return await _arun(["termux-location", "-p", provider, "-r", "once"], timeout=30)


# ──────────────────────────────────────────────────────────
# SENSORS
# ──────────────────────────────────────────────────────────
async def get_sensor_data(args: dict = {}) -> dict:
    """
    Returns readings from device sensors.
    args: { "sensor": "accelerometer" | "gyroscope" | "magnetometer" | ... }
    Default returns all available sensors.
    """
    sensor = args.get("sensor", "all")
    if sensor == "all":
        result = await _arun(["termux-sensor", "-a", "-n", "1"])
    else:
        result = await _arun(["termux-sensor", "-s", sensor, "-n", "1"])
    return result


async def get_step_count(_: dict = {}) -> dict:
    """Returns step count from the pedometer sensor since last reboot."""
    return await _arun(["termux-sensor", "-s", "step counter", "-n", "1"])


# ──────────────────────────────────────────────────────────
# CAMERA
# ──────────────────────────────────────────────────────────
async def take_photo(args: dict = {}) -> dict:
    """
    Captures a photo using the device camera.
    args: { "camera": "0" | "1" }  (0=back, 1=front)
    Returns { "path": ..., "base64": ... } so vision model can use it.
    """
    camera_id = str(args.get("camera", "0"))
    filename = f"photo_{int(time.time())}.jpg"
    filepath = MEDIA_DIR / filename
    result = await _arun(
        ["termux-camera-photo", "-c", camera_id, str(filepath)], timeout=20
    )
    if "error" in result:
        return result
    if filepath.exists():
        b64 = base64.b64encode(filepath.read_bytes()).decode()
        return {"status": "captured", "path": str(filepath), "base64": b64}
    return {"error": "Photo file not found after capture"}


# ──────────────────────────────────────────────────────────
# MICROPHONE / SPEECH
# ──────────────────────────────────────────────────────────
async def record_audio(args: dict = {}) -> dict:
    """
    Records audio from the microphone.
    args: { "duration": 5 }  seconds
    Returns { "path": ..., "base64": ... }
    """
    duration = int(args.get("duration", 5))
    filename = f"audio_{int(time.time())}.m4a"
    filepath = MEDIA_DIR / filename
    result = await _arun(
        ["termux-microphone-record", "-f", str(filepath), "-d", str(duration)],
        timeout=duration + 10,
    )
    if filepath.exists():
        b64 = base64.b64encode(filepath.read_bytes()).decode()
        return {"status": "recorded", "path": str(filepath), "base64": b64}
    return {"error": "Audio file not found", "raw": result}


async def speech_to_text(_: dict = {}) -> dict:
    """Uses Android built-in STT to transcribe speech. Returns { 'text': ... }"""
    return await _arun(["termux-speech-to-text"], timeout=30)


async def speak_text(args: dict) -> dict:
    """
    Speaks text aloud via TTS.
    args: { "text": "...", "lang": "en" }
    """
    text = args.get("text", "")
    lang = args.get("lang", "en")
    if not text:
        return {"error": "No text provided"}
    return await _arun(["termux-tts-speak", "-l", lang, text], timeout=30)


# ──────────────────────────────────────────────────────────
# PHONE CONTROL
# ──────────────────────────────────────────────────────────
async def vibrate_phone(args: dict = {}) -> dict:
    """
    Vibrates the phone.
    args: { "duration": 300, "force": false }
    """
    duration = str(args.get("duration", 300))
    force = args.get("force", False)
    cmd = ["termux-vibrate", "-d", duration]
    if force:
        cmd.append("-f")
    return await _arun(cmd)


async def toggle_flashlight(args: dict = {}) -> dict:
    """
    Toggles the camera flashlight.
    args: { "on": true | false }
    """
    state = "on" if args.get("on", True) else "off"
    return await _arun(["termux-torch", state])


async def set_brightness(args: dict) -> dict:
    """
    Sets screen brightness.
    args: { "level": 128 }  (0–255)
    """
    level = str(args.get("level", 128))
    return await _arun(["termux-brightness", level])


async def show_notification(args: dict) -> dict:
    """
    Shows a system notification.
    args: { "title": "...", "content": "..." }
    """
    title = args.get("title", "PhoneGent")
    content = args.get("content", "")
    return await _arun(["termux-notification", "--title", title, "--content", content])


async def set_clipboard(args: dict) -> dict:
    """
    Sets clipboard text.
    args: { "text": "..." }
    """
    text = args.get("text", "")
    return await _arun(["termux-clipboard-set", text])


async def get_clipboard(_: dict = {}) -> dict:
    """Returns the current clipboard content."""
    return await _arun(["termux-clipboard-get"])


# ──────────────────────────────────────────────────────────
# COMMUNICATION
# ──────────────────────────────────────────────────────────
async def read_sms(args: dict = {}) -> dict:
    """
    Reads recent SMS messages.
    args: { "limit": 10, "type": "inbox" | "sent" | "all" }
    """
    limit = str(args.get("limit", 10))
    box = args.get("type", "inbox")
    return await _arun(["termux-sms-list", "-l", limit, "-t", box])


async def send_sms(args: dict) -> dict:
    """
    Sends an SMS message.
    args: { "number": "+212...", "text": "..." }
    """
    number = args.get("number", "")
    text = args.get("text", "")
    if not number or not text:
        return {"error": "Both 'number' and 'text' are required"}
    return await _arun(["termux-sms-send", "-n", number, text])


async def get_call_log(args: dict = {}) -> dict:
    """
    Returns recent call history.
    args: { "limit": 10 }
    """
    limit = str(args.get("limit", 10))
    return await _arun(["termux-call-log", "-l", limit])


# ──────────────────────────────────────────────────────────
# BIOMETRICS
# ──────────────────────────────────────────────────────────
async def authenticate_fingerprint(args: dict = {}) -> dict:
    """
    Prompts for fingerprint authentication.
    args: { "title": "Confirm identity", "description": "..." }
    """
    title = args.get("title", "Authenticate")
    desc = args.get("description", "Please authenticate to continue")
    return await _arun(
        ["termux-fingerprint", "-t", title, "-d", desc], timeout=30
    )


# ──────────────────────────────────────────────────────────
# MEMORY TOOLS (backed by DB)
# ──────────────────────────────────────────────────────────
async def remember(args: dict) -> dict:
    """
    Saves a memory about the user.
    args: { "key": "...", "value": "...", "category": "preference|fact|reminder" }
    """
    from memory import set_memory
    key = args.get("key", "")
    value = args.get("value", "")
    category = args.get("category", "general")
    if not key or not value:
        return {"error": "Both 'key' and 'value' are required"}
    await set_memory(key, value, category)
    return {"status": "saved", "key": key}


async def recall(args: dict) -> dict:
    """
    Retrieves a memory by key.
    args: { "key": "..." }
    """
    from memory import get_memory
    key = args.get("key", "")
    value = await get_memory(key)
    if value is None:
        return {"found": False}
    return {"found": True, "key": key, "value": value}


async def forget(args: dict) -> dict:
    """
    Deletes a stored memory.
    args: { "key": "..." }
    """
    from memory import delete_memory
    await delete_memory(args.get("key", ""))
    return {"status": "deleted"}


# ──────────────────────────────────────────────────────────
# TOOL REGISTRY
# Each entry becomes an Ollama tool schema automatically.
# ──────────────────────────────────────────────────────────
TOOL_REGISTRY: dict[str, dict] = {
    # ── System ──
    "get_battery_status": {
        "fn": get_battery_status,
        "description": "Returns battery percentage, temperature, health, and charging status of the phone.",
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
    "get_device_info": {
        "fn": get_device_info,
        "description": "Returns device model, manufacturer, and system information.",
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
    # ── Location ──
    "get_location": {
        "fn": get_location,
        "description": "Returns the device's GPS location (latitude, longitude, altitude, accuracy).",
        "parameters": {
            "type": "object",
            "properties": {
                "provider": {
                    "type": "string",
                    "enum": ["gps", "network", "passive"],
                    "description": "Location provider. Default: gps",
                }
            },
            "required": [],
        },
    },
    # ── Sensors ──
    "get_sensor_data": {
        "fn": get_sensor_data,
        "description": "Returns readings from device motion sensors (accelerometer, gyroscope, magnetometer).",
        "parameters": {
            "type": "object",
            "properties": {
                "sensor": {
                    "type": "string",
                    "description": "Sensor name or 'all' for all sensors.",
                }
            },
            "required": [],
        },
    },
    "get_step_count": {
        "fn": get_step_count,
        "description": "Returns step count from the pedometer since last boot.",
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
    # ── Camera ──
    "take_photo": {
        "fn": take_photo,
        "description": "Captures a photo with the device camera. Returns base64 image for vision analysis.",
        "parameters": {
            "type": "object",
            "properties": {
                "camera": {
                    "type": "string",
                    "enum": ["0", "1"],
                    "description": "Camera ID: 0=back, 1=front.",
                }
            },
            "required": [],
        },
    },
    # ── Audio / Speech ──
    "record_audio": {
        "fn": record_audio,
        "description": "Records audio from the microphone for a specified duration.",
        "parameters": {
            "type": "object",
            "properties": {
                "duration": {
                    "type": "integer",
                    "description": "Recording duration in seconds. Default: 5",
                }
            },
            "required": [],
        },
    },
    "speech_to_text": {
        "fn": speech_to_text,
        "description": "Listens via microphone and transcribes speech to text.",
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
    "speak_text": {
        "fn": speak_text,
        "description": "Reads text aloud using the phone's text-to-speech engine.",
        "parameters": {
            "type": "object",
            "properties": {
                "text": {"type": "string", "description": "Text to speak."},
                "lang": {"type": "string", "description": "BCP-47 language code. Default: en"},
            },
            "required": ["text"],
        },
    },
    # ── Phone control ──
    "vibrate_phone": {
        "fn": vibrate_phone,
        "description": "Vibrates the phone for the given duration in milliseconds.",
        "parameters": {
            "type": "object",
            "properties": {
                "duration": {"type": "integer", "description": "Duration in ms. Default: 300"},
                "force": {"type": "boolean", "description": "Force vibration even in silent mode."},
            },
            "required": [],
        },
    },
    "toggle_flashlight": {
        "fn": toggle_flashlight,
        "description": "Turns the camera flashlight on or off.",
        "parameters": {
            "type": "object",
            "properties": {
                "on": {"type": "boolean", "description": "True to turn on, false to turn off."}
            },
            "required": ["on"],
        },
    },
    "set_brightness": {
        "fn": set_brightness,
        "description": "Sets the screen brightness (0–255).",
        "parameters": {
            "type": "object",
            "properties": {
                "level": {"type": "integer", "description": "Brightness level (0–255)."}
            },
            "required": ["level"],
        },
    },
    "show_notification": {
        "fn": show_notification,
        "description": "Displays a system notification on the phone.",
        "parameters": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "content": {"type": "string"},
            },
            "required": ["title", "content"],
        },
    },
    "set_clipboard": {
        "fn": set_clipboard,
        "description": "Sets the device clipboard text.",
        "parameters": {
            "type": "object",
            "properties": {"text": {"type": "string"}},
            "required": ["text"],
        },
    },
    "get_clipboard": {
        "fn": get_clipboard,
        "description": "Returns the current clipboard content.",
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
    # ── Communication ──
    "read_sms": {
        "fn": read_sms,
        "description": "Reads recent SMS messages from inbox or sent box.",
        "parameters": {
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "description": "Number of messages. Default: 10"},
                "type": {"type": "string", "enum": ["inbox", "sent", "all"]},
            },
            "required": [],
        },
    },
    "send_sms": {
        "fn": send_sms,
        "description": "Sends an SMS message. REQUIRES user confirmation before calling.",
        "parameters": {
            "type": "object",
            "properties": {
                "number": {"type": "string", "description": "Recipient phone number."},
                "text": {"type": "string", "description": "SMS body."},
            },
            "required": ["number", "text"],
        },
    },
    "get_call_log": {
        "fn": get_call_log,
        "description": "Returns recent call history.",
        "parameters": {
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "description": "Number of entries. Default: 10"},
            },
            "required": [],
        },
    },
    # ── Biometrics ──
    "authenticate_fingerprint": {
        "fn": authenticate_fingerprint,
        "description": "Prompts the user to authenticate via fingerprint. Use before sensitive actions.",
        "parameters": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "description": {"type": "string"},
            },
            "required": [],
        },
    },
    # ── Memory ──
    "remember": {
        "fn": remember,
        "description": "Saves a fact or preference about the user for future conversations.",
        "parameters": {
            "type": "object",
            "properties": {
                "key": {"type": "string", "description": "Short identifier, e.g. 'preferred_language'"},
                "value": {"type": "string"},
                "category": {
                    "type": "string",
                    "enum": ["preference", "fact", "reminder", "general"],
                },
            },
            "required": ["key", "value"],
        },
    },
    "recall": {
        "fn": recall,
        "description": "Retrieves a stored memory by key.",
        "parameters": {
            "type": "object",
            "properties": {"key": {"type": "string"}},
            "required": ["key"],
        },
    },
    "forget": {
        "fn": forget,
        "description": "Deletes a stored memory by key.",
        "parameters": {
            "type": "object",
            "properties": {"key": {"type": "string"}},
            "required": ["key"],
        },
    },
}


def get_ollama_tools() -> list[dict]:
    """Convert registry to Ollama tool-calling format."""
    tools = []
    for name, meta in TOOL_REGISTRY.items():
        tools.append(
            {
                "type": "function",
                "function": {
                    "name": name,
                    "description": meta["description"],
                    "parameters": meta["parameters"],
                },
            }
        )
    return tools


async def call_tool(name: str, args: dict) -> Any:
    """Dispatch a tool call by name."""
    entry = TOOL_REGISTRY.get(name)
    if not entry:
        return {"error": f"Unknown tool: {name}"}
    start = time.time()
    result = await entry["fn"](args)
    duration_ms = int((time.time() - start) * 1000)
    logger.info(f"Tool {name}({args}) → {result} [{duration_ms}ms]")
    return result, duration_ms
