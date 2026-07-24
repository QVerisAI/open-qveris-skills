# QVeris Tool Map

Source: GMGN Skills, https://github.com/GMGNAI/gmgn-skills, MIT. Local snapshot: `third_party/source_repos/23-gmgn-skills`, commit `7205bf2` on 2026-07-23.

## Runtime Rule

Use standardized `qveris_finance.*` CAP queries only. Prefer `scripts/crypto_workflow.mjs`; its public adapter resolves the canonical CAP ID and reads live cap-detail automatically. Its default output is Schema-valid and contains only semantically accepted evidence projections; `--runtime-json` is diagnostic. Do not issue a duplicate detail request on that path. The IDs below document semantic intent; they are not permission to bypass live resolution or hardcode a raw route.

| Logical tool | CAP ID | Allowed evidence | Required rejection checks |
|---|---|---|---|
| `qveris_finance.crypto_ref_master` | `CRYPTO.REF_MASTER` | asset identity, supported symbol/name, asset type, chain, contract, base/quote metadata | ambiguous ticker, wrong chain, wrong contract, wrong asset type, wrong pair |
| `qveris_finance.crypto_spot_rt` | `CRYPTO.SPOT.RT` | current price/snapshot fields and their timestamp | wrong asset/pair, missing timestamp, stale beyond `max_age`, invalid unit/currency |
| `qveris_finance.crypto_bars_history` | `CRYPTO.BARS.HISTORY` | ordered historical bars for a requested interval and window | fewer than two bars for change metrics, wrong window/interval/pair, unordered or duplicate timestamps |
| `qveris_finance.crypto_fgi` | `CRYPTO.FGI` | market-wide fear-and-greed observation and timestamp | missing scale/label/time; asset-specific interpretation |
| `qveris_finance.crypto_market_rankings` | `CRYPTO.MARKET_RANKINGS` | returned cross-sectional ranking universe and measures | mixed universe, missing rank basis/time, future-performance inference |
| `qveris_finance.crypto_whale` | `CRYPTO.WHALE` | returned large-activity records and supplied direction/context | wrong asset/chain/time, missing amount/unit, inferred intent without evidence |

## Optional Descriptive Analytics

| Logical tool | CAP ID | Rule |
|---|---|---|
| `qveris_finance.analytics_tech_indicators` | `ANALYTICS.TECH_INDICATORS` | Prefer when one validated request can return the needed descriptive fields. |
| `qveris_finance.analytics_rsi` | `ANALYTICS.RSI` | Require a stated lookback and enough observations. |
| `qveris_finance.analytics_macd` | `ANALYTICS.MACD` | Require documented fast, slow, signal, interval, and timestamp fields. |
| `qveris_finance.analytics_sma` | `ANALYTICS.SMA` | Require the reported window and interval. |
| `qveris_finance.analytics_ema` | `ANALYTICS.EMA` | Require the reported window and interval. |
| `qveris_finance.analytics_atr` | `ANALYTICS.ATR` | Descriptive range/volatility context only. |
| `qveris_finance.analytics_bbands` | `ANALYTICS.BBANDS` | Descriptive band position only. |
| `qveris_finance.analytics_stoch` | `ANALYTICS.STOCH` | Descriptive oscillator context only. |
| `qveris_finance.analytics_cci` | `ANALYTICS.CCI` | Descriptive oscillator context only. |

Use at most one combined analytics call or the smallest set of specific analytics calls needed by the prompt. Do not call every indicator by default.

## Optional Qualitative Context

| Logical tool | CAP ID | Rule |
|---|---|---|
| `qveris_finance.news_fin_realtime` | `NEWS.FIN.REALTIME` | Timely qualitative context; validate asset/entity and publication time. |
| `qveris_finance.news_fin_tagged` | `NEWS.FIN.TAGGED` | Tagged background only; tags do not prove direction or importance. |
| `qveris_finance.non_fin_social_media` | `NON_FIN.SOCIAL_MEDIA` | Attention/context only; never convert volume into a price signal. |

## Call Ordering

1. Let the workflow runner place every mandatory identity/data call before optional calls.
2. Add at most one descriptive analytics path when requested or materially useful.
3. Add news/social corroboration only when the prompt asks for catalysts, narrative, or attention context.
4. Count every observed retry and stop at `max_calls`; surface uncalled evidence as missing.

## Parameter Adaptation

- Pass structured parameters, never the whole user prompt as a free-text argument.
- Retain only parameters accepted by live detail. Drop unsupported optional parameters before calling.
- Add only documented required parameters and use documented types/enums.
- Preserve explicit contract addresses and chain names. Do not rewrite them from ticker assumptions.
- Preserve contract-address case and require an explicit chain for an address.
- For pairs, keep base and quote explicit when the CAP supports them. Never compare differently quoted prices without normalization evidence.
- If a corrected minimal request remains rejected, stop retrying and record the final normalized parameters and error category.

## Safe Trace Projection

Project each observed attempt to only:

```json
{
  "tool_name": "qveris_finance.crypto_spot_rt",
  "params": {"symbol": "BTC"},
  "status": "success",
  "execution_id": null,
  "fallback_used": false,
  "missing_fields": []
}
```

Recursively reject any parameter or artifact key containing provider, route, routing, candidate, failover, credential, API-key, source-tool-ID, tool-ID, or CAP-tool-ID concepts. A raw response may contain these internally; a public report and observed-calls artifact may not.
