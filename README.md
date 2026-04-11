markdown# Tempo Turkey API

A real-time financial data API for Turkish markets, built on Tempo Protocol with Machine Payment Protocol (MPP) integration.

## Overview

Tempo Turkey API provides live financial data for Turkish investors and AI agents. Every endpoint is payment-gated via MPP — no API keys, no signups, just pay-per-request.

## Live API
https://tempo-turkey-api-production.up.railway.app

## Endpoints & Pricing

| Endpoint | Description | Price |
|---|---|---|
| `GET /rates/forex` | USD, EUR, GBP, JPY vs TRY (TCMB) | 0.001 USDG |
| `GET /rates/crypto` | Top 300 cryptocurrencies in USD | 0.002 USDG |
| `GET /rates/commodities` | Gold (gram/quarter/half/full), silver, platinum, copper in TRY | 0.001 USDG |
| `GET /rates/oil` | Brent, WTI, Natural Gas in USD and TRY | 0.001 USDG |
| `GET /rates/bist` | BIST100 index + top Turkish stocks | 0.002 USDG |
| `GET /rates/all` | All data in a single request | 0.005 USDG |
| `GET /dashboard` | Web dashboard (free) | Free |

## MPP Integration

This API uses the [Machine Payments Protocol](https://mpp.dev) on Tempo. AI agents can pay automatically per request without API keys or billing accounts.

### Payment Flow

1. Agent sends a request to any endpoint
2. Server responds with `402 Payment Required` and a challenge
3. Agent pays in USDG on Tempo
4. Agent retries with payment credential
5. Server verifies and returns data

### Example with mppx CLI

```bash
# Install Tempo CLI
curl -fsSL https://tempo.xyz/install | bash

# Make a paid request
tempo request https://tempo-turkey-api-production.up.railway.app/rates/forex
```

### Example with TypeScript

```typescript
import { MppxClient } from 'mppx';
import { privateKeyToAccount } from 'viem/accounts';

const client = MppxClient.create({
  account: privateKeyToAccount('0x...'),
});

const data = await client.fetch(
  'https://tempo-turkey-api-production.up.railway.app/rates/forex'
);
```

## Data Sources

| Data | Source | Update Frequency |
|---|---|---|
| Forex (USD/EUR/GBP/JPY) | TCMB (Central Bank of Turkey) | Daily |
| Cryptocurrency | CoinGecko | Real-time |
| Gold & Metals | Metals.dev | Real-time |
| Oil & Natural Gas | Yahoo Finance | Real-time |
| BIST100 & Stocks | Yahoo Finance | Real-time |

## Sample Responses

### GET /rates/forex
```json
{
  "source": "TCMB",
  "timestamp": "2026-04-11T08:00:00.000Z",
  "rates": {
    "USD_TRY": 38.50,
    "EUR_TRY": 41.20,
    "GBP_TRY": 48.90,
    "JPY_TRY": 0.25
  }
}
```

### GET /rates/oil
```json
{
  "source": "Yahoo Finance + TCMB",
  "timestamp": "2026-04-11T08:00:00.000Z",
  "brent": { "usd": 109.05, "try": 4861.18 },
  "wti": { "usd": 112.06, "try": 4995.35 },
  "natural_gas": { "usd": 2.81, "try": 125.13, "unit": "MMBtu" }
}
```

### GET /rates/bist
```json
{
  "source": "Yahoo Finance",
  "timestamp": "2026-04-11T08:00:00.000Z",
  "bist100": {
    "symbol": "XU100",
    "price": 12936.35,
    "change_percent": -0.88,
    "currency": "TRY"
  },
  "count": 20,
  "stocks": [...]
}
```

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Express.js
- **Payment:** MPP via mppx
- **Deploy:** Railway
- **Data:** TCMB, CoinGecko, Metals.dev, Yahoo Finance

## Why Tempo?

- No API keys required — agents pay directly
- Sub-cent fees per request
- ~500ms finality for instant verification
- USDG stablecoin payments

## Contact

Built for the Tempo ecosystem. Reach out via [Tempo Discord](https://tempo.xyz).