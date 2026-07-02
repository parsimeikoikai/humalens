import logging
import os

from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

LLM_API_KEY = os.getenv("LLM_API_KEY")

LLM_BASE_URL = os.getenv(
    "LLM_BASE_URL",
    "https://api.openai.com/v1",
)

CHAT_MODEL = os.getenv(
    "LLM_MODEL",
    "gpt-4o-mini",
)



print("=" * 60)

print("LLM_API_KEY:", LLM_API_KEY[:10] + "..." if LLM_API_KEY else None)

print("LLM_BASE_URL:", LLM_BASE_URL)

print("CHAT_MODEL:", CHAT_MODEL)

print("=" * 60)



logger.info("LLM Base URL: %s", LLM_BASE_URL)
logger.info("LLM Model: %s", CHAT_MODEL)

if LLM_API_KEY:
    logger.info(
        "LLM API Key Prefix: %s...%s",
        LLM_API_KEY[:10],
        LLM_API_KEY[-4:],
    )
else:
    logger.warning("LLM_API_KEY is not set")

client = AsyncOpenAI(
    api_key=LLM_API_KEY,
    base_url=LLM_BASE_URL,
)