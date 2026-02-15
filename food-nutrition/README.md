# Food Nutrition

Food search and nutrition data for OpenClaw, powered by QVeris (USDA FoodData Central).

## Requirements

- Node.js 18+
- `QVERIS_API_KEY`

## Usage

```bash
export QVERIS_API_KEY="your-key"
node scripts/food_nutrition.mjs search --query apple
node scripts/food_nutrition.mjs get --fdc-id 174486
```

Options: `--format json`, `--timeout N`.
