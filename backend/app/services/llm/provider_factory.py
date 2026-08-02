import logging

import os
from functools import lru_cache

from app.services.llm.base import BaseLLMProvider
from app.services.llm.ollama_provider import OllamaProvider
from app.services.llm.openrouter_provider import OpenRouterProvider


LLM_PROVIDER = os.getenv(
    "LLM_PROVIDER",
    "openrouter",
).lower()


logger = logging.getLogger(__name__)

@lru_cache(maxsize=1)
def get_llm_provider() -> BaseLLMProvider:
    """
    Returns the configured LLM provider.
    """
    provider = os.getenv("LLM_PROVIDER", "openrouter").lower()

    logger.info("Using LLM provider: %s", provider)
    providers = {
        "openrouter": OpenRouterProvider,
        "ollama": OllamaProvider,
    }

    provider_class = providers.get(LLM_PROVIDER)

    if provider_class is None:
        raise ValueError(
            f"Unsupported LLM provider: '{LLM_PROVIDER}'"
        )

    return provider_class()