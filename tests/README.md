# Playwright Testing

This directory contains Playwright tests for API integration, E2E scenarios, and visual regression testing.

## Quick Start

```bash
# Run ALL tests (API + E2E + Visual)
npx playwright test

# Run only API tests
npx playwright test tests/api/

# Run only E2E tests
npx playwright test thought-capture-enhanced

# Run tests with browser visible (good for development)
npm run test:visual

# Run tests headless (good for CI)
npm run test:visual:headless

# Interactive UI mode (best for debugging)
npm run test:visual:ui

# Quick homepage snapshot
npm run snapshot
```

## Test Structure

```
tests/
├── api/                              # API Integration Tests
│   ├── test-utils.ts                # Shared test utilities
│   ├── feeds-validate.spec.ts       # /api/feeds/validate tests
│   ├── metadata.spec.ts             # /api/metadata tests
│   ├── feeds.spec.ts                # /api/feeds/* tests
│   ├── thoughts.spec.ts             # /api/thoughts tests
│   ├── articles.spec.ts             # /api/articles tests (existing)
│   ├── digest.spec.ts               # /api/digest tests (existing)
│   ├── recommendations.spec.ts      # /api/recommendations tests (existing)
│   └── settings.spec.ts             # /api/settings tests (existing)
├── thought-capture-enhanced.spec.ts # E2E test for thought capture modal
├── visual.spec.ts                   # Visual regression tests
└── screenshots/                     # Visual test screenshots
```

## What Gets Tested

### API Integration Tests (`tests/api/`)

**Feed Validation** (`feeds-validate.spec.ts`)
- Valid RSS feed URL validation
- Invalid URL format handling
- Non-HTTP/HTTPS protocol rejection
- Unreachable feed URL handling
- Non-RSS content detection
- Detailed error responses

**Metadata Extraction** (`metadata.spec.ts`)
- Article metadata extraction (title, author, description)
- RSS feed discovery from URLs
- Autodiscovery link parsing
- Common feed pattern suggestions
- URL validation and error handling
- Timeout handling for slow URLs

**Feed Management** (`feeds.spec.ts`)
- Feed creation with validation
- Duplicate feed prevention
- Feed priority clamping (0-100)
- Feed pre-testing before creation
- Missing/invalid field handling

**Thought Capture** (`thoughts.spec.ts`)
- Thought creation with text and category
- Universal URL metadata storage
- Category-specific fields (Video Insights, etc.)
- Category filtering
- Input validation and trimming

### End-to-End Tests

**Enhanced Thought Capture** (`thought-capture-enhanced.spec.ts`)
- URL detection in thought text
- Smart URL detection banner
- Metadata extraction from article URLs
- RSS feed discovery from articles
- Manual feed subscription with real-time validation
- Feed addition from discovered feeds
- Complete workflow: detect → extract → add feed → save
- Error handling throughout the flow
- Universal availability across all categories

### Visual Regression Tests (`visual.spec.ts`)

1. **Homepage rendering** - Verifies all key sections load correctly
2. **News feed** - Checks articles display and content
3. **Todo list functionality** - Tests adding/displaying todos
4. **Theme toggle** - Verifies dark/light mode switching
5. **Article interactions** - Tests hover states and buttons
6. **Responsive layouts** - Mobile (375px) and tablet (768px) viewports

## Test Patterns & Best Practices

### API Test Pattern

All API tests use consistent utilities from `tests/api/test-utils.ts`:

```typescript
import { test, expect } from '@playwright/test'
import { apiPost, apiGet, assertResponseShape } from './test-utils'

test('validates feed URL', async ({ request }) => {
  const { data, ok, status } = await apiPost(request, '/api/feeds/validate', {
    url: 'https://example.com/feed'
  })

  expect(ok).toBe(true)
  expect(status).toBe(200)
  assertResponseShape(data, ['success', 'feedName', 'articlesCount'])
})
```

**Available Test Utilities:**
- `apiGet(request, endpoint, params?)` - GET with query params
- `apiPost(request, endpoint, body)` - POST with JSON body
- `apiPatch(request, endpoint, body)` - PATCH with JSON body
- `apiDelete(request, endpoint)` - DELETE request
- `assertResponseShape(data, keys)` - Validate object has expected keys
- `assertArrayShape(array, keys)` - Validate array items have expected keys
- `sleep(ms)` - Async sleep utility

