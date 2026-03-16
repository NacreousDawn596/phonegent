"""
memory.py — SQLite-backed memory and conversation history
"""
import aiosqlite
import json
import time
from pathlib import Path
from config import settings
from loguru import logger

DB = settings.DB_PATH

# ──────────────────────────────────────────────
# Schema
# ──────────────────────────────────────────────
SCHEMA = """
CREATE TABLE IF NOT EXISTS conversations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT,
    created_at  REAL NOT NULL,
    updated_at  REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    role            TEXT NOT NULL,         -- user | assistant | tool
    content         TEXT NOT NULL,
    tool_name       TEXT,
    tool_result     TEXT,
    created_at      REAL NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS memories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    key         TEXT NOT NULL UNIQUE,
    value       TEXT NOT NULL,
    category    TEXT DEFAULT 'general',    -- preference | fact | reminder
    created_at  REAL NOT NULL,
    updated_at  REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS tool_calls (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER,
    tool_name       TEXT NOT NULL,
    args            TEXT,                  -- JSON
    result          TEXT,                  -- JSON
    duration_ms     INTEGER,
    created_at      REAL NOT NULL
);
"""


async def init_db():
    async with aiosqlite.connect(DB) as db:
        await db.executescript(SCHEMA)
        await db.commit()
    logger.info(f"Database ready at {DB}")


# ──────────────────────────────────────────────
# Conversations
# ──────────────────────────────────────────────
async def create_conversation(title: str = "New conversation") -> int:
    now = time.time()
    async with aiosqlite.connect(DB) as db:
        cursor = await db.execute(
            "INSERT INTO conversations (title, created_at, updated_at) VALUES (?, ?, ?)",
            (title, now, now),
        )
        await db.commit()
        return cursor.lastrowid


async def list_conversations(limit: int = 50) -> list[dict]:
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM conversations ORDER BY updated_at DESC LIMIT ?", (limit,)
        ) as cur:
            rows = await cur.fetchall()
    return [dict(r) for r in rows]


async def delete_conversation(conv_id: int):
    async with aiosqlite.connect(DB) as db:
        await db.execute("DELETE FROM conversations WHERE id = ?", (conv_id,))
        await db.commit()


# ──────────────────────────────────────────────
# Messages
# ──────────────────────────────────────────────
async def save_message(
    conv_id: int,
    role: str,
    content: str,
    tool_name: str | None = None,
    tool_result: str | None = None,
) -> int:
    now = time.time()
    async with aiosqlite.connect(DB) as db:
        cursor = await db.execute(
            """INSERT INTO messages
               (conversation_id, role, content, tool_name, tool_result, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (conv_id, role, content, tool_name, tool_result, now),
        )
        await db.execute(
            "UPDATE conversations SET updated_at = ? WHERE id = ?", (now, conv_id)
        )
        await db.commit()
        return cursor.lastrowid


async def get_messages(conv_id: int, limit: int = 50) -> list[dict]:
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """SELECT * FROM messages WHERE conversation_id = ?
               ORDER BY created_at ASC LIMIT ?""",
            (conv_id, limit),
        ) as cur:
            rows = await cur.fetchall()
    return [dict(r) for r in rows]


# ──────────────────────────────────────────────
# Memories (key-value facts about the user)
# ──────────────────────────────────────────────
async def set_memory(key: str, value: str, category: str = "general"):
    now = time.time()
    async with aiosqlite.connect(DB) as db:
        await db.execute(
            """INSERT INTO memories (key, value, category, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?)
               ON CONFLICT(key) DO UPDATE
               SET value = excluded.value,
                   category = excluded.category,
                   updated_at = excluded.updated_at""",
            (key, value, category, now, now),
        )
        await db.commit()


async def get_memory(key: str) -> str | None:
    async with aiosqlite.connect(DB) as db:
        async with db.execute(
            "SELECT value FROM memories WHERE key = ?", (key,)
        ) as cur:
            row = await cur.fetchone()
    return row[0] if row else None


async def list_memories(category: str | None = None) -> list[dict]:
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        if category:
            async with db.execute(
                "SELECT * FROM memories WHERE category = ? ORDER BY updated_at DESC",
                (category,),
            ) as cur:
                rows = await cur.fetchall()
        else:
            async with db.execute(
                "SELECT * FROM memories ORDER BY updated_at DESC"
            ) as cur:
                rows = await cur.fetchall()
    return [dict(r) for r in rows]


async def delete_memory(key: str):
    async with aiosqlite.connect(DB) as db:
        await db.execute("DELETE FROM memories WHERE key = ?", (key,))
        await db.commit()


async def all_memories_as_string() -> str:
    mems = await list_memories()
    if not mems:
        return "No memories stored yet."
    lines = [f"- [{m['category']}] {m['key']}: {m['value']}" for m in mems]
    return "\n".join(lines)


# ──────────────────────────────────────────────
# Tool call log
# ──────────────────────────────────────────────
async def log_tool_call(
    conv_id: int | None,
    tool_name: str,
    args: dict,
    result: dict,
    duration_ms: int,
):
    async with aiosqlite.connect(DB) as db:
        await db.execute(
            """INSERT INTO tool_calls
               (conversation_id, tool_name, args, result, duration_ms, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (conv_id, tool_name, json.dumps(args), json.dumps(result), duration_ms, time.time()),
        )
        await db.commit()
