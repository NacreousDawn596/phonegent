"""
main.py — FastAPI server: WebSocket chat + REST API
"""
from __future__ import annotations

import json
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from loguru import logger

from config import settings
from routes.stt import router as stt_router
from memory import (
    init_db,
    create_conversation,
    list_conversations,
    get_messages,
    delete_conversation,
    list_memories,
    set_memory,
    delete_memory,
)
from agent import run_agent

MEDIA_DIR = Path(settings.MEDIA_DIR)
MEDIA_DIR.mkdir(parents=True, exist_ok=True)


# ──────────────────────────────────────────────
# App lifecycle
# ──────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    logger.info(f"PhoneGent backend running on {settings.HOST}:{settings.PORT}")
    yield


app = FastAPI(title="PhoneGent", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origin="./*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve captured media
app.mount("/media", StaticFiles(directory=str(MEDIA_DIR)), name="media")
app.include_router(stt_router)


# ──────────────────────────────────────────────
# WebSocket — main chat endpoint
# ──────────────────────────────────────────────
@app.websocket("/ws/chat/{conv_id}")
async def websocket_chat(websocket: WebSocket, conv_id: int):
    await websocket.accept()
    logger.info(f"WebSocket connected: conv {conv_id}")

    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            user_message = payload.get("message", "").strip()

            if not user_message:
                continue

            # Stream agent events to frontend
            async for event in run_agent(conv_id, user_message):
                await websocket.send_text(json.dumps(event))

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: conv {conv_id}")
    except Exception as e:
        logger.exception(f"WebSocket error: {e}")
        try:
            await websocket.send_text(json.dumps({"type": "error", "message": str(e)}))
        except Exception:
            pass


# ──────────────────────────────────────────────
# REST — Conversations
# ──────────────────────────────────────────────
class NewConvRequest(BaseModel):
    title: str = "New conversation"


@app.post("/api/conversations")
async def new_conversation(req: NewConvRequest):
    conv_id = await create_conversation(req.title)
    return {"id": conv_id, "title": req.title}


@app.get("/api/conversations")
async def get_conversations():
    convs = await list_conversations()
    return convs


@app.get("/api/conversations/{conv_id}/messages")
async def get_conv_messages(conv_id: int):
    msgs = await get_messages(conv_id)
    return msgs


@app.delete("/api/conversations/{conv_id}")
async def delete_conv(conv_id: int):
    await delete_conversation(conv_id)
    return {"status": "deleted"}


# ──────────────────────────────────────────────
# REST — Memory
# ──────────────────────────────────────────────
class MemoryRequest(BaseModel):
    key: str
    value: str
    category: str = "general"


@app.get("/api/memories")
async def get_all_memories(category: str | None = None):
    return await list_memories(category)


@app.post("/api/memories")
async def upsert_memory(req: MemoryRequest):
    await set_memory(req.key, req.value, req.category)
    return {"status": "saved"}


@app.delete("/api/memories/{key}")
async def remove_memory(key: str):
    await delete_memory(key)
    return {"status": "deleted"}


# ──────────────────────────────────────────────
# Health
# ──────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "model": settings.OLLAMA_MODEL}


# ──────────────────────────────────────────────
# Entry point
# ──────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=False,
        log_level="info",
    )
