import os
import sys
import tempfile

# Use a throwaway SQLite database and a fixed secret before the app is imported.
_tmp = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite:///{os.path.join(_tmp, 'test.db')}"
os.environ["SECRET_KEY"] = "test-secret-key"
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from fastapi.testclient import TestClient  # noqa: E402

from main import app  # noqa: E402

client = TestClient(app)


def signup(email="user@example.com", password="password123"):
    return client.post("/auth/signup", json={"email": email, "password": password})


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


def test_health():
    assert client.get("/health").json() == {"status": "ok"}


def test_signup_login_and_me():
    res = signup("alice@example.com")
    assert res.status_code == 200
    assert res.json()["token_type"] == "bearer"

    res = client.post("/auth/login", data={"username": "alice@example.com", "password": "password123"})
    assert res.status_code == 200
    token = res.json()["access_token"]

    me = client.get("/auth/me", headers=auth_header(token))
    assert me.status_code == 200
    assert me.json()["email"] == "alice@example.com"


def test_signup_rejects_duplicates_case_insensitively():
    assert signup("bob@example.com").status_code == 200
    assert signup("BOB@example.com").status_code == 400


def test_signup_validation():
    assert signup("not-an-email").status_code == 422
    assert signup("short@example.com", "short").status_code == 422
    assert signup("long@example.com", "x" * 73).status_code == 422


def test_login_wrong_password():
    signup("carol@example.com")
    res = client.post("/auth/login", data={"username": "carol@example.com", "password": "wrong-password"})
    assert res.status_code == 401


def test_jobs_require_auth():
    assert client.get("/jobs").status_code == 401
    assert client.post("/jobs", json={"company": "A", "role": "B", "status": "Applied"}).status_code == 401
    assert client.get("/jobs", headers=auth_header("garbage")).status_code == 401


def test_job_crud_and_validation():
    token = signup("dave@example.com").json()["access_token"]
    headers = auth_header(token)

    created = client.post(
        "/jobs", json={"company": "  Acme  ", "role": "Engineer", "status": "Applied"}, headers=headers
    )
    assert created.status_code == 200
    job = created.json()["job"]
    assert job["company"] == "Acme"

    bad = client.post("/jobs", json={"company": "Acme", "role": "Eng", "status": "Nope"}, headers=headers)
    assert bad.status_code == 422
    blank = client.post("/jobs", json={"company": "   ", "role": "Eng", "status": "Applied"}, headers=headers)
    assert blank.status_code == 422

    updated = client.put(
        f"/jobs/{job['id']}",
        json={"company": "Acme", "role": "Engineer", "status": "Interview"},
        headers=headers,
    )
    assert updated.status_code == 200
    assert updated.json()["job"]["status"] == "Interview"

    listed = client.get("/jobs", headers=headers).json()
    assert [j["id"] for j in listed] == [job["id"]]

    assert client.delete(f"/jobs/{job['id']}", headers=headers).status_code == 200
    assert client.get("/jobs", headers=headers).json() == []
    assert client.delete(f"/jobs/{job['id']}", headers=headers).status_code == 404


def test_users_cannot_touch_each_others_jobs():
    a = auth_header(signup("erin@example.com").json()["access_token"])
    b = auth_header(signup("frank@example.com").json()["access_token"])

    job = client.post("/jobs", json={"company": "X", "role": "Y", "status": "Applied"}, headers=a).json()["job"]

    assert client.get("/jobs", headers=b).json() == []
    body = {"company": "X", "role": "Y", "status": "Offer"}
    assert client.put(f"/jobs/{job['id']}", json=body, headers=b).status_code == 404
    assert client.delete(f"/jobs/{job['id']}", headers=b).status_code == 404
