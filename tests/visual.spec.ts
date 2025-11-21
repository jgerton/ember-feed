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
})
