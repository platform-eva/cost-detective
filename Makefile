CLUSTER ?= dev
NS ?= cost-detective
TAG ?= 0.1.0

API_IMG = cost-detective-api:$(TAG)
WEB_IMG = cost-detective-web:$(TAG)

.PHONY: build-api build-web import-images deploy ns pf-api pf-web

ns:
	kubectl create ns $(NS) || true

build-api:
	docker build -t $(API_IMG) ./apps/api

build-web:
	docker build -t $(WEB_IMG) ./apps/web

import-images:
	k3d image import -c $(CLUSTER) $(API_IMG) $(WEB_IMG)

deploy: ns
	helm upgrade --install cost-detective ./charts/cost-detective -n $(NS) \
	  --set namespace=$(NS) \
	  --set images.api=$(API_IMG) \
	  --set images.web=$(WEB_IMG)

pf-api:
	kubectl -n $(NS) port-forward svc/cd-api 8000:8000

pf-web:
	kubectl -n $(NS) port-forward svc/cd-web 3000:3000
