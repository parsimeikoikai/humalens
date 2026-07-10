import logging
import os

from openai import AsyncOpenAI

from app.services.llm.base import BaseLLMProvider

logger = logging.getLogger(__name__)


class OpenRouterProvider(BaseLLMProvider):
    def __init__(self):
        self.model = os.getenv(
            "LLM_MODEL",
            "gpt-4o-mini",
        )

        self.base_url = os.getenv(
            "LLM_BASE_URL",
            "https://openrouter.ai/api/v1",
        )

        self.api_key = os.getenv("LLM_API_KEY")

        self.client = AsyncOpenAI(
            api_key=self.api_key,
            base_url=self.base_url,
        )

        logger.info(
            "Initialized OpenRouter provider with model %s",
            self.model,
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