# SolarCycle AI — Watt The Hack 2025

> **Hackathon:** Watt The Hack energy-AI hackathon · **Top 10 of 32 teams** · built and deployed in 8 hours

**My contributions:** predictive ML pipeline (feature engineering, model training, backend API integration) and live deployment support during the hackathon.

---

# SolarCycle AI

Hackathon demo for a solar lifecycle & logistics product. Predicts which solar
assets fail next and recovers them on the cheapest route. The pitch walks through
four steps: **Problem → Solution → Demo**.

## Stack

- **Next.js 16** (App Router, Turbopack, Cache Components / PPR)
- **tRPC v11** + **@tanstack/react-query v5** — typed client↔server boundary
- **React 19**, **Tailwind v4**, **Leaflet** (map), **Zod** (input validation)

## Run

```bash
npm install
npm run dev      # Next dev server → http://localhost:3000
npm run build    # production build (PPR)
npm run start    # serve the production build
```

Data pipeline (optional, regenerates normalized public-dataset CSVs):

```bash
npm run pipeline
npm run pipeline:validate
```

## Architecture

```
src/
  app/                 # routes (RSC shells, thin)
    layout.tsx         # header nav (<Link>), fonts, <TRPCReactProvider>
    page.tsx           # /          landing — RSC shell (stays static/PPR)
      _components/     #            motion client islands: Hero, StatCounters,
                       #            StorySteps, ResultsBand, CtaBand (scroll reveals,
                       #            count-up, parallax) — built with `motion`
    problem/           # /problem   prefetch stats.problem
      page.tsx         #            RSC shell (Suspense + prefetch)
      _components/     #            ProblemSection, InstallWaveChart (route-private)
    solution/          # /solution  prefetch health.featured + passport.events
      page.tsx
      _components/     #            SolutionSection, HealthChart, PassportPanel,
                       #            Pipeline, LiveHealthBadge, useHealthStream
    demo/              # /demo      prefetch routes + comparison + health
      page.tsx
      _components/     #            DemoSection, MapView, CompareTable, TruckStat,
                       #            useSimulation
    api/trpc/[trpc]/route.ts   # tRPC fetch handler (batch + SSE)
    globals.css
  server/              # tRPC server boundary
    trpc.ts            # initTRPC, context, SSE config
    routers/           # sites, routes, comparison, health, passport, stats + _app
    caller.ts          # RSC server caller
  trpc/                # client provider (splitLink: httpBatch + httpSubscription)
                       # + server option-proxy (createTRPCOptionsProxy) prefetch/hydrate
  components/          # SHARED UI only: ui (Card/Stat/…), SectionSkeleton, LineChart
                       # (route-private components live in each route's _components/)
  data/  lib/          # deterministic mock data + calc — consumed ONLY by routers
```

### Data flow (SSR-first)

1. An RSC route's async data component `await`s `Promise.all([prefetch(trpc.x.queryOptions()), ...])`
   inside a `<Suspense>` boundary — the static shell (skeleton) prerenders, the
   data hole streams in (PPR). `connection()` marks the hole dynamic so React-Query's
   hydration runs at request time.
2. `<HydrateClient>` serializes the React-Query cache into the streamed HTML.
3. Client section components call `useQuery(trpc.x.queryOptions())` and read the
   hydrated cache — no refetch. Query keys align automatically via the server
   option-proxy.
4. Client islands mount: the Leaflet map (`next/dynamic`, `ssr: false`), the truck
   simulation (RAF), and the `health.live` SSE subscriber.

### The typed boundary

All reads go through tRPC routers. Today the routers return deterministic mock data
from `src/data` (+ `src/lib` calc). **Swapping to a real backend is a router-body
change only** — the client is untouched. `health.live` is the SSE example: it streams
synthetic ticks off a timer now; later swap the timer for a real IoT `EventEmitter`
and `useHealthStream` does not change.

**Boundary exemptions:** the truck simulation (`useSimulation`) and the Leaflet
`MapView` import route geometry from `src/data/demo` directly — they are client
rendering/animation, not server data reads.

## `legacy/`

The original Vite + React SPA, kept for reference and visual diffing. It is no longer
the app; everything runs from the repo root now. Safe to delete once the Next.js
version is signed off.
