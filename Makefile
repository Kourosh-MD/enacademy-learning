.PHONY: up down logs test build curriculum

up:
	docker compose up --build

down:
	docker compose down

logs:
	docker compose logs -f backend frontend

test:
	cd backend && ./mvnw test
	cd frontend && npm run lint && npm run typecheck && npm run build

build:
	docker compose build

curriculum:
	node scripts/export-curriculum.mjs
