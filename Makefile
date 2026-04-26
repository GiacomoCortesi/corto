 SHELL := /bin/sh
 
 APP_NAME ?= corto
 PORT ?= 3000
 
 IMAGE ?= $(APP_NAME)
 TAG ?= latest
 FULL_IMAGE := $(IMAGE):$(TAG)
 
 COMPOSE ?= docker compose
 COMPOSE_FILE ?= docker-compose.yml
 
 .PHONY: help \
 	build run dev lint test clean \
 	docker docker-build docker-run \
 	docker-compose compose-build compose-up compose-down compose-logs
 
 help:
 	@printf "%s\n" \
 	  "Targets:" \
 	  "  build            Build production app (npm run build)" \
 	  "  run              Run production server locally (npm start)" \
 	  "" \
 	  "Docker:" \
 	  "  docker           Alias for docker-build" \
 	  "  docker-build     Build image $(FULL_IMAGE)" \
 	  "  docker-run       Run container on :$(PORT)" \
 	  "" \
 	  "Compose:" \
 	  "  docker-compose   Alias for compose-up" \
 	  "  compose-build    Build services" \
 	  "  compose-up       Start services" \
 	  "" \
 	  "Extras:" \
 	  "  dev              Start dev server (npm run dev)" \
 	  "  lint             Run eslint (npm run lint)" \
 	  "  test             Run tests (npm test)" \
 	  "  clean            Remove .next"
 
 build:
 	npm run build
 
 run:
 	npm start
 
 dev:
 	npm run dev
 
 lint:
 	npm run lint
 
 test:
 	npm test
 
 clean:
 	rm -rf .next
 
 docker: docker-build
 
 docker-build:
 	docker build -t $(FULL_IMAGE) .
 
 docker-run:
 	docker run --rm -p $(PORT):3000 --name $(APP_NAME) $(FULL_IMAGE)
 
 docker-compose: compose-up
 
 compose-build:
 	$(COMPOSE) -f $(COMPOSE_FILE) build
 
 compose-up:
 	$(COMPOSE) -f $(COMPOSE_FILE) up --remove-orphans
 
 compose-down:
 	$(COMPOSE) -f $(COMPOSE_FILE) down --remove-orphans
 
 compose-logs:
 	$(COMPOSE) -f $(COMPOSE_FILE) logs -f --tail=200
