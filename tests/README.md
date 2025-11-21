# Playwright Visual Testing

This directory contains Playwright tests for visual regression testing and feature verification.

## Quick Start

```bash
# Run tests with browser visible (good for development)
npm run test:visual

# Run tests headless (good for CI)
npm run test:visual:headless

# Interactive UI mode (best for debugging)
npm run test:visual:ui

# Quick homepage snapshot
npm run snapshot
```

## What Gets Tested

1. **Homepage rendering** - Verifies all key sections load correctly
2. **News feed** - Checks articles display and content
3. **Todo list functionality** - Tests adding/displaying todos
4. **Theme toggle** - Verifies dark/light mode switching
5. **Article interactions** - Tests hover states and buttons
6. **Responsive layouts** - Mobile (375px) and tablet (768px) viewports

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
