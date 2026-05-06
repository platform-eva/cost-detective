# Cost Detective

![Kubernetes](https://img.shields.io/badge/Kubernetes-Platform-blue)
![Next.js](https://img.shields.io/badge/Next.js-Dashboard-black)
![Docker](https://img.shields.io/badge/Docker-Containerized-blue)
![CI](https://img.shields.io/badge/CI-GitHub%20Actions-green)
![License](https://img.shields.io/badge/license-MIT-green)
![Status](https://img.shields.io/badge/status-Active%20Development-orange)

Cost Detective is a developer-friendly Kubernetes efficiency analysis platform.

It helps platform engineers understand:

- Kubernetes workload behavior
- autoscaling configuration
- resource efficiency
- infrastructure cost waste

---

# 🚀 DevOps Capabilities

This project demonstrates real-world DevOps practices:

- Multi-container setup (Frontend + API + Database)
- Docker-based development environment
- Docker Compose orchestration
- PostgreSQL persistence
- CI pipeline with GitHub Actions
- Automated Docker image build & publish (GHCR)

---

# 🏗 Architecture

```text
cd-web (Next.js)
   ↓
cd-api (FastAPI)
   ↓
PostgreSQL (Snapshots / History)
