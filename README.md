# SolarCycle AI — Watt The Hack 2025

Hackathon project built in 8 hours at the [Watt The Hack](https://wattthehack.com.au) energy-AI hackathon. Finished **top 10 of 32 teams**.

SolarCycle AI predicts which solar assets are most likely to fail next and computes the cheapest recovery route across Victoria's solar infrastructure network.

> This is a team project. I contributed to the predictive ML pipeline and deployment. See [My Contributions](#my-contributions) below.

---

## Problem

Victorian solar infrastructure operators have no automated way to prioritise which assets need attention next or how to route field teams cost-effectively across a geographically distributed network. Manual triage is slow and recovery routes are planned without cost optimisation.

---

## Solution

A live web product that:
1. Ingests solar asset telemetry and failure history
2. Predicts failure probability per asset using a trained ML model
3. Computes the cheapest recovery route across flagged assets using graph optimisation
4. Presents the prioritised asset list and route on an interactive map

Deployed and demonstrated live within 8 hours of the hackathon start.

---

## My Contributions

- Built and integrated the **predictive ML pipeline** — feature engineering on asset telemetry, model training, and wiring the trained model to the backend API
- Supported **live deployment** of the product during the hackathon, ensuring the ML endpoint was reachable from the frontend demo
- Contributed to **data pipeline** setup for ingesting and preprocessing real Victorian solar asset data

---

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind v4, Leaflet (maps) |
| API layer | tRPC v11, React Query v5 |
| ML pipeline | Python, scikit-learn |
| Data | Victorian solar infrastructure asset data |
| Validation | Zod |

---

## Architecture

The frontend uses React Server Components with Partial Pre-Rendering. All data reads go through tRPC routers, which means swapping in a production ML backend requires only changes to the router body — the client is untouched.

```
Next.js (RSC + PPR)
    └── tRPC routers
            ├── Asset failure predictions  ← ML model output
            └── Route optimisation         ← cheapest path across flagged assets
```

---

## How to Run

```bash
npm install
npm run dev       # development
npm run build && npm run start   # production
npm run pipeline  # optional: regenerate data
```

---

## Limitations

- The ML model was trained and validated within the hackathon timeframe — it is a proof-of-concept, not a production-validated system
- Route optimisation uses a simplified cost model; a production version would incorporate real logistics costs and crew availability constraints
- Some data is mocked for demo purposes where live data was unavailable during the hackathon
