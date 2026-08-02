from __future__ import annotations

import logging

from app.services.llm.base import BaseLLMProvider

logger = logging.getLogger(__name__)

HYDE_SYSTEM_PROMPT = (
    "Write a short, plausible passage (2-4 sentences) that could appear in "
    "a document answering the given question. Be concrete and specific, "
    "using plausible facts, figures, or details even if you are unsure "
    "they are accurate. Do not mention that this is hypothetical, and do "
    "not add any caveats, disclaimers, or meta-commentary — write only the "
    "passage itself."
)

HYDE_MAX_TOKENS = 200


async def generate_hypothetical_document(
    llm_provider: BaseLLMProvider,
    question: str,
) -> str | None:
    """
    HyDE: generates a hypothetical answer passage for the question, so it
    can be embedded in place of the (often much shorter, differently
    phrased) raw question. Hypothetical answers tend to sit closer in
    embedding space to real document chunks than bare questions do.

    Returns None on any failure so the caller can fall back to embedding
    the raw question instead — HyDE is a retrieval enhancement, not a hard
    dependency.
    """
    try:
        response = await llm_provider.chat(
            messages=[
                {"role": "system", "content": HYDE_SYSTEM_PROMPT},
                {"role": "user", "content": question},
            ],
            temperature=0.3,
            max_tokens=HYDE_MAX_TOKENS,
        )

        passage = response.choices[0].message.content

        if not passage or not passage.strip():
            return None

        return passage.strip()

    except Exception:
        logger.exception("HyDE generation failed — falling back to raw question")
        return None
