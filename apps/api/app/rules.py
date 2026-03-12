from __future__ import annotations

from typing import Any, Dict, List


def finding(
    id: str,
    severity: str,
    title: str,
    evidence: Dict[str, Any],
    fix: str,
) -> Dict[str, Any]:
    return {
        "id": id,
        "severity": severity,
        "title": title,
        "evidence": evidence,
        "fix": fix,
    }


def check_missing_requests(deploy: Dict[str, Any]) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    spec = deploy.get("spec", {})
    tpl = spec.get("template", {}).get("spec", {})
    containers = tpl.get("containers", [])
    for c in containers:
        name = c.get("name")
        res = c.get("resources", {}) or {}
        req = (res.get("requests") or {})
        if not req.get("cpu") or not req.get("memory"):
            out.append(
                finding(
                    id=f"missing-requests:{deploy.get('metadata', {}).get('name')}:{name}",
                    severity="HIGH",
                    title="Deployment Container ohne cpu/memory requests",
                    evidence={
                        "deployment": deploy.get("metadata", {}).get("name"),
                        "container": name,
                        "requests": req,
                    },
                    fix="Setze resources.requests.cpu und resources.requests.memory im Helm Chart (und optional limits).",
                )
            )
    return out


def check_hpa_conditions(hpa: Dict[str, Any]) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    conds = hpa.get("status", {}).get("conditions", []) or []
    bad = [c for c in conds if (c.get("status") == "False")]
    for c in bad:
        out.append(
            finding(
                id=f"hpa-condition:{hpa.get('metadata', {}).get('name')}:{c.get('type')}",
                severity="MEDIUM",
                title=f"HPA Condition False: {c.get('type')}",
                evidence={
                    "hpa": hpa.get("metadata", {}).get("name"),
                    "type": c.get("type"),
                    "reason": c.get("reason"),
                    "message": c.get("message"),
                },
                fix="Prüfe metrics-server + Pod requests + HPA target. 'kubectl describe hpa ...' hilft.",
            )
        )
    return out
