## Summary

Controls: `dry_run=false`, `max_age=P1D`, no hard `max_calls`, conservative budget note. Data-quality status: `partial`.

For `600519.SH`, QVeris identity evidence matched Kweichow Moutai Co., Ltd., CN, CNY, ISIN `CNE0000018R8`. The validated quote snapshot as of `2026-07-08T15:04:39` showed last price `1199.30`, change `+10.50`, change percent `+0.8832%`, open `1188.77`, high `1200.98`, low `1177.00`, previous close `1188.80`, volume `25,776`.

Event calendars returned issuer-matched rows, but not rows inside the requested 2026-07-01 to 2026-07-15 window. I therefore did not use those rows as in-window event evidence.

## Evidence

| Claim | qveris_finance.* capability | Parameters | Status | Fallback |
|---|---|---|---|---|
| Mainland A-share identity matched `600519.SH` | `qveris_finance.ref_security_master` | `symbol=600519.SH`, `market=CN` | `complete` | none |
| ISIN resolved for `600519.SH` | `qveris_finance.ref_symbology` | `symbol=600519.SH`, `market=CN` | `complete` | none |
| Quote snapshot available on 2026-07-08 | `qveris_finance.mkt_l1_rt` | `symbol=600519.SH`, `market=CN` | `complete` | none |
| Corporate calendar has no validated in-window row | `qveris_finance.event_calendar_corp` | `symbol=600519.SH`, `market=CN`, `start_date=2026-07-01`, `end_date=2026-07-15` | `insufficient` | rows rejected as out-of-window |
| Earnings calendar has no validated in-window row | `qveris_finance.event_calendar_earnings` | `symbol=600519.SH`, `market=CN`, `start_date=2026-07-01`, `end_date=2026-07-15` | `insufficient` | rows rejected as out-of-window |

## Market Data Read

`600519.SH` resolved to Kweichow Moutai Co., Ltd. on a CN listing, exchange field `SHH`, currency `CNY`, sector `Consumer Defensive`, industry `Beverages - Wineries & Distilleries`.

Quote fields passed identity and freshness checks. The timestamp was same-day for the requested date, and the symbol in the quote payload matched `600519.SH`.

## Data Quality And Missing Fields

`missing_fields`: validated in-window corporate event rows, validated in-window earnings event rows, lock-up calendar.

Warnings: `qveris_finance.event_calendar_corp` returned issuer-matched dividend history, but returned event dates were outside 2026-07-01 through 2026-07-15. `qveris_finance.event_calendar_earnings` returned issuer-matched historical release rows, but also outside the requested window. `qveris_finance.mkt_cn_lock_up` returned `capability_unavailable` with HTTP 404 during current run, so it was not used.

Suppressed fields: provider routing metadata, raw vendor names, trading actions, target prices, ratings, buy/sell language.

## Trace Appendix

```json
{
  "qveris_trace": [
    {
      "capability": "qveris_finance.ref_symbology",
      "parameters": {"symbol": "600519.SH", "market": "CN"},
      "status": "complete",
      "execution_id": "f56fb8ad-c3c1-4502-8164-75ab1b882cf6"
    },
    {
      "capability": "qveris_finance.ref_security_master",
      "parameters": {"symbol": "600519.SH", "market": "CN"},
      "status": "complete",
      "execution_id": "39bc7ca0-0ae3-4bdf-852f-4288b9299428"
    },
    {
      "capability": "qveris_finance.mkt_l1_rt",
      "parameters": {"symbol": "600519.SH", "market": "CN"},
      "status": "complete",
      "execution_id": "1394fa0d-c362-4821-a890-4d3c98a578e5"
    },
    {
      "capability": "qveris_finance.event_calendar_earnings",
      "parameters": {"symbol": "600519.SH", "market": "CN", "start_date": "2026-07-01", "end_date": "2026-07-15"},
      "status": "insufficient",
      "reason": "out_of_window_event",
      "execution_id": "c9ad6aa2-f627-4a87-96a0-2c0edcbbfb47"
    },
    {
      "capability": "qveris_finance.event_calendar_corp",
      "parameters": {"symbol": "600519.SH", "market": "CN", "start_date": "2026-07-01", "end_date": "2026-07-15"},
      "status": "insufficient",
      "reason": "out_of_window_event",
      "execution_id": "cfd240ce-0d80-4256-8754-9bb1bd5fa508"
    },
    {
      "capability": "qveris_finance.mkt_cn_lock_up",
      "status": "capability_unavailable",
      "reason": "HTTP 404 during cap-detail"
    }
  ]
}
```

Not investment advice.