# API Integration Tests

Comprehensive integration tests for Ember Feed API endpoints using Playwright.

## Test Files

- **`test-utils.ts`** - Common utilities for API testing
- **`digest.spec.ts`** - Tests for `/api/digest` endpoint (daily highlights)
- **`recommendations.spec.ts`** - Tests for `/api/recommendations` endpoint
- **`settings.spec.ts`** - Tests for `/api/settings` endpoint (diversity preferences)
- **`articles.spec.ts`** - Tests for `/api/articles` endpoint (personalized feed)

## Running Tests

### Run all API tests
```bash
npm run test:api
```

### Run specific test file
```bash
npx playwright test tests/api/digest.spec.ts
npx playwright test tests/api/recommendations.spec.ts
npx playwright test tests/api/settings.spec.ts
npx playwright test tests/api/articles.spec.ts
```

### Run with UI (interactive mode)
```bash
npm run test:api:ui
```

### Run all tests (API + Visual)
```bash
npm run test:all
```

## Test Coverage

### `/api/digest` (10 tests)
- ✅ Returns valid digest structure
- ✅ Includes top 5 articles from last 24 hours
- ✅ Groups log entries by type (discoveries, accomplishments, blockers, thoughts)
- ✅ Shows unread todos
- ✅ Calculates trending topics
- ✅ Provides accurate stats (newArticles, unreadTodoCount, logEntryCount)
- ✅ Handles empty database gracefully

### `/api/recommendations` (13 tests)
- ✅ Returns personalized recommendations
- ✅ Respects limit parameter (default 10, max 50)
- ✅ Includes recommendation metadata (score, reason, breakdown)
- ✅ Scores are sorted descending
- ✅ Breakdown includes 5 signals: similarity, topic affinity, source affinity, serendipity, recency
- ✅ Provides personalized reasons ("Similar to articles you upvoted", etc.)
- ✅ Excludes already-read articles
- ✅ Handles invalid parameters gracefully

### `/api/settings` (14 tests)
- ✅ Returns user settings with diversity level
- ✅ Creates default settings if none exist
- ✅ Updates diversity level (low/medium/high)
- ✅ Validates diversity level values
- ✅ Rejects invalid values with 400 error
- ✅ Preserves id and createdAt on updates
- ✅ Updates updatedAt timestamp
- ✅ Handles concurrent requests
- ✅ Affects feed diversity behavior

### `/api/articles` (17 tests)
- ✅ Returns articles with pagination
- ✅ Respects limit and offset parameters
- ✅ Supports personalized ranking
- ✅ Includes topic information
- ✅ Diversity settings affect source distribution
- ✅ Topic filtering works correctly
- ✅ Search filters by keyword
- ✅ Source filtering works
- ✅ Combines multiple filters
- ✅ Handles invalid parameters gracefully
- ✅ Returns total count

## Test Architecture

### Test Utilities (`test-utils.ts`)

Provides helper functions for consistent API testing:

```typescript
// GET request with query params
await apiGet(request, '/api/digest')
await apiGet(request, '/api/recommendations', { limit: '10' })

// PATCH request with body
await apiPatch(request, '/api/settings', { diversityLevel: 'high' })

// Response shape validation
assertResponseShape(data, ['id', 'title', 'score'])
assertArrayShape(articles, ['id', 'title'])
```

### Common Patterns

**Testing response structure:**
```typescript
test('returns valid structure', async ({ request }) => {
  const { data, ok, status } = await apiGet(request, '/endpoint')

  expect(ok).toBe(true)
  expect(status).toBe(200)
  assertResponseShape(data, ['key1', 'key2'])
})
```

**Testing validation:**
```typescript
test('rejects invalid input', async ({ request }) => {
  const { ok, status } = await apiPatch(request, '/endpoint', {
    field: 'invalid'
  })

  expect(ok).toBe(false)
  expect(status).toBe(400)
})
```

**Testing data integrity:**
```typescript
test('data matches expectations', async ({ request }) => {
  const { data } = await apiGet(request, '/endpoint')

  expect(data.count).toBe(data.items.length)
  expect(data.items[0].score).toBeGreaterThan(0)
})
```

## Prerequisites

Tests assume:
- Docker container is running on `http://localhost:3002`
- Database has sample data (articles, todos, log entries)
- Playwright is installed (`npm install`)

## CI/CD Integration

Tests are configured to run in CI with:
- Automatic Docker container startup
- Retry on failure (2 retries)
- HTML report generation
- Screenshots on failure

## Debugging Failed Tests

### View test results
```bash
npx playwright show-report
```

### Run specific test with trace
```bash
npx playwright test tests/api/digest.spec.ts --trace on
```

### Run in headed mode (see browser)
```bash
npx playwright test tests/api/digest.spec.ts --headed
```

### Debug mode (step through)
```bash
npx playwright test tests/api/digest.spec.ts --debug
```

## Writing New Tests

1. Create new file in `tests/api/[endpoint].spec.ts`
2. Import test utilities:
   ```typescript
   import { test, expect } from '@playwright/test'
   import { apiGet, apiPost, assertResponseShape } from './test-utils'
   ```
3. Write test cases following existing patterns
4. Run tests: `npx playwright test tests/api/[endpoint].spec.ts`

## Test Data Considerations

**Important:** Tests run against live database
- Tests may modify settings (diversity level)
- Tests do not clean up data between runs
- For production-ready tests, use test database or reset between tests

**Future improvements:**
- Database reset/seeding before test run
- Test isolation (separate test database)
- Mock data fixtures
- Transaction rollback after tests

## Related Documentation

- [Playwright Docs](https://playwright.dev/)
- [API Routes](../../app/api/)
- [Ranking Service](../../lib/rankingService.ts)
- [Main Visual Tests](../visual.spec.ts)
