.PHONY: dev build test test-e2e stop clean install migrate db-push db-studio

# Development
dev:
	docker-compose up --build

dev-detached:
	docker-compose up --build -d

stop:
	docker-compose down

clean:
	docker-compose down -v
	docker system prune -f

# Installation
install:
	cd frontend && bun install
	cd backend && bun install

# Database
migrate:
	docker-compose exec backend bun run migrate

db-push:
	docker-compose exec backend bun run db:push

db-studio:
	docker-compose exec backend bun run db:studio

db-seed:
	docker-compose exec backend bun run db:seed

# Testing
test:
	docker-compose -f docker-compose.test.yml run --rm backend-test
	docker-compose -f docker-compose.test.yml run --rm frontend-test

test-backend:
	docker-compose -f docker-compose.test.yml run --rm backend-test

test-frontend:
	docker-compose -f docker-compose.test.yml run --rm frontend-test

test-e2e:
	docker-compose -f docker-compose.test.yml run --rm e2e

# Build for production
build:
	docker-compose -f docker-compose.yml build

# Logs
logs:
	docker-compose logs -f

logs-backend:
	docker-compose logs -f backend

logs-frontend:
	docker-compose logs -f frontend

# Shell access
shell-backend:
	docker-compose exec backend sh

shell-frontend:
	docker-compose exec frontend sh

# Linting and formatting
lint:
	cd frontend && bun run lint
	cd backend && bun run lint

format:
	cd frontend && bun run format
	cd backend && bun run format

typecheck:
	cd frontend && bun run typecheck
	cd backend && bun run typecheck
