"""
agent.py — Core agent: sends messages to Ollama, handles tool calls,
           streams responses, integrates memory.
"""
from __future__ import annotations

import json
from typing import AsyncGenerator, Any

import httpx
from loguru import logger

from config import settings
from memory import (
    all_memories_as_string,
    get_messages,
    log_tool_call,
    save_message,
)
from tools import call_tool, get_ollama_tools

# ──────────────────────────────────────────────────────────
# System prompt
# ──────────────────────────────────────────────────────────
SYSTEM_PROMPT = """\
You are PhoneGent — a powerful, local AI agent running directly on the user's smartphone.

Your purpose is to assist through reasoning, memory, and real device control.

## CORE BEHAVIOR
- Be concise, calm, intelligent, slightly witty.
- Think before choosing a tool. Never call a tool unless clearly needed.
- When multiple tools are needed, call them in logical sequence.
- Explain what you did after each tool call in plain language.

## SENSITIVE ACTIONS
The following tools MUST NOT be called unless the user has explicitly confirmed:
- send_sms, read_sms, get_call_log → privacy-sensitive
- authenticate_fingerprint           → biometric data
- take_photo, record_audio           → media capture

Always ask for explicit confirmation before these.

## MEMORY
You have a persistent memory system. Use it:
- After learning something important about the user → call remember()
- When a recurring preference is mentioned → store it
- When a user asks "do you remember…" → call recall()

Current stored memories:
{memories}

## VISION
If the user asks you to describe what's in front of them, or to read text,
call take_photo() then analyze the returned base64 image.

## RESPONSE FORMAT
- Keep responses under 4 sentences for simple questions.
- Use markdown sparingly — the UI renders it.
- For tool results, summarize the relevant parts; don't dump raw JSON.

## PERSONALITY
You are calm, intelligent, helpful, and slightly witty.
You feel like a high-end personal assistant — think Jarvis, not a chatbot.
"""


def _build_system(memories: str) -> str:
    return SYSTEM_PROMPT.format(memories=memories or "None yet.")


# ──────────────────────────────────────────────────────────
# Ollama client helpers
# ──────────────────────────────────────────────────────────
async def _ollama_chat(messages: list[dict], stream: bool = True) -> Any:
    tools = get_ollama_tools()
    payload = {
        "model": settings.OLLAMA_MODEL,
        "messages": messages,
        "tools": tools,
        "stream": stream,
        "options": {"temperature": 0.7, "num_predict": 1024},
    }
    async with httpx.AsyncClient(timeout=settings.OLLAMA_TIMEOUT) as client:
        if stream:
            async with client.stream(
                "POST", f"{settings.OLLAMA_HOST}/api/chat", json=payload
            ) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if line:
                        yield json.loads(line)
        else:
            resp = await client.post(
                f"{settings.OLLAMA_HOST}/api/chat", json=payload
            )
            resp.raise_for_status()
            yield resp.json()


async def _ollama_vision(image_b64: str, prompt: str) -> str:
    """Send an image to the vision model and return description."""
    payload = {
        "model": settings.OLLAMA_VISION_MODEL,
        "messages": [
            {
                "role": "user",
                "content": prompt,
                "images": [image_b64],
            }
        ],
        "stream": False,
    }
    async with httpx.AsyncClient(timeout=settings.OLLAMA_TIMEOUT) as client:
        resp = await client.post(f"{settings.OLLAMA_HOST}/api/chat", json=payload)
        resp.raise_for_status()
        data = resp.json()
        return data["message"]["content"]


# ──────────────────────────────────────────────────────────
# Main agent loop
# ──────────────────────────────────────────────────────────
async def run_agent(
    conv_id: int,
    user_message: str,
) -> AsyncGenerator[dict, None]:
    """
    Full agent loop:
    1. Build message history
    2. Stream LLM response
    3. Handle tool calls recursively
    4. Yield SSE-style events: { type, content }

    Event types:
      text        — streaming token
      tool_start  — { name, args }
      tool_result — { name, result }
      done        — end of turn
      error       — { message }
    """
    # Persist user message
    await save_message(conv_id, "user", user_message)

    # Build context
    memories = await all_memories_as_string()
    system = _build_system(memories)

    # Load conversation history (last 20 messages)
    db_msgs = await get_messages(conv_id, limit=20)
    history: list[dict] = [{"role": "system", "content": system}]
    for m in db_msgs:
        if m["role"] in ("user", "assistant"):
            history.append({"role": m["role"], "content": m["content"]})

    full_response = ""
    tool_calls_pending: list[dict] = []

    try:
        async for chunk in _ollama_chat(history, stream=True):
            msg = chunk.get("message", {})
            content = msg.get("content", "")
            raw_tools = msg.get("tool_calls", [])

            # Stream text tokens
            if content:
                full_response += content
                yield {"type": "text", "content": content}

            # Collect tool calls
            if raw_tools:
                tool_calls_pending.extend(raw_tools)

            # Done streaming this response
            if chunk.get("done"):
                break

        # ── Execute tool calls if any ──
        while tool_calls_pending:
            tool_results_for_history = []

            for tc in tool_calls_pending:
                fn = tc.get("function", {})
                tool_name = fn.get("name", "")
                tool_args = fn.get("arguments", {})
                if isinstance(tool_args, str):
                    tool_args = json.loads(tool_args)

                yield {"type": "tool_start", "name": tool_name, "args": tool_args}

                # Special: vision after take_photo
                result, duration_ms = await call_tool(tool_name, tool_args)

                # If photo taken, run vision model on it
                if tool_name == "take_photo" and "base64" in result:
                    vision_prompt = "Describe this image in detail. What do you see?"
                    description = await _ollama_vision(result["base64"], vision_prompt)
                    result["vision_description"] = description

                await log_tool_call(conv_id, tool_name, tool_args, result, duration_ms)

                yield {"type": "tool_result", "name": tool_name, "result": result}
                await save_message(
                    conv_id,
                    "tool",
                    json.dumps(result),
                    tool_name=tool_name,
                    tool_result=json.dumps(result),
                )
                tool_results_for_history.append(
                    {"role": "tool", "content": json.dumps(result), "name": tool_name}
                )

            # Add assistant tool call message + results to history
            history.append(
                {
                    "role": "assistant",
                    "content": full_response or "",
                    "tool_calls": [
                        {
                            "function": {
                                "name": tc["function"]["name"],
                                "arguments": tc["function"].get("arguments", {}),
                            }
                        }
                        for tc in tool_calls_pending
                    ],
                }
            )
            history.extend(tool_results_for_history)
            tool_calls_pending = []
            full_response = ""

            # Re-run LLM with tool results
            async for chunk in _ollama_chat(history, stream=True):
                msg = chunk.get("message", {})
                content = msg.get("content", "")
                raw_tools = msg.get("tool_calls", [])

                if content:
                    full_response += content
                    yield {"type": "text", "content": content}

                if raw_tools:
                    tool_calls_pending.extend(raw_tools)

                if chunk.get("done"):
                    break

        # Persist final assistant message
        if full_response:
            await save_message(conv_id, "assistant", full_response)

        yield {"type": "done"}

    except Exception as e:
        logger.exception(f"Agent error in conv {conv_id}: {e}")
        yield {"type": "error", "message": str(e)}
