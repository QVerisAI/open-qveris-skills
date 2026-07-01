# X Founder Operations

Systematic X (Twitter) account operations skill for founders, indie developers, and tech professionals.

## SEO Keywords

OpenClaw, X operations skill, Twitter growth strategy, founder personal branding, indie developer marketing, tech Twitter, content strategy, engagement playbook, thread strategy, build in public, AI agent social media, X algorithm optimization, community building, product promotion, thought leadership

## What This Skill Does

X Founder Operations provides a complete operating system for running an effective X account. It implements a daily Plan-Do-Check-Act (PDCA) closed loop that continuously optimizes your content, engagement, and growth strategy based on real performance data.

### Core Capabilities

- **Daily operations loop**: Structured morning scan, content creation, engagement, and evening review
- **Content strategy**: 5-pillar system with proven formulas, templates, and content pipeline
- **Thread growth playbook**: Architecture, hook formulas, scheduling, and repurposing
- **Multimodal content**: Image, video, diagram, and meme strategy for authentic engagement
- **Product promotion**: 3-tier "夹带私货" framework for natural product integration
- **Engagement playbook**: Core circle strategy, reply quality framework, DMs, X Spaces
- **Persona development**: Voice attributes, consistency rules, "活人感" (human feel) checklist
- **Algorithm awareness**: How the X algorithm works and how to optimize for it
- **Competitor analysis**: Benchmark selection, content formula extraction, gap identification
- **Data-driven evolution**: A/B testing, performance analytics, continuous improvement
- **Automated scheduling**: Cron-based task schedule with timezone configuration

## Who It's For

| Role | Primary Use |
|------|------------|
| **Founders** | Brand building, lead generation, fundraising, hiring, thought leadership |
| **Indie Developers** | Audience building, build-in-public, converting followers to users |
| **Tech Professionals** | Personal branding, domain expertise, professional networking |

## Quick Start

1. Copy config templates and customize:
   ```
   config/profile.example.json → config/profile.json
   config/goals.example.json → config/goals.json
   config/watchlist.example.json → config/watchlist.json
   config/content-calendar.example.json → config/content-calendar.json
   ```

2. Optimize your X profile using `references/profile-optimization.md`

3. Start the daily PDCA loop described in `references/methodology.md`

4. Set up automated tasks from `references/cron-schedule.md`

## Project Structure

```
x-founder-operations/
├── SKILL.md                          # Core skill definition
├── README.md                         # This file
├── .gitignore
├── config/
│   ├── profile.example.json          # User profile template
│   ├── goals.example.json            # Goal framework template
│   ├── watchlist.example.json        # Accounts to engage/monitor
│   └── content-calendar.example.json # Weekly content rhythm
├── references/
│   ├── methodology.md                # PDCA daily loop system
│   ├── content-strategy.md           # 5-pillar content framework
│   ├── thread-playbook.md            # Thread growth strategy
│   ├── multimodal-guide.md           # Visual content creation
│   ├── product-integration.md        # Product promotion framework
│   ├── engagement-playbook.md        # Community & relationship building
│   ├── persona-voice.md              # Voice development guide
│   ├── algorithm-guide.md            # X algorithm mechanics
│   ├── profile-optimization.md       # Profile conversion optimization
│   ├── competitor-framework.md       # Competitor analysis methodology
│   ├── growth-benchmarks.md          # Industry benchmark data
│   └── cron-schedule.md              # Automated task schedule
├── templates/
│   ├── daily-review.md               # Daily PDCA review template
│   ├── weekly-review.md              # Weekly performance review
│   ├── monthly-review.md             # Monthly strategy review
│   └── performance-report.md         # Analytics report template
├── scripts/
│   ├── x_data_validator.py           # Data validation workflow
│   ├── content_planner.py            # Content recommendation engine
│   └── analytics_reporter.py         # Performance analytics
└── .evolution/
    └── README.md                     # Runtime state documentation
```

## Key Design Principles

- **Config over hardcode**: All user-specific data in `config/`, all methodology in `references/`
- **Closed-loop by design**: Every action feeds back into the next iteration
- **Role-adaptive**: Strategy adapts to founder, indie dev, or tech professional
- **Multimodal-first**: Every content template considers visual elements
- **Authentic over viral**: Sustainable growth through genuine value, not engagement hacking
- **Data-driven evolution**: Metrics drive strategy changes, not gut feeling

## Data Integrity

This skill enforces strict data integrity:

- Never fabricates tweet content, metrics, or URLs
- Validates all data through a 5-layer pipeline (API status, ID presence, cross-validation, metrics completeness, sanity checks)
- Missing data is marked as `null`, never substituted with 0 or estimates
- All anomalies are flagged and reported
- Local TweetClaw JSON exports can be adapted with
  `XDataValidator.adapt_tweetclaw_timeline()` and
  `XDataValidator.adapt_tweetclaw_detail()` before the same validation pipeline
  runs

## Prompt Examples

- "Plan today's X content and engagement"
- "Review yesterday's tweet performance and iterate"
- "Draft a thread about [topic]"
- "Analyze competitor accounts and find engagement opportunities"
- "Run weekly X operations review"
- "Help me optimize my X profile for conversions"
- "What content should I post this week?"
- "Generate a performance report for this month"

## Notes

- Config files (`config/*.json`) are gitignored. Only `.example.json` templates are committed.
- Runtime evolution state (`.evolution/*.json`) is gitignored and generated during operations.
- The skill is designed for use with OpenClaw-compatible agents but the methodology and references are useful standalone.
- All posting times should be configured relative to your target audience's timezone.

## License

This skill is part of the open-qveris-skills collection.
