# News Briefing

个性化新闻简报与微信文章搜索 Skill for OpenClaw。

## Features

- 📰 **每日简报**: 个性化早报和晚报
- 🔍 **文章搜索**: 搜索微信文章和全网新闻
- 🔥 **热点追踪**: 实时热门话题监控
- 📌 **话题监控**: 关注特定关键词的新文章
- 🌐 **多源聚合**: caidazi + xiaosu + X/Twitter

## Status

✅ **当前版本**: 生产就绪版 (v1.0)
- ✅ 输出格式和交互逻辑已完善
- ✅ API 集成完成（使用真实 QVeris API）
- ✅ 支持 caidazi 微信文章搜索
- ✅ 支持 xiaosu 全网搜索
- ✅ 支持 X/Twitter 推文搜索
- ✅ 完整测试套件 (7/7 通过)

## Installation

1. 确保已安装 Node.js 18+
2. 设置环境变量:
   ```bash
   export QVERIS_API_KEY="your-api-key"
   ```
3. 复制配置文件:
   ```bash
   cp config/preferences.example.json config/preferences.json
   cp config/watchlist.example.json config/watchlist.json
   ```

## Usage

### 生成简报
```bash
# 早报
node scripts/news_briefing.mjs brief --type morning

# 晚报
node scripts/news_briefing.mjs brief --type evening

# 指定主题
node scripts/news_briefing.mjs brief --topics "科技,财经"
```

### 搜索文章
```bash
# 基础搜索
node scripts/news_briefing.mjs search --query "人工智能"

# 限定数据源
node scripts/news_briefing.mjs search --query "特斯拉" --sources caidazi,xiaosu

# 限定时间
node scripts/news_briefing.mjs search --query "AI" --days 7
```

### 热点追踪
```bash
# 全部热点
node scripts/news_briefing.mjs trending

# 分类热点
node scripts/news_briefing.mjs trending --category tech

# X/Twitter 热点
node scripts/news_briefing.mjs trending --sources x
```

### 监控列表
```bash
# 查看监控列表
node scripts/news_briefing.mjs watch --action list

# 添加关键词
node scripts/news_briefing.mjs watch --action add --keyword "比特币"

# 移除关键词
node scripts/news_briefing.mjs watch --action remove --keyword "特斯拉"
```

## Configuration

### 用户偏好 (config/preferences.json)
```json
{
  "interests": ["科技", "财经", "AI", "区块链"],
  "preferred_sources": ["caidazi", "xiaosu"],
  "briefing_time": "08:00",
  "language": "zh",
  "summary_length": "medium"
}
```

### 监控列表 (config/watchlist.json)
```json
{
  "keywords": ["人工智能", "特斯拉", "比特币"],
  "categories": ["tech", "finance"]
}
```

## Output Formats

- `markdown` (默认): 格式化报告
- `json`: JSON 数据结构
- `chat`: 聊天友好的简洁输出
- `summary`: 仅关键要点

## Data Sources

- **caidazi**: 微信文章、研究报告、新闻
- **xiaosu**: 全网新闻搜索
- **x**: X/Twitter 社交媒体热点

## Development

### Running Tests

```bash
# Set API key
export QVERIS_API_KEY="your-api-key"

# Run all tests
node scripts/test.mjs
```

### Project Structure

```
news-briefing/
├── SKILL.md                    # Skill definition and documentation
├── README.md                   # User guide
├── scripts/
│   ├── news_briefing.mjs      # Main script (fully functional)
│   └── test.mjs               # Test suite
└── config/
    ├── preferences.example.json
    └── watchlist.example.json
```

## License

MIT
