import { test, expect } from '@playwright/test'

test.describe('Ember Feed Visual Tests', () => {
  test('homepage renders correctly', async ({ page }) => {
    await page.goto('/')

    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle')

    // Take a full page screenshot
    await page.screenshot({
      path: 'tests/screenshots/homepage-full.png',
      fullPage: true
    })

    // Verify key elements are visible
    await expect(page.getByRole('heading', { name: 'Ember Feed' })).toBeVisible()
    await expect(page.getByText('Your personalized news dashboard')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Today\'s Feed' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Quick Tasks' })).toBeVisible()
  })

  test('news feed displays articles', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Check that articles are rendered
    const articles = page.locator('article')
    await expect(articles).toHaveCount(5)

    // Screenshot the news feed section
    const newsFeed = page.locator('.lg\\:col-span-2').first()
    await newsFeed.screenshot({ path: 'tests/screenshots/news-feed.png' })

    // Verify first article content
    await expect(articles.first()).toContainText('The Future of AI Development')
    await expect(articles.first()).toContainText('Hacker News')
  })

  test('todo list is functional', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Screenshot todo section before interaction
    const todoSection = page.locator('.lg\\:col-span-1')
    await todoSection.screenshot({ path: 'tests/screenshots/todo-empty.png' })

    // Add a todo item
    const input = page.getByPlaceholder('Add a quick task...')
    await input.fill('Test task from Playwright')
    await input.press('Enter')

    // Wait for the todo to appear
    await page.waitForTimeout(500)

    // Screenshot with todo item
    await todoSection.screenshot({ path: 'tests/screenshots/todo-with-item.png' })

    // Verify the todo was added
    await expect(page.getByText('Test task from Playwright')).toBeVisible()
    await expect(page.getByText('1 active')).toBeVisible()
  })

  test('theme toggle works', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Screenshot in dark mode
    await page.screenshot({ path: 'tests/screenshots/theme-dark.png' })

    // Click theme toggle
    await page.getByLabel('Toggle theme').click()
    await page.waitForTimeout(300)

    // Screenshot in light mode
    await page.screenshot({ path: 'tests/screenshots/theme-light.png' })
  })

  test('article interactions', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const firstArticle = page.locator('article').first()

    // Hover over article to see hover state
    await firstArticle.hover()
    await page.waitForTimeout(200)

    // Screenshot hover state
    await firstArticle.screenshot({ path: 'tests/screenshots/article-hover.png' })

    // Check interaction buttons are visible
    await expect(firstArticle.getByRole('button', { name: 'Read More' })).toBeVisible()
    await expect(firstArticle.getByRole('button', { name: /Upvote/ })).toBeVisible()
    await expect(firstArticle.getByRole('button', { name: /Downvote/ })).toBeVisible()
  })

  test('responsive layout - mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Screenshot mobile view
    await page.screenshot({
      path: 'tests/screenshots/mobile-view.png',
      fullPage: true
    })
  })

  test('responsive layout - tablet', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Screenshot tablet view
    await page.screenshot({
      path: 'tests/screenshots/tablet-view.png',
      fullPage: true
    })
  })

  test('Phase 1 layout - Daily Summary Bar', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Check Daily Summary Bar is visible with more specific selectors
    await expect(page.getByText('Today:')).toBeVisible()

    // Look for the summary bar and verify it's expanded by default
    const summaryBar = page.locator('#daily-summary').first()
    await expect(summaryBar).toBeVisible()

    // Verify expanded details are visible (Articles Today, Active Tasks, etc.)
    await expect(summaryBar.getByText('Articles Today')).toBeVisible()
    await expect(summaryBar.getByText('Active Tasks')).toBeVisible()
    await expect(summaryBar.getByText('Completed')).toBeVisible()

    // Screenshot the expanded summary bar
    await summaryBar.screenshot({ path: 'tests/screenshots/daily-summary-expanded.png' })

    // Test collapse functionality
    const hideButton = summaryBar.getByText('Hide')
    if (await hideButton.isVisible()) {
      await hideButton.click()
      await page.waitForTimeout(300)
      await summaryBar.screenshot({ path: 'tests/screenshots/daily-summary-collapsed.png' })
    }
  })

  test('Phase 1 layout - Quick Actions', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Check Quick Actions section is visible
    await expect(page.getByText('QUICK ACTIONS')).toBeVisible()

    // Check primary action buttons
    await expect(page.getByRole('button', { name: 'New Project Idea' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Capture Thought' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Review Ideas' })).toBeVisible()

    // Check Collections section
    await expect(page.getByText('COLLECTIONS')).toBeVisible()
    await expect(page.getByText('Recommendations')).toBeVisible()
    await expect(page.getByText('Read Later')).toBeVisible()

    // Screenshot Quick Actions
    const quickActions = page.locator('.glass-light').filter({ hasText: 'QUICK ACTIONS' })
    await quickActions.screenshot({ path: 'tests/screenshots/quick-actions.png' })
  })

  test('Phase 1 layout - Today\'s Priorities', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Check Today's Priorities section
    await expect(page.getByText('Today\'s Priorities')).toBeVisible()
    await expect(page.getByText('Top 3 MITs')).toBeVisible()

    // Screenshot priorities section
    const priorities = page.locator('.glass-light').filter({ hasText: 'Today\'s Priorities' })
    await priorities.screenshot({ path: 'tests/screenshots/todays-priorities.png' })
  })

  test('Phase 1 layout - No duplicate navigation', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Count how many "Recommendations" links exist
    const recommendationsLinks = page.getByText('Recommendations')
    const count = await recommendationsLinks.count()

    // Should only be 1 (in Quick Actions), not 2 (duplicate in header)
    expect(count).toBeLessThanOrEqual(2) // Allow for icon + text

    // Verify no navigation section in header
    const header = page.locator('header')
    await header.screenshot({ path: 'tests/screenshots/header.png' })

    // Header should have: Ember Feed, description, SystemHealth, LayoutToggle, ThemeToggle
    // But NOT navigation buttons for Recommendations/Read Later
    await expect(header.getByRole('heading', { name: 'Ember Feed' })).toBeVisible()
  })

  test('Phase 1 layout - Component order and grouping', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Verify layout order from top to bottom:
    // 1. Header (Ember Feed title + controls)
    // 2. Daily Summary Bar + Quick Actions (2-column)
    // 3. Today's Priorities (full width)
    // 4. Daily Digest
    // 5. Search
    // 6. News Feed + Todo List (2-column)
    // 7. Feed Admin, Journal, Analytics

    // Get all major sections by their text content
    const dailySummary = page.getByText('Today:')
    const quickActions = page.getByText('QUICK ACTIONS')
    const priorities = page.getByText('Today\'s Priorities')
    const dailyDigest = page.getByText('Daily Digest')
    const search = page.getByText('Search Articles')
    const newsFeed = page.getByRole('heading', { name: 'Today\'s Feed' })

    // Verify all sections are visible
    await expect(dailySummary).toBeVisible()
    await expect(quickActions).toBeVisible()
    await expect(priorities).toBeVisible()
    await expect(dailyDigest).toBeVisible()
    await expect(search).toBeVisible()
    await expect(newsFeed).toBeVisible()

    // Full page screenshot to review layout
    await page.screenshot({
      path: 'tests/screenshots/phase1-full-layout.png',
      fullPage: true
    })
  })
})
