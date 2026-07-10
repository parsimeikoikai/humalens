import os

from openai import AsyncOpenAI

from app.services.llm.base import BaseLLMProvider


class OllamaProvider(BaseLLMProvider):
    def __init__(self):
        self.model = os.getenv(
            "OLLAMA_MODEL",
            "qwen3:8b",
        )
        base_url = os.getenv(

        "OLLAMA_BASE_URL",
        "http://host.docker.internal:11434/v1",

        )
        print("=" * 60)

        print("OLLAMA BASE URL:", base_url)

        print("OLLAMA MODEL:", self.model)

        print("=" * 60)

        self.client = AsyncOpenAI(
            api_key="ollama",
            base_url=os.getenv(
                "OLLAMA_BASE_URL",
                "http://localhost:11434/v1",
            ),
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