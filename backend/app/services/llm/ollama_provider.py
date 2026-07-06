from openai import AsyncOpenAI


class OllamaProvider:
    def __init__(
        self,
        base_url: str = "http://localhost:11434/v1",
        model: str = "qwen3:8b",
    ):
        self.model = model

        # Ollama exposes an OpenAI-compatible API
        self.client = AsyncOpenAI(
            api_key="ollama",  # Required by the SDK but ignored by Ollama
            base_url=base_url,
        )

    async def stream_chat(
        self,
        messages: list[dict],
        temperature: float = 0,
        max_tokens: int = 512,
    ):
        """
        Returns the streaming response from Ollama.
        """

        return await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )