# Cost Detective

![Kubernetes](https://img.shields.io/badge/Kubernetes-Platform-blue)
![Next.js](https://img.shields.io/badge/Next.js-Dashboard-black)
![Docker](https://img.shields.io/badge/Docker-Containerized-blue)
![CI](https://img.shields.io/badge/CI-GitHub%20Actions-green)
![License](https://img.shields.io/badge/license-MIT-green)
![Status](https://img.shields.io/badge/status-Active%20Development-orange)
![Helm](https://img.shields.io/badge/Helm-chart-blue)

Cost Detective is a developer-friendly Kubernetes efficiency analysis dashboard.

The project helps platform engineers understand:

- Kubernetes workload behavior  
- autoscaling configuration  
- resource efficiency  
- potential infrastructure cost waste  

The goal is to visualize Kubernetes workloads and highlight inefficiencies that often remain hidden inside cluster metrics.

---

## 🚀 DevOps & Platform Engineering

This project demonstrates real-world DevOps practices:

- Multi-container architecture (Frontend + API + Database)  
- Docker-based local development  
- Docker Compose orchestration  
- PostgreSQL persistence (historical analysis)  
- CI pipeline using GitHub Actions  
- Automated Docker image build & publish (GHCR)  

---

## Dashboard Preview

![Cost Detective Dashboard](docs/screenshots/dashboard.png)
![Cost Detective Dashboard](docs/screenshots/dashboard-2.png)

Cost Detective provides a clean dashboard for analyzing Kubernetes environments and identifying inefficient workloads.

The current dashboard visualizes:

- cluster health  
- running workloads  
- CPU usage trends  
- Horizontal Pod Autoscaler configuration  
- resource efficiency  
- estimated infrastructure cost  

⚠️ **Note**

This repository currently contains a **demo environment**.  
Some panels use example data to illustrate analysis concepts.

Future versions will integrate live Kubernetes metrics.

---

## 🐳 Running Locally (Docker)

Start full stack:

```bash
docker compose up --build
