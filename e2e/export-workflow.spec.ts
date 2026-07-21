import { expect, test } from '@playwright/test'

test('reviews provisional cuts, preflights, and downloads local episode images', async ({
  page,
}) => {
  test.setTimeout(60_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await expect(page.getByTestId('editor-canvas')).toHaveAttribute(
    'data-ready',
    'true',
  )

  await page.getByRole('button', { name: 'File', exact: true }).click()
  await page
    .getByRole('menuitem', { name: 'Export Episode Images…', exact: true })
    .click()

  const dialog = page.getByTestId('export-dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Provisional WEBTOON profile')
  await expect(dialog).toContainText('Upload remains a manual creator step')

  const firstCut = dialog.getByLabel('Cut 1 position')
  await expect(firstCut).toHaveValue('1280')
  await firstCut.fill('900')
  await dialog.getByTestId('render-slices').click()
  await expect(
    dialog.getByRole('heading', { name: 'Preflight: needs attention' }),
  ).toBeVisible({ timeout: 20_000 })
  await expect(dialog).toContainText('taller than the observed 1280px limit')

  await dialog.getByRole('button', { name: 'Reset cuts' }).click()
  await dialog.getByTestId('render-slices').click()
  await expect(
    dialog.getByRole('heading', {
      name: 'Preflight: passes observed limits',
    }),
  ).toBeVisible({ timeout: 20_000 })
  await expect(dialog.getByRole('heading', { name: 'Sliced files' })).toBeVisible()

  const sliceDownload = page.waitForEvent('download')
  await dialog.getByRole('button', { name: 'Download', exact: true }).first().click()
  await expect((await sliceDownload).suggestedFilename()).toMatch(/001\.png$/)

  await dialog.getByLabel('Format').selectOption('image/jpeg')
  await expect(dialog.getByLabel(/JPEG quality/)).toBeEnabled()
  await dialog.getByRole('button', { name: 'Render Tall Master' }).click()
  await expect(
    dialog.getByRole('heading', { name: 'Tall Master' }),
  ).toBeVisible({ timeout: 20_000 })

  const tallDownload = page.waitForEvent('download')
  await dialog.getByRole('button', { name: 'Download tall master' }).click()
  await expect((await tallDownload).suggestedFilename()).toMatch(/Tall\.jpg$/)
})
