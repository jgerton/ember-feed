# n8n Workflows for Ember Feed

This directory contains n8n workflow JSON files that can be imported into n8n.

## Workflows

| Workflow | File | Trigger | Description |
|----------|------|---------|-------------|
| **Error Reporter** | `error-reporter.json` | Sub-workflow | Called by other workflows to report errors to ember-feed |
| **Feed Collector** | `feed-collector.json` | Schedule (15 min) | Main RSS/API feed collector |
| **Apify Scraper** | `apify-scraper.json` | Webhook | On-demand newsletter scraper using Apify |
| **Feed Health Check** | `feed-health-check.json` | Schedule (6 hrs) | Tests failing feeds and marks recovered ones |

## Setup Instructions

### 1. Start the Stack

```bash
docker-compose up -d
```

### 2. Access n8n

Open http://localhost:5678 in your browser.

Default credentials (from docker-compose.yml):
- Username: `ember`
- Password: `ember_n8n_dev` (or set via `N8N_PASSWORD` env var)

### 3. Import Workflows

1. In n8n, click **Workflows** in the sidebar
2. Click **Import from File**
3. Select a workflow JSON file from this directory
4. Click **Import**
5. Repeat for each workflow

**Import Order:**
1. `error-reporter.json` (dependency for others)
2. `feed-collector.json`
3. `feed-health-check.json`
4. `apify-scraper.json` (if using Apify)

### 4. Configure Environment Variables

The workflows use these environment variables (set in docker-compose.yml):

| Variable | Default | Description |
|----------|---------|-------------|
| `EMBER_API_URL` | `http://app:3000` | Ember Feed API URL |
| `RSSHUB_URL` | `http://rsshub:1200` | RSSHub proxy URL |
| `ERROR_REPORTER_WORKFLOW_ID` | (auto) | ID of imported Error Reporter workflow |

### 5. Set Up Apify (Optional)

If using the Apify scraper:

1. Create an Apify account at https://apify.com
2. Get your API token from Settings > Integrations
3. In n8n, go to **Settings > Credentials**
4. Create new **HTTP Header Auth** credential named "Apify API Token"
5. Header name: `Authorization`
6. Header value: `Bearer YOUR_APIFY_TOKEN`

### 6. Activate Workflows

1. Open each imported workflow
2. Toggle the **Active** switch in the top-right
3. The Feed Collector will start running every 15 minutes

## Webhook URLs

After importing and activating the Apify Scraper workflow:

- **Apify Scraper Webhook:** `http://localhost:5678/webhook/apify-scraper`

This is called by the `/api/n8n/trigger-apify` endpoint in ember-feed.

## Workflow Details

### Error Reporter (Sub-workflow)

Called by other workflows when errors occur. Normalizes error data and POSTs to `/api/n8n/errors`.

**Input format:**
```json
{
  "workflowId": "optional",
  "workflowName": "optional",
  "errorMessage": "The actual error message",
  "feedId": "optional feed ID",
  "context": {}
}
```

### Feed Collector

Runs every 15 minutes:
1. Fetches active feeds from `/api/n8n/feeds`
2. Routes feeds by type (RSS, Substack, Medium, Reddit, HN)
3. Fetches content via RSS parser, RSSHub, or Algolia API
4. Normalizes articles to common schema
5. Deduplicates by URL
6. POSTs batches to `/api/n8n/ingest`

### Apify Scraper

Triggered via webhook:
1. Receives `{ feedIds: [...] }` or `{ scrapeAll: true }`
2. Fetches complex/newsletter feeds from ember-feed
3. Runs Apify Cheerio Scraper on each (max 10)
4. Normalizes and deduplicates results
5. POSTs to `/api/n8n/ingest`

**Webhook payload:**
```json
{
  "feedIds": ["feed-id-1", "feed-id-2"],
  "scrapeAll": false
}
```

### Feed Health Check

Runs every 6 hours:
1. Fetches feeds with status "failing" or "quarantined"
2. Tests each feed URL with HEAD request
3. Updates recovered feeds to "active" status
4. Keeps failing feeds marked as "failing"

## Troubleshooting

### Workflows not running?

1. Check the workflow is **Active** (toggle in top-right)
2. Check docker logs: `docker logs ember-feed-n8n`
3. Verify ember-feed is reachable from n8n container

### API errors?

1. Check n8n can reach ember-feed: `http://app:3000` from within Docker
2. Verify the API endpoints exist and are working
3. Check execution logs in n8n UI

### Apify not working?

1. Verify Apify credentials are configured correctly
2. Check your Apify usage/quota
3. Test the webhook URL manually with curl
