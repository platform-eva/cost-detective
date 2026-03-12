from __future__ import annotations

import os
import time
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from . import k8s
from .rules import check_hpa_conditions, check_missing_requests

app = FastAPI(title="Cost Detective API", version="0.1.0")

NAMESPACE = os.getenv("NAMESPACE", "cost-detective")
BURNER_DEPLOY = os.getenv("BURNER_DEPLOY", "cd-burner")
LOADJOB_NAME = os.getenv("LOADJOB_NAME", "cd-loadgen")


class StartLoadReq(BaseModel):
    qps: int = 30
    workers: int = 2
    duration_seconds: int = 0  # 0 = run until deleted


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/api/findings")
def findings() -> Dict[str, Any]:
    k8s.load_kube()

    apps_api = k8s.apps()
    as_api = k8s.autoscaling()

    # MVP: scan only our namespace (sicher & schnell)
    dep_items = apps_api.list_namespaced_deployment(NAMESPACE).items
    hpa_items = as_api.list_namespaced_horizontal_pod_autoscaler(NAMESPACE).items

    deps = [d.to_dict() for d in dep_items]
    hpas = [h.to_dict() for h in hpa_items]

    out: List[Dict[str, Any]] = []
    for d in deps:
        out.extend(check_missing_requests(d))
    for h in hpas:
        out.extend(check_hpa_conditions(h))

    return {
        "namespace": NAMESPACE,
        "timestamp": int(time.time()),
        "count": len(out),
        "findings": out,
    }


@app.get("/api/status")
def status() -> Dict[str, Any]:
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


def _build_load_job(qps: int, workers: int, duration_seconds: int) -> Dict[str, Any]:
    # curl loop gegen burner service
    # Busywork passiert im Burner pro Request -> CPU geht hoch -> HPA skaliert
    url = f"http://cd-burner.{NAMESPACE}.svc.cluster.local:8080/work?ms=120"
    if duration_seconds > 0:
        loop = f"end=$((SECONDS+{duration_seconds})); while [ $SECONDS -lt $end ]; do "
    else:
        loop = "while true; do "

    # Parallelisierung über xargs -P (workers)
    cmd = (
        "sh -lc '"
        + loop
        + f"seq 1 {qps} | xargs -P {workers} -I{{}} curl -s --max-time 2 \"{url}\" >/dev/null || true; "
        + "sleep 1; "
        + "done'"
    )

    return {
        "apiVersion": "batch/v1",
        "kind": "Job",
        "metadata": {"name": LOADJOB_NAME, "namespace": NAMESPACE},
        "spec": {
            "backoffLimit": 0,
            "template": {
                "metadata": {"labels": {"app": "cd-loadgen"}},
                "spec": {
                    "restartPolicy": "Never",
                    "containers": [
                        {
                            "name": "loadgen",
                            "image": "curlimages/curl:8.9.1",
                            "command": ["sh", "-lc", cmd],
                        }
                    ],
                },
            },
        },
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
