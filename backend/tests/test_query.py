import pytest

from app.routers.query import sse


def test_query_requires_authentication(client):
    response = client.post("/query/stream", json={"question": "hello"})

    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"


def test_query_results_requires_authentication(client):
    assert client.post("/query/results", json={"question": "hi"}).status_code == 401


def test_top_k_is_bounded(client, register):
    response = client.post(
        "/query/stream",
        json={"question": "hello", "top_k": 10_000},
        headers=register(),
    )

    assert response.status_code == 422


def test_an_empty_question_is_rejected(client, register):
    response = client.post(
        "/query/results", json={"question": ""}, headers=register()
    )

    assert response.status_code == 422


def test_categories_start_empty_for_a_new_user(client, register):
    response = client.get("/query/categories", headers=register())

    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.parametrize(
    "payload, expected",
    [
        ({"question": "q", "categories": ["Health"]}, ["Health"]),
        # The original field name stays accepted for existing API callers.
        ({"question": "q", "crisis_types": ["Health"]}, ["Health"]),
        ({"question": "q"}, None),
    ],
)
def test_category_filter_accepts_both_field_names(payload, expected):
    from app.models.query import QueryRequest

    assert QueryRequest(**payload).categories == expected


def test_sse_prefixes_every_line_of_a_multiline_payload():
    # A bare newline would be read as an unlabelled field, and a blank line
    # would end the event early and truncate the rest of the answer.
    framed = sse("message", "first\n\nsecond")

    assert framed == "event: message\ndata: first\ndata: \ndata: second\n\n"


def test_sse_round_trips_through_the_client_parser():
    """Mirrors how the browser reassembles an event, so framing stays honest."""
    payload = "Paragraph one.\n\nParagraph two."
    raw = sse("message", payload).removesuffix("\n\n")

    data = "\n".join(
        line.removeprefix("data:").removeprefix(" ")
        for line in raw.split("\n")
        if line.startswith("data:")
    )

    assert data == payload
