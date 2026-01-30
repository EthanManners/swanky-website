# Swanky SMP Land Sales MVP

This repo now hosts a fullstack MVP for Swanky SMP land sales. It includes:

- Static marketing pages served from `/public`.
- A Node.js + Express API for plot inventory and Stripe checkout.
- A PostgreSQL schema managed with Prisma.
- A fulfillment queue that the Minecraft plugin can poll.

## Tech Stack

- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Payments:** Stripe Checkout
- **Frontend:** Static HTML + vanilla JS

## Quick Start

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment

Copy the example environment file and fill in values:

```bash
cp .env.example .env
```

Required variables:

- `DATABASE_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `BASE_URL`

### 3) Initialize the database

```bash
npm run prisma:migrate
npm run prisma:generate
```

### 4) Seed plots

```bash
npm run seed
```

### 5) Run the server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

## Stripe Webhook Testing

Stripe requires a webhook endpoint to complete purchases. Use the Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Then trigger a test event:

```bash
stripe trigger checkout.session.completed
```

## Plot Inventory

Edit `server/seed/plots.json` and re-run the seed script to add plots. Each entry should include:

- `plot_id` (e.g. `plot_0123`)
- `price_cents`
- `district` (optional)

## API Overview

- `GET /api/plots` — list all plots
- `GET /api/plots/:plotId` — plot details
- `POST /api/checkout/create` — create a Stripe Checkout session
- `POST /api/webhooks/stripe` — Stripe webhook receiver
- `GET /api/fulfillments?status=pending` — fulfillment queue

## Manual Refund/Conflict Handling

If a plot is already owned when a payment succeeds, the order will be marked as `failed` and no fulfillment record is created. In this scenario:

1. Manually review the order in Stripe.
2. Issue a refund if needed.
3. Contact the buyer to pick another plot.

## Notes

- The backend never trusts client-side pricing.
- UUID resolution uses Mojang's public API when possible; failures fall back to storing `owner_name` only.
- No player-to-player resale is implemented in this MVP.
