from __future__ import annotations

import logging
from typing import List

from app.services.vectorstore import VectorStore

logger = logging.getLogger(__name__)

RRF_K = 60
CANDIDATE_MULTIPLIER = 5
MIN_CANDIDATES = 15


def hybrid_search(
    vectorstore: VectorStore,
    question: str,
    question_embedding: List[float],
    top_k: int,
    where: dict | None = None,
) -> List[dict]:
    """
    Combines dense (embedding) and sparse (BM25 keyword) retrieval via
    reciprocal rank fusion, so exact-match terms dense search alone tends
    to miss (IDs, acronyms, rare proper nouns) still surface.
    """
    candidate_k = max(top_k * CANDIDATE_MULTIPLIER, MIN_CANDIDATES)

    dense_matches = vectorstore.query(
        question_embedding,
        n_results=candidate_k,
        where=where,
    )
    sparse_matches = vectorstore.keyword_query(
        question,
        n_results=candidate_k,
        where=where,
    )

    logger.info(
        "Hybrid retrieval — dense: %s, sparse: %s",
        len(dense_matches),
        len(sparse_matches),
    )

    fused = _reciprocal_rank_fusion([dense_matches, sparse_matches])

    return fused[:top_k]


def _reciprocal_rank_fusion(
    ranked_lists: List[List[dict]],
    k: int = RRF_K,
) -> List[dict]:
    rrf_scores: dict[str, float] = {}
    merged: dict[str, dict] = {}

    for ranked in ranked_lists:
        for rank, item in enumerate(ranked, start=1):
            item_id = item["id"]
            rrf_scores[item_id] = rrf_scores.get(item_id, 0.0) + 1 / (k + rank)

            if item_id not in merged:
                merged[item_id] = dict(item)
            else:
                merged[item_id]["score"] = max(merged[item_id]["score"], item["score"])

    return sorted(
        merged.values(),
        key=lambda item: rrf_scores[item["id"]],
        reverse=True,
    )
