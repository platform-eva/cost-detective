from __future__ import annotations

from kubernetes import client, config


def load_kube() -> None:
    # in-cluster (Helm), sonst lokal fallback
    try:
        config.load_incluster_config()
    except Exception:
        config.load_kube_config()


def core() -> client.CoreV1Api:
    return client.CoreV1Api()


def apps() -> client.AppsV1Api:
    return client.AppsV1Api()


def autoscaling() -> client.AutoscalingV22Api:
    return client.AutoscalingV2Api()


def batch() -> client.BatchV1Api:
    return client.BatchV1Api()
