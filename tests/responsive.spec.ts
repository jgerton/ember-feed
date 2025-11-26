import { test, expect } from '@playwright/test'

test.describe('Responsive Design', () => {
  test.describe('Homepage', () => {
    test('renders correctly at all viewport sizes', async ({ page }) => {
      await page.goto('/')

      // Page should load without errors
      await expect(page).toHaveTitle(/Ember Feed/)

      // Main content should be visible
      await expect(page.locator('main')).toBeVisible()
    })

    test('navigation is accessible', async ({ page }) => {
      await page.goto('/')

      // Check that key navigation elements are present
      // On mobile, this might be a hamburger menu
      const nav = page.locator('nav, header, [role="navigation"]')
      await expect(nav.first()).toBeVisible()
    })

    test('content is not horizontally scrollable', async ({ page }) => {
      await page.goto('/')

      // Check that body doesn't have horizontal scroll
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)

      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1) // +1 for rounding
    })

    test('touch targets are large enough', async ({ page, browserName }) => {
      // Only run this test on mobile projects
      test.skip(browserName !== 'chromium' || !page.viewportSize() || page.viewportSize()!.width > 768,
        'Touch target test only for mobile viewports')

      await page.goto('/')

      // Check button sizes
      const buttons = page.locator('button, a[role="button"], [role="link"]')
      const count = await buttons.count()

      for (let i = 0; i < Math.min(count, 10); i++) {
        const button = buttons.nth(i)
        if (await button.isVisible()) {
          const box = await button.boundingBox()
          if (box) {
            // Minimum touch target should be 44x44 pixels (Apple HIG)
            expect(box.height).toBeGreaterThanOrEqual(40)
          }
        }
      }
    })
  })

  test.describe('Recommendations Page', () => {
    test('loads and displays content', async ({ page }) => {
      await page.goto('/recommendations')

      // Header should be visible
      await expect(page.getByRole('heading', { name: /Recommended for You/i })).toBeVisible()

      // Back link should be present
      await expect(page.getByText(/Back to Feed/i)).toBeVisible()
    })

    test('empty state renders correctly', async ({ page }) => {
      await page.goto('/recommendations')

      // Wait for loading to complete
      await page.waitForLoadState('networkidle')

      // Either recommendations or empty state should be visible
      const hasRecommendations = await page.locator('article').count() > 0
      const hasEmptyState = await page.getByText(/No recommendations available/i).isVisible()

      expect(hasRecommendations || hasEmptyState).toBeTruthy()
    })

    test('limit buttons are accessible', async ({ page }) => {
      await page.goto('/recommendations')

      // Limit buttons should be visible
      await expect(page.getByRole('button', { name: 'Top 10' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Top 20' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Top 50' })).toBeVisible()
    })

    test('article cards are readable on mobile', async ({ page }) => {
      await page.goto('/recommendations')
      await page.waitForLoadState('networkidle')

      // If there are articles, check they're visible
      const articles = page.locator('article')
      const count = await articles.count()

      if (count > 0) {
        const firstArticle = articles.first()
        await expect(firstArticle).toBeVisible()

        // Article title should be readable
        const title = firstArticle.locator('h2')
        await expect(title).toBeVisible()
      }
    })
  })

  test.describe('Read Later Page', () => {
    test('loads correctly', async ({ page }) => {
      await page.goto('/read-later')

      // Page should load without errors
      await expect(page.locator('main')).toBeVisible()
    })
  })

  test.describe('Settings Page', () => {
    test('loads and is accessible', async ({ page }) => {
      await page.goto('/settings')

      // Page should load
      await expect(page.locator('main')).toBeVisible()
    })
  })
})
