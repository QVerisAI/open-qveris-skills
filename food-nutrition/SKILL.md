---
name: food-nutrition
description: Food search and nutrition data powered by QVeris. USDA FoodData Central – search foods by keyword, retrieve food details and nutrients by FDC ID.
env:
  - QVERIS_API_KEY
credentials:
  required:
    - QVERIS_API_KEY
  primary_env: QVERIS_API_KEY
  scope: read-only
  endpoint: https://qveris.ai/api/v1
network:
  outbound_hosts:
    - qveris.ai
auto_invoke: true
source: https://qveris.ai
examples:
  - "苹果 营养成分"
  - "search food apple nutrition"
  - "food by FDC ID 174486"
---

# Food Nutrition

Food search and nutrition data via QVeris (USDA FoodData Central).

## What This Skill Does

- **Search** – Search foods by keyword (returns matching foods with IDs).
- **Get** – Retrieve full food details and nutrients by FDC ID.

## Command Surface

- `node scripts/food_nutrition.mjs search --query apple`
- `node scripts/food_nutrition.mjs get --fdc-id 174486`

## Safety

Uses only `QVERIS_API_KEY`; read-only.
