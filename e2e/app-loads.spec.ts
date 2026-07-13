import { expect, test } from '@playwright/test'

test('loads the ScrollSplice foundation and fixture summary', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle('ScrollSplice')
  await expect(
    page.getByRole('heading', { level: 1, name: 'ScrollSplice' }),
  ).toBeVisible()
  await expect(page.getByText('Fixture ready')).toBeVisible()
  await expect(page.getByRole('listitem')).toHaveCount(6)
})
