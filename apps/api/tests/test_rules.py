from app.rules import check_hpa_conditions, check_missing_requests


def test_missing_requests_creates_finding() -> None:
    deployment = {
        "metadata": {"name": "demo"},
        "spec": {
            "template": {
                "spec": {
                    "containers": [
                        {"name": "api", "resources": {"requests": {"cpu": "100m"}}}
                    ]
                }
            }
        },
    }

    findings = check_missing_requests(deployment)

    assert len(findings) == 1
    assert findings[0]["id"] == "missing-requests:demo:api"


def test_false_hpa_condition_creates_finding() -> None:
    hpa = {
        "metadata": {"name": "demo-hpa"},
        "status": {
            "conditions": [
                {
                    "status": "False",
                    "type": "ScalingActive",
                    "reason": "FailedGetResourceMetric",
                }
            ]
        },
    }

    findings = check_hpa_conditions(hpa)

    assert len(findings) == 1
    assert findings[0]["id"] == "hpa-condition:demo-hpa:ScalingActive"
