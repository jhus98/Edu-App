# ✦ Luminary

A mobile-first educational scroll feed — like TikTok, but for learning. Users swipe through beautifully designed fact cards covering History, Science, Space, Nature, Geography, Philosophy, Technology, and Art. All content is AI-generated using Claude, automatically verified, and human-reviewed before reaching users.

## Architecture

```
luminary/
├── apps/mobile/          # React Native / Expo app (iOS, Android, Web)
├── backend/              # Node.js + Express API
│   ├── src/
│   │   ├── routes/       # API endpoints
│   │   ├── services/     # Business logic
│   │   ├── middleware/   # Auth, rate limiting
│   │   └── jobs/         # Background workers (cron)
│   └── prisma/           # Schema + migrations + seed
├── shared/               # Shared types and category constants
└── docker-compose.yml    # PostgreSQL 16 + pgvector, Redis 7
```

## Prerequisites

- Node 18+
- Docker and Docker Compose
- Expo CLI (`npm install -g expo-cli`)
- An Anthropic API key
- (Optional) A Brave Search API key for cross-reference verification

## Getting Started

### 1. Clone and install

```bash
git clone <repo-url>
cd luminary
cp .env.example .env
# Edit .env and fill in ANTHROPIC_API_KEY, JWT_SECRET, JWT_REFRESH_SECRET
```

### 2. Install backend dependencies

```bash
cd backend && npm install
```

### 3. Start the full stack

```bash
make dev
```

This starts PostgreSQL (with pgvector) and Redis via Docker, runs Prisma migrations, and starts the backend with hot reload.

### 4. Seed the database

```bash
make seed
```

Creates 20 pre-approved fact cards plus three test accounts:

| Role   | Email                   | Password       |
|--------|-------------------------|----------------|
| Admin  | admin@luminary.app      | admin123456    |
| Editor | editor@luminary.app     | editor123456   |
| Demo   | demo@luminary.app       | demo123456     |

### 5. Run the mobile app

```bash
cd apps/mobile && npm install && npx expo start
```

Scan the QR code with Expo Go, or press `i` / `a` for iOS / Android emulator.

### 6. Run tests

```bash
make test
```

## Triggering Card Generation

Requires Admin role. Use the Admin API or tap the **✦** floating button in the app:

```bash
curl -X POST http://localhost:3000/api/admin/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"category": "SCIENCE", "topic": "bioluminescence"}'
```

Cards go through three verification checks automatically. Scores ≥ 80 are auto-approved; below 80 go to the editorial queue.

## Editorial Dashboard

Log in as editor/admin and navigate to the **Editorial** tab to approve, reject, or edit pending cards.

## Makefile Commands

```
make dev      # Start Docker services + backend dev server
make migrate  # Run Prisma migrations
make seed     # Seed database with sample cards and users
make test     # Run all backend tests
make stop     # Stop Docker services
make clean    # Stop and remove Docker volumes
```