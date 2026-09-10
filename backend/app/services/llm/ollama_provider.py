import logging
import os

from openai import AsyncOpenAI

from app.services.llm.base import BaseLLMProvider

logger = logging.getLogger(__name__)


class OllamaProvider(BaseLLMProvider):
    def __init__(self):
        self.model = os.getenv(
            "OLLAMA_MODEL",
            "qwen3:8b",
        )
        # Read once. This used to be read twice with two different
        # fallbacks, so the URL that got logged was not necessarily the one
        # the client connected to.
        self.base_url = os.getenv(
            "OLLAMA_BASE_URL",
            "http://localhost:11434/v1",
        )

        self.client = AsyncOpenAI(
            api_key="ollama",
            base_url=self.base_url,
        )

        logger.info(
            "Initialized Ollama provider with model %s at %s",
            self.model,
            self.base_url,
        )

    async def stream_chat(
        self,
        messages: list[dict],
        temperature: float = 0,
        max_tokens: int = 512,
    ):
        return await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )

    async def chat(
        self,
        messages: list[dict],
        temperature: float = 0,
        max_tokens: int = 512,
    ):
        return await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=False,
        )