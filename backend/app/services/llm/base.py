from abc import ABC, abstractmethod


class BaseLLMProvider(ABC):
    """
   Common interface for all LLM providers.
    """

    @abstractmethod
    async def stream_chat(
        self,
        messages: list[dict],
        temperature: float = 0,
        max_tokens: int = 512,
    ):
        pass

    @abstractmethod
    async def chat(
        self,
        messages: list[dict],
        temperature: float = 0,
        max_tokens: int = 512,
    ):
        """
        Non-streaming completion.
        """
        pass