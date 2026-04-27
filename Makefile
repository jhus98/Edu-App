.PHONY: dev migrate seed test stop clean

dev:
	npm install --legacy-peer-deps
	docker-compose up -d postgres redis
	sleep 3
	cd backend && npx prisma migrate deploy && npm run dev

migrate:
	cd backend && npx prisma migrate deploy

seed:
	cd backend && npx prisma db seed

test:
	node_modules/.bin/jest backend/__tests__ --runInBand --forceExit --testEnvironment node

stop:
	docker-compose down

clean:
	docker-compose down -v