### E2E Test Pattern

E2E tests use Playwright's page object and assertions:

```typescript
test('user workflow', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // Interact with UI
  await page.getByPlaceholder(/your thought/i).fill('Test thought')
  await page.getByRole('button', { name: /save/i }).click()

  // Assert results
  await expect(page.getByText('Success')).toBeVisible()
})
```

**E2E Best Practices:**
- Use semantic selectors (`getByRole`, `getByPlaceholder`, `getByText`)
- Wait for loading states (`waitForLoadState('networkidle')`)
- Use debounce delays (`sleep(600)`) for debounced inputs
- Test both success and error paths
- Verify UI state changes (loading, success, error)

### Testing Feed Discovery Feature

The enhanced thought capture modal has several interconnected features. Here's how to test them:

**1. URL Detection:**
```typescript
// Type URL in textarea
await textarea.fill('Check out https://example.com')
await sleep(600) // Wait for 500ms debounce + buffer

// Verify banner appears
await expect(page.getByText(/URL detected/i)).toBeVisible()
```

**2. Metadata Extraction:**
```typescript
// Trigger extraction
await page.getByRole('button', { name: /extract metadata/i }).click()

// Wait for loading → success
await expect(page.getByText(/Extracting metadata/i)).toBeVisible()
await expect(page.getByText(/Metadata Extracted/i)).toBeVisible({ timeout: 10000 })
```

**3. Feed Validation:**
```typescript
// Enter feed URL
await feedInput.fill('https://example.com/feed')
await sleep(600) // Debounce

// Check validation state
await expect(page.getByText(/Validating feed/i)).toBeVisible()
await expect(page.getByText(/Valid RSS Feed/i)).toBeVisible({ timeout: 10000 })
```

## Screenshot Locations

All screenshots are saved to `tests/screenshots/`:

- `homepage-full.png` - Full page desktop view
- `news-feed.png` - News feed section
- `todo-empty.png` - Empty todo list
- `todo-with-item.png` - Todo list with items
- `theme-dark.png` - Dark mode
- `theme-light.png` - Light mode
- `article-hover.png` - Article hover state
- `mobile-view.png` - Mobile viewport (375x667)
- `tablet-view.png` - Tablet viewport (768x1024)

## Development Workflow

### When Building New Features

1. **Capture before state**: Run `npm run snapshot` before making changes
2. **Make your changes**: Implement the feature
3. **Verify visually**: Run `npm run test:visual` to see the result
4. **Check screenshots**: Review screenshots in `tests/screenshots/`
5. **Commit if good**: If it looks correct, commit the screenshots with your code

### When Fixing Bugs

1. **Run tests**: `npm run test:visual` to reproduce the issue
2. **Fix the bug**: Make code changes
3. **Re-run tests**: Verify the fix visually
4. **Compare screenshots**: Ensure no unintended side effects

### Debugging Failed Tests

```bash
# Use UI mode for step-by-step debugging
npm run test:visual:ui

# Or run headed mode to watch the browser
npm run test:visual
```

## Test Configuration

- **Base URL**: http://localhost:3002 (Docker container)
- **Browser**: Chromium
- **Viewport**: Desktop 1280x720 (default), Mobile 375x667, Tablet 768x1024
- **Screenshots**: Captured on test execution
- **Server**: Automatically starts Docker container before tests

## Adding New Tests

1. Edit `tests/visual.spec.ts`
2. Follow existing test patterns
3. Use descriptive test names
4. Capture screenshots for visual verification
5. Add assertions for key elements

Example:
```typescript
test('my new feature works', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // Test your feature
  await page.getByRole('button', { name: 'My Button' }).click()

  // Capture screenshot
  await page.screenshot({ path: 'tests/screenshots/my-feature.png' })

  // Assert expectations
  await expect(page.getByText('Expected Result')).toBeVisible()
})
```

## CI/CD Integration

For continuous integration, use:

```bash
npm run test:visual:headless
```

This runs tests without opening a browser window and is faster for automated checks.

## Viewing HTML Reports

After running tests, view detailed results:

```bash
npx playwright show-report
```

This opens an interactive HTML report showing:
- Test results
- Screenshots
- Error traces
- Timing information
