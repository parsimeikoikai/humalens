"""The endpoints reachable without a token must not expose tenant data."""


def test_health_is_public(client):
    assert client.get("/health").status_code == 200


def test_stats_is_public_and_exposes_counts_only(client):
    response = client.get("/stats")

    assert response.status_code == 200
    assert set(response.json()) == {
        "users",
        "documents",
        "knowledge_bases",
        "chunks",
    }
    assert all(isinstance(value, int) for value in response.json().values())


def test_admin_overview_rejects_anonymous_callers(client):
    assert client.get("/admin/overview").status_code == 401


def test_admin_overview_rejects_ordinary_users(client, register):
    assert client.get("/admin/overview", headers=register()).status_code == 403


def test_admin_overview_allows_an_allowlisted_operator(client, register):
    headers = register(email="operator@humalens-ops.com")

    assert client.get("/admin/overview", headers=headers).status_code == 200
