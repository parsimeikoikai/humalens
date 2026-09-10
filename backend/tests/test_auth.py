def test_register_returns_a_usable_token(client):
    response = client.post(
        "/auth/register",
        json={
            "email": "Ada@Example.com",
            "password": "a-long-enough-password",
            "full_name": "Ada",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "ada@example.com"

    me = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {body['access_token']}"},
    )
    assert me.status_code == 200
    assert me.json()["email"] == "ada@example.com"


def test_register_rejects_a_short_password(client):
    response = client.post(
        "/auth/register",
        json={"email": "short@example.com", "password": "abc", "full_name": "S"},
    )

    assert response.status_code == 422


def test_register_rejects_a_duplicate_email(client):
    payload = {
        "email": "dup@example.com",
        "password": "a-long-enough-password",
        "full_name": "Dup",
    }

    assert client.post("/auth/register", json=payload).status_code == 201
    assert client.post("/auth/register", json=payload).status_code == 409


def test_login_rejects_a_wrong_password(client):
    client.post(
        "/auth/register",
        json={
            "email": "login@example.com",
            "password": "a-long-enough-password",
            "full_name": "L",
        },
    )

    response = client.post(
        "/auth/login",
        json={"email": "login@example.com", "password": "not-the-password"},
    )

    assert response.status_code == 401


def test_login_rejects_an_unknown_email(client):
    response = client.post(
        "/auth/login",
        json={"email": "nobody@example.com", "password": "a-long-enough-password"},
    )

    assert response.status_code == 401


def test_me_rejects_a_forged_token(client):
    response = client.get("/auth/me", headers={"Authorization": "Bearer nonsense"})

    assert response.status_code == 401
