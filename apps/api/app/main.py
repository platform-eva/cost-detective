from __future__ import annotations

import os
import time
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from . import k8s
from .rules import check_hpa_conditions, check_missing_requests
from sqlalchemy import create_engine, text

app = FastAPI(title="Cost Detective API", version="0.1.0")

@app.on_event("startup")
def startup() -> None:
    init_db()

NAMESPACE = os.getenv("NAMESPACE", "cost-detective")
BURNER_DEPLOY = os.getenv("BURNER_DEPLOY", "cd-burner")
LOADJOB_NAME = os.getenv("LOADJOB_NAME", "cd-loadgen")
DATA_MODE = os.getenv("DATA_MODE", "kubernetes")
DATABASE_URL = os.getenv("DATABASE_URL", "")

def db_engine():
    if not DATABASE_URL:
        return None
    return create_engine(DATABASE_URL)


def init_db() -> None:
    engine = db_engine()
    if engine is None:
        return

    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS analysis_snapshots (
                id SERIAL PRIMARY KEY,
                namespace TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                finding_count INTEGER NOT NULL
            )
        """))


def save_snapshot(namespace: str, timestamp: int, finding_count: int) -> None:
    engine = db_engine()
    if engine is None:
        return

    with engine.begin() as conn:
        conn.execute(
            text("""
                INSERT INTO analysis_snapshots (namespace, created_at, finding_count)
                VALUES (:namespace, :created_at, :finding_count)
            """),
            {
                "namespace": namespace,
                "created_at": timestamp,
                "finding_count": finding_count,
            },
        )

class StartLoadReq(BaseModel):
    qps: int = 30
    workers: int = 2
    duration_seconds: int = 0  # 0 = run until deleted
def mock_findings() -> Dict[str, Any]:
    return {
        "namespace": NAMESPACE,
        "timestamp": int(time.time()),
        "count": 5,
        "findings": [
            {
                "workload": "cd-api",
                "severity": "medium",
                "message": "Missing CPU request",
                "recommendation": "Set an initial CPU request around 10m.",
            },
            {
                "workload": "cd-api",
                "severity": "medium",
                "message": "Missing memory request",
                "recommendation": "Set an initial memory request.",
            },
            {
                "workload": "cd-web",
                "severity": "medium",
                "message": "Missing CPU request",
                "recommendation": "Set an initial CPU request around 10m.",
            },
            {
                "workload": "cd-burner",
                "severity": "high",
                "message": "CPU request appears highly overprovisioned",
                "recommendation": "Reduce CPU request from 100m to 10m.",
            },
            {
                "workload": "cd-burner",
                "severity": "low",
                "message": "HPA is active",
                "recommendation": "Monitor scaling behavior under load.",
            },
        ],
    }


def mock_status() -> Dict[str, Any]:
    return {
        "namespace": NAMESPACE,
        "burnerDeployment": {
            "name": BURNER_DEPLOY,
            "replicas": 4,
            "readyReplicas": 4,
        },
        "hpa": {
            "metadata": {"name": "cd-burner-hpa"},
            "spec": {
                "min_replicas": 1,
                "max_replicas": 5,
                "scale_target_ref": {
                    "name": BURNER_DEPLOY,
                },
            },
            "status": {
                "current_replicas": 4,
                "desired_replicas": 4,
                "current_metrics": [
                    {
                        "resource": {
                            "name": "cpu",
                            "current": {
                                "average_utilization": 177,
                            },
                        },
                    }
                ],
            },
        },
    }

@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}

@app.get("/api/db/health")
def db_health() -> Dict[str, Any]:
    if not DATABASE_URL:
        return {"status": "disabled", "message": "DATABASE_URL not configured"}

    engine = create_engine(DATABASE_URL)

    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1")).scalar()

    return {
        "status": "ok",
        "database": "connected",
        "result": result,
    }


@app.get("/api/findings")
def findings() -> Dict[str, Any]:
    if DATA_MODE == "mock":
        data = mock_findings()

        save_snapshot(
            namespace=data["namespace"],
            timestamp=data["timestamp"],
            finding_count=data["count"],
        )

        return data

    # ----- Kubernetes Teil -----

    k8s.load_kube()

    apps_api = k8s.apps()
    as_api = k8s.autoscaling()

    dep_items = apps_api.list_namespaced_deployment(NAMESPACE).items
    hpa_items = as_api.list_namespaced_horizontal_pod_autoscaler(NAMESPACE).items

    deps = [d.to_dict() for d in dep_items]
    hpas = [h.to_dict() for h in hpa_items]

    out: List[Dict[str, Any]] = []
    for d in deps:
        out.extend(check_missing_requests(d))
    for h in hpas:
        out.extend(check_hpa_conditions(h))

    # 👉 HIER ist „am Ende“
    result = {
        "namespace": NAMESPACE,
        "timestamp": int(time.time()),
        "count": len(out),
        "findings": out,
    }

    # 👉 HIER speichern wir in DB
    save_snapshot(
        namespace=result["namespace"],
        timestamp=result["timestamp"],
        finding_count=result["count"],
    )

    return result

@app.get("/api/snapshots")
def snapshots() -> Dict[str, Any]:
    engine = db_engine()
    if engine is None:
        return {"snapshots": []}

    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT id, namespace, created_at, finding_count
            FROM analysis_snapshots
            ORDER BY id DESC
            LIMIT 20
        """)).mappings().all()

    return {
        "count": len(rows),
        "snapshots": [dict(row) for row in rows],
    }

