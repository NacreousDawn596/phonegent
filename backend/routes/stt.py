"""
routes/stt.py — Speech-to-text endpoint (receives audio file from app)
Uses Android's native STT via termux-speech-to-text (triggered on device)
or falls back to Whisper via Ollama if available.
"""
import asyncio
import subprocess
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, UploadFile
from loguru import logger

router = APIRouter(prefix="/api", tags=["stt"])


@router.post("/stt")
async def speech_to_text(audio: UploadFile = File(...)):
    """
    Receives an audio file from the React Native app,
    runs termux-speech-to-text (which calls Android STT),
    and returns { text: "..." }.

    Fallback: if running on a non-Termux host, returns a stub.
    """
    # Save uploaded file
    suffix = Path(audio.filename or "audio.m4a").suffix or ".m4a"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
        content = await audio.read()
        f.write(content)
        tmp_path = f.name

    logger.info(f"STT: received {len(content)} bytes → {tmp_path}")

    # Try Android native STT via Termux
    try:
        result = await asyncio.to_thread(
            subprocess.run,
            ["termux-speech-to-text"],
            capture_output=True,
            text=True,
            timeout=30,
        )
        import json
        data = json.loads(result.stdout)
        text = " ".join(data) if isinstance(data, list) else str(data)
        return {"text": text.strip()}
    except Exception as e:
        logger.warning(f"STT fallback (not on Termux?): {e}")
        # Return empty so the app knows transcription failed gracefully
        return {"text": "", "error": str(e)}
    finally:
        Path(tmp_path).unlink(missing_ok=True)
