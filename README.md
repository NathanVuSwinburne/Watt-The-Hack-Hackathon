<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=Orbitron&weight=700&size=28&duration=3500&pause=800&color=F5A623&center=true&vCenter=true&multiline=true&width=720&height=110&lines=☀️+SolarCycle+AI;Predict.+Optimize.+Recover.;Watt+The+Hack+2025+·+Top+10+of+32+Teams" alt="SolarCycle AI" />

<br/>

[![Live Demo](https://img.shields.io/badge/🌐%20Live%20Demo-solarcycle.we--maid--ai.space-F5A623?style=for-the-badge&labelColor=1a1a2e)](https://solarcycle.we-maid-ai.space)
[![Hackathon](https://img.shields.io/badge/🏆%20Watt%20The%20Hack-Top%2010%20of%2032%20Teams-FFD700?style=for-the-badge&labelColor=1a1a2e)](https://solarcycle.we-maid-ai.space)
[![Built In](https://img.shields.io/badge/⚡%20Built%20In-8%20Hours-orange?style=for-the-badge&labelColor=1a1a2e)](https://solarcycle.we-maid-ai.space)

<br/>

```
  ╔═══════════════════════════════════════════════════╗
  ║  ☀️  ──── rays reach every rooftop ────  ☀️     ║
  ║  🔆  Where do panels go when they die?   🔆     ║
  ║  🌱  SolarCycle AI knows the answer.      🌱     ║
  ╚═══════════════════════════════════════════════════╝
```

**Forecast solar asset end-of-life · Predict faults before they happen · Route recovery trucks on the cheapest path**

</div>

---

## 🎯 What It Does

SolarCycle AI is a Victorian solar lifecycle intelligence platform built in 8 hours at the Watt The Hack energy-AI hackathon. It answers three questions that today have no good answer:

| Step | Question | Our Answer |
|------|----------|------------|
| **Problem** | When do panels reach end-of-life? | Real CER government data → EOL forecasts by postcode |
| **Solution** | Which inverters will fail first? | Multi-signal risk scoring + PV fault ML classifier |
| **Demo** | How do we collect them cheaply? | Multi-factor heuristic + exact TSP route optimizer |

---

## 💀 The Hard Parts — What Actually Took Time

> This is not a CRUD app. The engineering challenge was real.

### 1. Wrangling Real Government Data

We used the **Clean Energy Regulator (CER) SGU postcode dataset** — 2,811 Australian postcodes, monthly solar installations from 2001 to April 2026. The challenge:

- The CSV has per-month columns spanning 25 years. Summing, reshaping, and aligning this to our 9 Victorian demo postcodes took iteration.
- We extracted two signals: **total cumulative installs** (demand proxy) and the **pre-2011 cohort** (the first wave of panels hitting 25-year end-of-life *right now* in 2026–2035).
- Mapping postcode → LGA → council region reliably required cross-referencing the ABS geography boundaries.

**Why it matters:** without real install counts, the EOL forecast is fiction. Postcode `3029` (Wyndham) has **26,873** real rooftop systems — that's the actual recovery wave coming.

### 2. Building the Risk Scoring Engine Without Telemetry

We had no live inverter data. We built a **five-signal weighted risk model** that runs on synthetic-but-physically-grounded telemetry:

```
Risk = 0.30 × temperature_norm
     + 0.25 × THD_norm           (total harmonic distortion)
     + 0.20 × efficiency_drop
     + 0.15 × voltage_instability
     + 0.10 × age_factor
```

Each signal is domain-grounded (e.g. healthy THD < 5%, voltage nominal 230V). Thresholds map to `normal → watch → likely_breaking → urgent`. The model is deterministic so the demo is always stable, but the weights and signals are real.

### 3. The PV Fault Classifier API

We wired a real ML model API (`/api/pv-fault/predict`) trained to classify inverter telemetry into:

- **Binary:** `normal` vs `faulty`
- **4-class fault type:** `short_circuit` · `degradation` · `open_circuit` · `shadowing`

The hard part: bridging the gap between our synthetic health readings and the 6-feature telemetry format the model expects (`vdc1`, `vdc2`, `idc1`, `idc2`, `irradiance`, `pv_module_temperature`). We derived those features analytically from DC voltage, current, and THD.

### 4. Multi-Factor Route Scoring (Not Just Nearest-Neighbour)

The route optimizer scores every candidate site on **6 factors** at each step:

| Factor | Weight | Signal |
|--------|--------|--------|
| `risk` | 35% | ML risk score |
| `mass` | 20% | EOL mass estimate (kg) |
| `age` | 15% | Years to EOL window |
| `facilityFit` | 10% | Recycling centre compatibility |
| `routeEfficiency` | 10% | Extra km vs direct route (Haversine) |
| `confidence` | 10% | Data quality: CER install count + cohort + telemetry |

Then for ≤8 stops we brute-force all permutations for the **exact TSP optimum** — not an approximation. The baseline (first-reported-first-served) and optimized routes run over the same demand, so the improvement is honest.

### 5. Streaming Architecture Under Hackathon Pressure

We built **SSE (Server-Sent Events)** for live inverter health streaming (`health.live`), PPR (Partial Pre-Rendering) with React Suspense boundaries, and a tRPC typed boundary — in 8 hours. The client never touches a data file directly; every read goes through a typed router, so swapping mock data for real IoT is a single-file change.

---

## 🧠 ML Architecture

```mermaid
flowchart TD
    subgraph SOURCES["📦 Data Sources"]
        CER["☀️ CER SGU Dataset\n2,811 postcodes\n2001–2026"]
        VIC["🗺️ Victorian Postcode\nBoundaries + LGAs"]
        TEL["📡 Inverter Telemetry\nSynthetic / Real IoT"]
    end

    subgraph PIPELINE["⚙️ Data Pipeline"]
        NORM["Normalise & Reshape\nCSV → typed records"]
        EOL["EOL Cohort Extraction\npre-2011 install wave"]
        FEAT["Feature Engineering\nvdc · idc · irradiance\nTHD · temperature"]
    end

    subgraph MODELS["🤖 ML Models"]
        RISK["Risk Scoring Engine\nWeighted 5-signal model\n0.30·temp + 0.25·THD\n+ 0.20·eff + 0.15·volt\n+ 0.10·age"]
        PVF["PV Fault Classifier\nBinary: normal/faulty\n4-class: short_circuit\ndegradation · open_circuit\nshadowing"]
        ROUTE["Route Heuristic\n6-factor scoring\n+ exact TSP ≤8 stops\n+ greedy NN fallback"]
    end

    subgraph OUTPUTS["📊 Outputs"]
        HEALTH["Asset Health\n+ Fault Type Confidence"]
        PRIORITY["Collection Priority\nRanking by LGA/postcode"]
        OPT["Optimised Route\nvs Reactive Baseline\nkm + cost saved"]
    end

    CER --> NORM
    VIC --> NORM
    NORM --> EOL
    TEL --> FEAT
    EOL --> RISK
    FEAT --> RISK
    FEAT --> PVF
    RISK --> ROUTE
    EOL --> ROUTE
    RISK --> HEALTH
    PVF --> HEALTH
    ROUTE --> OPT
    EOL --> PRIORITY
    RISK --> PRIORITY
```

---

## 🚀 Stack

| Layer | Tech |
|-------|------|
| Framework | **Next.js 15** · App Router · Turbopack · PPR |
| API | **tRPC v11** + **@tanstack/react-query v5** |
| UI | **React 19** · **Tailwind v4** · **Leaflet** (map) |
| Validation | **Zod** |
| Streaming | SSE via tRPC `httpSubscription` |
| Data | Real CER government CSV + deterministic mock engine |

---

## ▶️ Run

```bash
npm install
npm run dev      # → http://localhost:3000
npm run build
npm run start
```

Optional — regenerates normalised CSVs from raw public datasets:

```bash
npm run pipeline
npm run pipeline:validate
```

---

## 🗂️ Architecture

```
src/
  app/                 # routes (RSC shells, PPR)
    page.tsx           # / landing — motion Hero, StatCounters, StorySteps
    problem/           # /problem — EOL forecast, install wave chart
    solution/          # /solution — health scoring, passport, live SSE feed
    demo/              # /demo — Leaflet map, route comparison, truck sim
    api/trpc/[trpc]/   # tRPC fetch handler (batch + SSE)
  server/
    routers/           # sites · routes · comparison · health · passport · stats
    caller.ts          # RSC server caller
  lib/
    pvFaultModel.ts    # PV fault classifier bridge + telemetry mapping
    risk.ts            # 5-signal weighted risk engine
    optimizer.ts       # TSP exact solver + greedy NN fallback
    routeHeuristic.ts  # 6-factor greedy candidate scorer
    roadRouting.ts     # road distance matrix
    geo.ts             # Haversine geometry
  data/
    cer.ts             # Real CER install + EOL cohort data
    asset.ts           # Asset registry
    victoria.ts        # Victorian postcode/LGA lookup
    demo.ts            # Logistics nodes, sites, vehicle config
```

### Data Flow (SSR-first)

```
RSC route → prefetch trpc.x.queryOptions()
         → <Suspense> streams skeleton → data hole fills via PPR
         → <HydrateClient> serialises React-Query cache into HTML
         → client useQuery() reads hydrated cache — zero refetch
         → islands mount: Leaflet map (dynamic/ssr:false), truck sim (RAF), SSE feed
```

**Typed boundary:** all reads go through tRPC routers. Swap `src/data` for a real database — the client is untouched.

---

## 👥 Contributions

**Nathan Vu** — predictive ML pipeline (feature engineering, risk model, PV fault API integration, route optimizer) · live deployment

---

<div align="center">

[![Live Demo](https://img.shields.io/badge/🌐%20Try%20It%20Live-solarcycle.we--maid--ai.space-F5A623?style=for-the-badge&labelColor=1a1a2e)](https://solarcycle.we-maid-ai.space)

*Built in 8 hours · Watt The Hack 2025 · Top 10 of 32 teams*

</div>
