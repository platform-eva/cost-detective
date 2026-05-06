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

## 🐳 Running Locally (Docker)

Start full stack:

```bash
docker compose up --build
```

Access:

```text
Dashboard:  http://localhost:3000/dashboard
API:        http://localhost:8000
DB Health:  http://localhost:8000/api/db/health
Snapshots:  http://localhost:8000/api/snapshots
```

---

## 🏗 Architecture

```text
cd-web (Next.js)
   ↓
cd-api (FastAPI)
   ↓
PostgreSQL (Snapshots / History)
```

Optional Kubernetes environment:

```text
k3d → Kubernetes → Helm → HPA
```

---

## Dashboard Preview

![Cost Detective Dashboard](docs/screenshots/dashboard.png)
![Cost Detective Dashboard](docs/screenshots/dashboard-2.png)

---

## Why This Project Exists

Kubernetes clusters often hide important operational insights behind raw metrics and infrastructure complexity.

Platform teams frequently struggle to answer questions such as:

- Which workloads actually use the resources they request?  
- Is autoscaling configured correctly?  
- Which services waste the most CPU or memory?  
- Where can infrastructure costs be reduced?  

Cost Detective aims to make these insights visible through a clean and developer-friendly dashboard.

---

## 🧠 Key Features

### Resource Waste Analysis

The dashboard compares **requested resources** with **actual usage**.

Example:

```text
requested CPU: 500m
actual CPU usage: 120m
```

This means **380m CPU are reserved but never used**.

Example output:

```text
cd-api waste 76%
cd-web waste 63%
cd-burner waste 41%
```

---

### 📊 Historical Analysis (NEW)

Snapshots are stored in PostgreSQL:

- timestamp  
- findings count  
- namespace  

This enables:

- trend analysis  
- future cost estimation  
- historical insights  

---

### Cluster Health Overview

Provides a quick overview of the Kubernetes environment:

- number of running workloads  
- autoscaling status  
- alert indicators  

---

### Workload Summary

Displays key cluster metrics such as:

- nodes  
- running pods  
- CPU usage  
- autoscaling activity  

---

### CPU Usage Trend

Visualizes cluster activity over time.

This helps understand system behavior under load.

---

### Workload Details

Shows Kubernetes deployments and their estimated resource usage:

- deployment name  
- replicas  
- CPU usage  
- memory usage  
- container image  

---

### Horizontal Pod Autoscaler Overview

Displays autoscaling configuration:

- minimum replicas  
- maximum replicas  
- current replicas  
- CPU target threshold  

---

### Resource Efficiency Analysis

Example:

```text
requested CPU: 500m
used CPU: 120m
potential waste: 380m CPU
```

---

### Cost Insight (Preview)

Planned features:

- cost per service  
- cost per namespace  
- potential savings  

---

## Demo Environment

Cost Detective currently runs inside a local Kubernetes cluster.

Environment setup:

```text
Laptop → k3d Kubernetes cluster
```

Cluster services:

- cd-web (Next.js dashboard)  
- cd-api (backend API)  
- cd-burner (load generator)  

Infrastructure components:

- Kubernetes (k3d)  
- Helm deployment  
- Traefik ingress controller  
- metrics-server  
- Horizontal Pod Autoscaler  

---

## Technology Stack

### Frontend
- Next.js  
- TypeScript  
- Tailwind CSS  
- Recharts  

### Backend
- FastAPI  
- Kubernetes Python Client  
- SQLAlchemy  

### Infrastructure
- Docker  
- Docker Compose  
- PostgreSQL  
- Kubernetes  
- Helm  
- GitHub Actions  

---

## Project Structure

```text
cost-detective
│
├ apps
│  └ api
│
├ dashboard
│
├ charts
│
├ docs
│
├ docker-compose.yml
│
└ README.md
```

---

## 🔄 CI/CD

On every push:

- Docker images are built  
- Images are pushed to GitHub Container Registry  

Images:

```text
ghcr.io/platform-eva/cost-detective/api:latest
ghcr.io/platform-eva/cost-detective/web:latest
```

---

## Roadmap

- live Kubernetes metrics integration  
- resource waste alerts  
- cost estimation  
- historical charts  
- multi-cluster support  

---

## Learning Goals

- Kubernetes platform engineering  
- infrastructure observability  
- autoscaling behavior  
- cost optimization  
- DevOps workflows  

---

## Project Status

Cost Detective is an experimental platform engineering project.

The dashboard and analysis logic are actively evolving.

---

## Author

Created as a DevOps / Platform Engineering learning project.
