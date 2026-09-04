# Approved QVeris Tool Map

## Workflows

| Layer | Logical CAP | `macro_policy` | `growth_inflation` | `rates_fx` | Acceptance focus |
|---|---|---:|---:|---:|---|
| Broad indicators | `qveris_finance.macro_indicators` | anchor | anchor | no | dated numeric series, country, frequency, unit |
| Employment | `qveris_finance.macro_employment` | fallback | anchor | no | dated numeric labor series |
| Real estate | `qveris_finance.macro_real_estate` | fallback | yes | no | dated numeric housing/property series |
| Commodities | `qveris_finance.macro_commodity_benchmark` | fallback | yes | no | dated benchmark values, named unit |
| Policy rate | `qveris_finance.rates_policy` | anchor | no | anchor | dated policy-rate observation |
| Government benchmark | `qveris_finance.rates_govt_benchmark` | yes | no | anchor | date, tenor, value, common basis |
| Interbank benchmark | `qveris_finance.rates_interbank_benchmark` | yes | no | yes | dated named rate observation |
| FX snapshot | `qveris_finance.fx_spot` | optional | no | optional | explicit pair and dated numeric value |
| Index snapshot | `qveris_finance.index_levels` | optional | no | optional | explicit symbol and verified index type |

The default US market context uses `EUR/USD` and `SPX`; CN uses `USD/CNY`, `CSI300`, and the verified `SHIBOR` interbank type. HK, EU, SG, GB, and JP have FX/index defaults but omit interbank calls because the live detail descriptions and executable candidate values are not aligned well enough to assume a correct rate type. Other geographies omit market-context calls unless the user supplies `--fx-pair` or `--index-symbol`.

Commodity context requires an explicit benchmark. The default is `WTI`; override it with `--commodity` using a live cap-detail-approved value.

## Disabled

- `EVENT.CALENDAR.MACRO`: test-environment rows lacked a required date, so success could not support release timing.
- `MACRO.ACTUAL_VS_FORECAST`: invalid/404 in the audited environment.

Do not substitute similarly named raw routes. The shared adapter must resolve the current standardized ID from live catalog/detail on every run.
