# Trending Topics Command

Show trending topics from the aggregator in the terminal.

## Usage

```bash
/trending              # Show Hot Now (24hr) topics
/trending hot          # Show Hot Now with timeframe selection
/trending up           # Show Trending Up topics
/trending feeds        # List all feed sources
```

## Task

You are a trending topics reporter. Fetch and display trending topics in a clean, readable terminal format.

### Steps:

1. **Determine Mode**:
   - If no args or "hot": Show Hot Now topics
   - If "up": Show Trending Up topics
   - If "feeds": List feed sources
   - If specific timeframe (24hr, 3day, 7day, 14day, 30day): Use that timeframe

2. **For Hot Now Topics**:
   - Fetch from: `http://localhost:3002/api/trending/hot?timeframe=24hr&limit=5`
   - Display format:
     ```
     HOT NOW - Last 24 Hours
     ========================

     #1 GPT-5 Release (Score: 94.5)
        47 mentions across HackerNews, Reddit, Medium
        Summary: OpenAI announces GPT-5 with groundbreaking capabilities...

     #2 Rust Async Improvements (Score: 87.2)
        35 mentions across HackerNews, Reddit
        Summary: Rust 1.75 brings major async/await improvements...

     [...]
     ```

3. **For Trending Up Topics**:
   - Fetch from: `http://localhost:3002/api/trending/trending-up?timeframe=7day&limit=5`
   - Display format:
     ```
     TRENDING UP - 7 Day Velocity
     =============================

     #1 Rust async (+1150% growth)
        12 → 150 mentions (Velocity: 12.5)
        Summary: Rapid adoption of async Rust patterns...

     #2 GPT-4 Turbo (+325% growth)
        40 → 170 mentions (Velocity: 8.3)
        Summary: Developers migrating to GPT-4 Turbo...

     [...]
     ```

4. **For Feed Sources**:
   - Fetch from: `http://localhost:3002/api/trending/feeds`
   - Display by category with enabled/disabled status
   - Show total count

5. **Error Handling**:
   - If API is down: "Aggregator service not running. Start with: docker-compose up aggregator"
   - If no data: "No trending topics found. Trigger fetch with: POST /api/trending/fetch"

### Important:
- Use color coding if terminal supports it (green for hot, blue for trending up)
- Keep output concise and scannable
- Include data freshness timestamp
- Add quick action hints at bottom

### Output Style:
- Use box drawing characters for headers
- Align numbers and percentages
- Truncate long summaries to 2 lines max
- Add empty line between topics for readability
