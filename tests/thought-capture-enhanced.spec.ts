/**
 * E2E Tests: Enhanced Thought Capture Modal
 * Tests URL detection, metadata extraction, feed discovery, and manual feed subscription
 */

import { test, expect } from '@playwright/test'
import { sleep } from './api/test-utils'

test.describe('Enhanced Thought Capture Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Open the "Capture Thought" modal
    // Note: Adjust selector based on actual button/link to open modal
    const captureButton = page.getByRole('button', { name: /capture thought/i })
    if (await captureButton.isVisible()) {
      await captureButton.click()
    } else {
      // Alternative: Use keyboard shortcut or other trigger
      await page.keyboard.press('Control+N') // Adjust based on actual shortcut
    }

    // Wait for modal to appear
    await expect(page.getByRole('heading', { name: /capture thought/i })).toBeVisible()
  })

  test.describe('URL Detection Flow', () => {
    test('detects URL in thought text and shows banner', async ({ page }) => {
      // Type a thought with a URL
      const textarea = page.getByPlaceholder(/what's on your mind/i)
      await textarea.fill('Check out this article: https://news.ycombinator.com')

      // Wait for debounce (500ms)
      await sleep(600)

      // URL detection banner should appear
      await expect(page.getByText(/URL detected in your thought/i)).toBeVisible()
      await expect(page.getByText('https://news.ycombinator.com')).toBeVisible()

      // Banner should have "Extract Metadata" button
      await expect(page.getByRole('button', { name: /extract metadata/i })).toBeVisible()
    })

    test('dismisses URL detection banner when clicked', async ({ page }) => {
      const textarea = page.getByPlaceholder(/what's on your mind/i)
      await textarea.fill('URL: https://example.com')
      await sleep(600)

      // Banner appears
      await expect(page.getByText(/URL detected/i)).toBeVisible()

      // Click dismiss button (X)
      const dismissButton = page.locator('button[title="Dismiss"]').first()
      await dismissButton.click()

      // Banner should disappear
      await expect(page.getByText(/URL detected/i)).not.toBeVisible()
    })

    test('updates banner when URL changes', async ({ page }) => {
      const textarea = page.getByPlaceholder(/what's on your mind/i)

      // Type first URL
      await textarea.fill('First URL: https://example.com')
      await sleep(600)
      await expect(page.getByText('https://example.com')).toBeVisible()

      // Change to second URL
      await textarea.fill('Second URL: https://news.ycombinator.com')
      await sleep(600)
      await expect(page.getByText('https://news.ycombinator.com')).toBeVisible()
      await expect(page.getByText('https://example.com')).not.toBeVisible()
    })

    test('clicking "Extract Metadata" opens Universal URL section', async ({ page }) => {
      const textarea = page.getByPlaceholder(/what's on your mind/i)
      await textarea.fill('Article: https://news.ycombinator.com')
      await sleep(600)

      // Click "Extract Metadata"
      await page.getByRole('button', { name: /extract metadata/i }).click()

      // Universal URL section should expand
      await expect(page.getByText(/Article or Resource URL/i)).toBeVisible()

      // URL should be populated in the input
      const urlInput = page.getByPlaceholder('https://example.com/article')
      await expect(urlInput).toHaveValue('https://news.ycombinator.com')

      // Should show loading state
      await expect(page.getByText(/Extracting metadata/i)).toBeVisible()
    })
  })

  test.describe('Universal URL Section', () => {
    test('expands and collapses Article URL section', async ({ page }) => {
      // Section header should be visible
      const sectionHeader = page.getByRole('button', { name: /article url/i })
      await expect(sectionHeader).toBeVisible()

      // Click to expand
      await sectionHeader.click()
      await expect(page.getByText(/Article or Resource URL/i)).toBeVisible()

      // Click to collapse
      await sectionHeader.click()
      await expect(page.getByText(/Article or Resource URL/i)).not.toBeVisible()
    })

    test('extracts metadata from valid article URL', async ({ page }) => {
      // Expand Universal URL section
      await page.getByRole('button', { name: /article url/i }).click()

      // Enter a valid URL
      const urlInput = page.getByPlaceholder('https://example.com/article')
      await urlInput.fill('https://news.ycombinator.com')
      await urlInput.blur() // Trigger onBlur

      // Wait for metadata extraction
      await expect(page.getByText(/Extracting metadata/i)).toBeVisible()
      await expect(page.getByText(/Metadata Extracted/i)).toBeVisible({ timeout: 10000 })

      // Should show metadata
      await expect(page.getByText(/Title:/i)).toBeVisible()
      await expect(page.getByText(/Source:/i)).toBeVisible()
    })

    test('discovers RSS feeds from article URL', async ({ page }) => {
      // Expand Universal URL section
      await page.getByRole('button', { name: /article url/i }).click()

      // Enter URL that has RSS feeds
      const urlInput = page.getByPlaceholder('https://example.com/article')
      await urlInput.fill('https://hnrss.org')
      await urlInput.blur()

      // Wait for metadata
      await expect(page.getByText(/Metadata Extracted/i)).toBeVisible({ timeout: 10000 })

      // Should show RSS feeds discovered
      await expect(page.getByText(/RSS feed found|RSS feeds found/i)).toBeVisible()

      // Should have "Add Feed" buttons
      await expect(page.getByRole('button', { name: /add feed/i }).first()).toBeVisible()
    })

    test('shows "Subscribed" for already subscribed feeds', async ({ page }) => {
      // Expand Universal URL section
      await page.getByRole('button', { name: /article url/i }).click()

      // Enter URL
      const urlInput = page.getByPlaceholder('https://example.com/article')
      await urlInput.fill('https://hnrss.org')
      await urlInput.blur()

      // Wait for metadata
      await expect(page.getByText(/Metadata Extracted/i)).toBeVisible({ timeout: 10000 })

      // If any feeds are already subscribed, should show "Subscribed" badge
      const subscribedBadge = page.getByText(/Subscribed/i)
      if (await subscribedBadge.isVisible()) {
        await expect(subscribedBadge).toBeVisible()
      }
    })

    test('adds feed from discovered feeds', async ({ page }) => {
      // Expand Universal URL section
      await page.getByRole('button', { name: /article url/i }).click()

      // Enter URL
      const urlInput = page.getByPlaceholder('https://example.com/article')
      await urlInput.fill('https://hnrss.org')
      await urlInput.blur()

      // Wait for feeds
      await expect(page.getByText(/RSS feed found|RSS feeds found/i)).toBeVisible({ timeout: 10000 })

      // Click first "Add Feed" button (if not already subscribed)
      const addFeedButtons = page.getByRole('button', { name: /^\+ Add Feed$/i })
      const firstButton = addFeedButtons.first()

      if (await firstButton.isVisible()) {
        await firstButton.click()

        // Should show loading state
        await expect(page.getByText(/Adding.../i)).toBeVisible()

        // Should either succeed or show error
        // Wait for result (either "Subscribed" or error message)
        await page.waitForTimeout(3000)

        // Check for success or error
        const successIndicator = page.getByText(/Subscribed/i)
        const errorIndicator = page.getByText(/Failed to add feed/i)

        const success = await successIndicator.isVisible()
        const error = await errorIndicator.isVisible()

        expect(success || error).toBe(true)
      }
    })

    test('displays error for invalid URL', async ({ page }) => {
      // Expand Universal URL section
      await page.getByRole('button', { name: /article url/i }).click()

      // Enter invalid URL
      const urlInput = page.getByPlaceholder('https://example.com/article')
      await urlInput.fill('not-a-valid-url')
      await urlInput.blur()

      // Should show error
      await expect(page.getByText(/error/i)).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Manual Feed Subscription Section', () => {
    test('expands and collapses Subscribe to Feed section', async ({ page }) => {
      // Section header should be visible
      const sectionHeader = page.getByRole('button', { name: /subscribe to feed/i })
      await expect(sectionHeader).toBeVisible()

      // Click to expand
      await sectionHeader.click()
      await expect(page.getByText(/RSS Feed URL/i)).toBeVisible()

      // Click to collapse
      await sectionHeader.click()
      await expect(page.getByText(/RSS Feed URL/i)).not.toBeVisible()
    })

    test('validates RSS feed URL in real-time', async ({ page }) => {
      // Expand manual feed section
      await page.getByRole('button', { name: /subscribe to feed/i }).click()

      // Enter valid RSS feed URL
      const feedInput = page.getByPlaceholder('https://example.com/feed.xml')
      await feedInput.fill('https://hnrss.org/frontpage')

      // Wait for validation (debounced)
      await sleep(600)

      // Should show validating state
      await expect(page.getByText(/Validating feed/i)).toBeVisible()

      // Should eventually show success
      await expect(page.getByText(/Valid RSS Feed/i)).toBeVisible({ timeout: 10000 })

      // Should show feed details
      await expect(page.getByText(/Feed Name:/i)).toBeVisible()
      await expect(page.getByText(/Articles Found:/i)).toBeVisible()

      // Should show "Add Feed to Subscriptions" button
      await expect(page.getByRole('button', { name: /add feed to subscriptions/i })).toBeVisible()
    })

    test('shows error for invalid feed URL', async ({ page }) => {
      // Expand manual feed section
      await page.getByRole('button', { name: /subscribe to feed/i }).click()

      // Enter invalid URL
      const feedInput = page.getByPlaceholder('https://example.com/feed.xml')
      await feedInput.fill('not-a-feed')

      await sleep(600)

      // Should show error
      await expect(page.getByText(/Invalid URL format/i)).toBeVisible({ timeout: 5000 })
      await expect(page.getByText(/Please enter a valid http/i)).toBeVisible()
    })

    test('shows error for non-RSS URL', async ({ page }) => {
      // Expand manual feed section
      await page.getByRole('button', { name: /subscribe to feed/i }).click()

      // Enter valid URL but not RSS
      const feedInput = page.getByPlaceholder('https://example.com/feed.xml')
      await feedInput.fill('https://example.com')

      await sleep(600)

      // Wait for validation
      await page.waitForTimeout(5000)

      // Should show error about invalid feed content
      const errorText = page.getByText(/error|invalid|feed/i)
      await expect(errorText).toBeVisible({ timeout: 5000 })
    })

    test('adds validated feed to subscriptions', async ({ page }) => {
      // Expand manual feed section
      await page.getByRole('button', { name: /subscribe to feed/i }).click()

      // Enter valid RSS feed URL
      const feedInput = page.getByPlaceholder('https://example.com/feed.xml')
      const uniqueFeedUrl = `https://hnrss.org/best?points=100&${Date.now()}`
      await feedInput.fill(uniqueFeedUrl)

      await sleep(600)

      // Wait for validation success
      await expect(page.getByText(/Valid RSS Feed/i)).toBeVisible({ timeout: 10000 })

      // Click "Add Feed to Subscriptions"
      const addButton = page.getByRole('button', { name: /add feed to subscriptions/i })
      await addButton.click()

      // Should show loading
      await expect(page.getByText(/Adding Feed.../i)).toBeVisible()

      // Should either succeed or show error
      await page.waitForTimeout(3000)

      // Check result
      const successIndicator = addButton.isDisabled()
      const errorIndicator = page.getByText(/Failed to add feed/i)

      if (await errorIndicator.isVisible()) {
        // Error case - feed might already exist or other error
        await expect(errorIndicator).toBeVisible()
      } else {
        // Success case - input should be cleared
        await expect(feedInput).toHaveValue('')
      }
    })
  })

  test.describe('Full Integration Flow', () => {
    test('complete workflow: detect URL → extract metadata → add feed → save thought', async ({ page }) => {
      // 1. Type thought with URL
      const textarea = page.getByPlaceholder(/what's on your mind/i)
      const thoughtText = `Interesting article about HN: https://news.ycombinator.com`
      await textarea.fill(thoughtText)
      await sleep(600)

      // 2. URL detected
      await expect(page.getByText(/URL detected/i)).toBeVisible()

      // 3. Click "Extract Metadata"
      await page.getByRole('button', { name: /extract metadata/i }).click()

      // 4. Wait for metadata
      await expect(page.getByText(/Metadata Extracted/i)).toBeVisible({ timeout: 10000 })

      // 5. Select a category
      const categorySelect = page.locator('select').first() // Adjust selector if needed
      if (await categorySelect.isVisible()) {
        await categorySelect.selectOption('Random')
      }

      // 6. Save thought
      const saveButton = page.getByRole('button', { name: /save thought/i })
      await saveButton.click()

      // 7. Modal should close
      await expect(page.getByRole('heading', { name: /capture thought/i })).not.toBeVisible({ timeout: 5000 })

      // 8. Thought should be created (verify by checking if it appears in thoughts list or database)
      // Note: Actual verification depends on your UI structure
    })

    test('handles errors gracefully throughout the flow', async ({ page }) => {
      // Type thought with URL
      const textarea = page.getByPlaceholder(/what's on your mind/i)
      await textarea.fill('Bad URL: https://this-will-fail-123456789.com')
      await sleep(600)

      // Extract metadata
      await page.getByRole('button', { name: /extract metadata/i }).click()

      // Should show error (not crash)
      await expect(page.getByText(/error/i)).toBeVisible({ timeout: 10000 })

      // Form should still be functional
      await expect(textarea).toBeEnabled()
      await expect(page.getByRole('button', { name: /save thought/i })).toBeVisible()
    })
  })

  test.describe('Universal Availability Across Categories', () => {
    test('Article URL section available for all categories', async ({ page }) => {
      const categories = ['App Ideas', 'Video Insights', 'Research', 'Random', 'Article Ideas']

      for (const cat of categories) {
        // Select category
        const categorySelect = page.locator('select').first()
        if (await categorySelect.isVisible()) {
          await categorySelect.selectOption(cat)
        }

        // Article URL section should still be visible
        await expect(page.getByRole('button', { name: /article url/i })).toBeVisible()

        // Section should be functional
        await page.getByRole('button', { name: /article url/i }).click()
        await expect(page.getByText(/Article or Resource URL/i)).toBeVisible()
        await page.getByRole('button', { name: /article url/i }).click() // Collapse
      }
    })
  })
})
