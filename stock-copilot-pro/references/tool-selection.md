# Tool Selection Strategy

## Capability Buckets

- `quote`: real-time quote / OHLCV
- `fundamentals`: company overview / key metrics
- `technicals`: RSI / MACD / moving averages
- `sentiment`: market news and sentiment
- `x_sentiment`: X/Twitter ticker search and finance-domain hot topics

## Ranking Rule

For each bucket, rank candidate tools by:

1. Higher `success_rate`
2. Lower `avg_execution_time_ms`
3. Better parameter fit (supports required fields for target symbol)

Use top 1 as primary and next 2 as fallbacks.

## Market-Aware Symbol Fallback

When direct symbol fails, try variants:

- `US`: `AAPL`, then `AAPL.US`
- `HK`: `0700.HK`, then `700.HK`, then `0700`
- `CN`: `600519.SS`, `600519.SH`, then `600519`
- `GLOBAL`: run direct first, then market-specific suffixes if known

For CN/HK markets, prefer market-native providers when available:

- Quote / fundamentals: `ths_ifind.real_time_quotation.v1`, `ths_ifind.company_basics.v1`
- Technical trend proxy: `ths_ifind.history_quotation.v1`
- Sentiment fallback: generic market news when ticker-restricted APIs reject symbol format

## Reliability Gate

Prefer tools with:

- `success_rate >= 0.7` for primary use
- `avg_execution_time_ms > 0` and not abnormally high for interactive usage

If no candidate passes gate, still execute the best available one and mark confidence lower.

## Evolution Priority Queue

- Before live search, try tools from `.evolution/tool-evolution.json` priority queue.
- Queue admission (aggressive mode): one successful execution can enroll the tool.
- If queue candidates fail, fall back to fresh search and normal ranking.
- Queue ordering is based on recent success ratio, speed, and market match.
- Never store credentials or raw sensitive payload in evolution state.

For `x_sentiment`, only X-related tools are eligible in routing:

- `x_developer.2.tweets.search.recent.*` (primary)
- `qveris_social.x_domain_new_posts_v1` (fallback)
- `qveris_social.x_domain_hot_topics_v1` (fallback)
- `qveris_social.x_domain_hot_events_v1` (fallback)

## Large Payload Handling

If result returns truncation metadata:

- Keep `truncated_content` for summary extraction
- Preserve `full_content_file_url` in report notes
- Avoid dumping full raw payload into markdown output

