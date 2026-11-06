from __future__ import annotations

import json
import logging
import re
from typing import Any

from openai import OpenAI

from backend.app.config import Settings

logger = logging.getLogger(__name__)


class LLMService:
    """Thin Groq/OpenAI-compatible client with graceful, explicit fallback."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self._client: OpenAI | None = None
        if settings.groq_configured:
            self._client = OpenAI(
                api_key=settings.groq_effective_key,
                base_url=settings.groq_base_url,
                timeout=45.0,
                max_retries=0,
            )

    @property
    def available(self) -> bool:
        return self._client is not None

    def chat(
        self,
        system: str,
        user: str,
        *,
        max_tokens: int = 900,
        temperature: float = 0.2,
    ) -> tuple[str | None, str]:
        if self._client is None:
            return None, "unconfigured"
        models = [self.settings.groq_model]
        if "gpt-oss-20b" not in self.settings.groq_model:
            models.append("openai/gpt-oss-20b")
        last_error = "unknown"
        for model in models:
            try:
                response = self._client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                content = response.choices[0].message.content if response.choices else None
                if content:
                    return content.strip(), f"groq:{model}"
                last_error = "empty response"
            except Exception as exc:  # noqa: BLE001 - surface a safe summary only
                last_error = f"{type(exc).__name__}: {str(exc)[:240]}"
                logger.warning("Groq model %s failed: %s", model, last_error)
        return None, f"groq-error:{last_error[:120]}"

    def chat_json(
        self,
        system: str,
        user: str,
        *,
        max_tokens: int = 900,
    ) -> tuple[dict[str, Any] | None, str]:
        text, provider = self.chat(
            system + "\nReturn only valid JSON. Do not wrap it in Markdown.",
            user,
            max_tokens=max_tokens,
            temperature=0.1,
        )
        if not text:
            return None, provider
        return parse_json_object(text), provider


def parse_json_object(text: str) -> dict[str, Any] | None:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        value = json.loads(cleaned)
        return value if isinstance(value, dict) else None
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if not match:
            return None
        try:
            value = json.loads(match.group(0))
            return value if isinstance(value, dict) else None
        except json.JSONDecodeError:
            return None