@app.get("/api/status")
def status() -> Dict[str, Any]:
    if DATA_MODE == "mock":
        return mock_status()

    k8s.load_kube()
    apps_api = k8s.apps()
    as_api = k8s.autoscaling()

    dep = apps_api.read_namespaced_deployment(BURNER_DEPLOY, NAMESPACE).to_dict()
    hpas = as_api.list_namespaced_horizontal_pod_autoscaler(NAMESPACE).items
    hpa = None

    for h in hpas:
        ref = h.spec.scale_target_ref
        if ref and ref.name == BURNER_DEPLOY:
            hpa = h.to_dict()
            break

    return {
        "namespace": NAMESPACE,
        "burnerDeployment": {
            "name": dep["metadata"]["name"],
            "replicas": dep.get("status", {}).get("replicas", 0),
            "readyReplicas": dep.get("status", {}).get("ready_replicas", 0),
        },
        "hpa": hpa,
    }

@app.post("/api/load/start")
def start_load(req: StartLoadReq) -> Dict[str, Any]:
    k8s.load_kube()
    b = k8s.batch()

    # falls existiert: konfliktfrei ersetzen
    try:
        b.delete_namespaced_job(
            name=LOADJOB_NAME,
            namespace=NAMESPACE,
            propagation_policy="Background",
        )
    except Exception:
        pass

    job = _build_load_job(req.qps, req.workers, req.duration_seconds)
    created = b.create_namespaced_job(NAMESPACE, job)
    return {"started": True, "job": created.metadata.name, "namespace": NAMESPACE}


@app.post("/api/load/stop")
def stop_load() -> Dict[str, Any]:
    k8s.load_kube()
    b = k8s.batch()
    try:
        b.delete_namespaced_job(
            name=LOADJOB_NAME,
            namespace=NAMESPACE,
            propagation_policy="Background",
        )
        return {"stopped": True}
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"load job not found: {e}")


# ----- Burner (Demo Target) -----

@app.get("/work")
def work(ms: int = 120) -> Dict[str, Any]:
    # CPU busy loop für ms Millisekunden
    end = time.perf_counter() + (ms / 1000.0)
    x = 0
    while time.perf_counter() < end:
        x = (x * 1664525 + 1013904223) & 0xFFFFFFFF
    return {"ok": True, "ms": ms, "x": x}
