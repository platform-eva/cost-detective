from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_seeded_snapshots_are_available() -> None:
    response = client.get("/api/snapshots")

    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 3
    assert [snapshot["finding_count"] for snapshot in data["snapshots"]] == [3, 5, 8]
