"""Tenant isolation: a user must never reach another user's data."""


def test_create_and_list(client, register):
    headers = register()

    created = client.post(
        "/knowledge-bases",
        json={"name": "Contracts", "description": "NDAs", "tags": ["Legal"]},
        headers=headers,
    )
    assert created.status_code == 201
    assert created.json()["name"] == "Contracts"
    assert created.json()["visibility"] == "private"

    listed = client.get("/knowledge-bases", headers=headers)
    assert [kb["name"] for kb in listed.json()] == ["Contracts"]


def test_knowledge_bases_require_authentication(client):
    assert client.get("/knowledge-bases").status_code == 401
    assert client.post("/knowledge-bases", json={"name": "x"}).status_code == 401


def test_another_user_cannot_see_or_touch_my_knowledge_base(client, register):
    mine = register()
    theirs = register()

    kb_id = client.post(
        "/knowledge-bases", json={"name": "Private"}, headers=mine
    ).json()["id"]

    assert client.get("/knowledge-bases", headers=theirs).json() == []
    assert client.get(f"/knowledge-bases/{kb_id}", headers=theirs).status_code == 404
    assert (
        client.patch(
            f"/knowledge-bases/{kb_id}", json={"name": "Stolen"}, headers=theirs
        ).status_code
        == 404
    )
    assert client.delete(f"/knowledge-bases/{kb_id}", headers=theirs).status_code == 404
    assert (
        client.get(f"/knowledge-bases/{kb_id}/documents", headers=theirs).status_code
        == 404
    )


def test_ingest_rejects_a_knowledge_base_owned_by_someone_else(client, register):
    mine = register()
    theirs = register()

    kb_id = client.post(
        "/knowledge-bases", json={"name": "Private"}, headers=mine
    ).json()["id"]

    response = client.post(
        f"/ingest/api?knowledge_base_id={kb_id}",
        json={"documents": [{"text": "secret", "source": "s", "page": 1}]},
        headers=theirs,
    )

    assert response.status_code == 404


def test_an_unknown_visibility_falls_back_to_private(client, register):
    response = client.post(
        "/knowledge-bases",
        json={"name": "Odd", "visibility": "everyone"},
        headers=register(),
    )

    assert response.json()["visibility"] == "private"
