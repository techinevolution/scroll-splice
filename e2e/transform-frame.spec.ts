import { expect, test } from '@playwright/test'

test('rotates, flips, crops, masks, and frames an image consistently', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await expect(page.getByTestId('editor-canvas')).toHaveAttribute(
    'data-ready',
    'true',
  )

  await page.getByRole('button', { name: 'File', exact: true }).click()
  await page.getByRole('menuitem', { name: 'New Episode' }).click()
  await page.getByRole('button', { name: 'View', exact: true }).click()
  await page
    .getByRole('menuitem', { name: 'Show Details Bar', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Speech Balloons', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Add Oval balloon', exact: true })
    .click()

  const canvas = page.getByTestId('editor-canvas')
  const appearance = page.getByTestId('selected-appearance-controls')
  const management = page.getByTestId('selected-layer-management')
  const rotation = appearance.getByLabel('Selected element rotation degrees')

  await rotation.fill('45')
  await rotation.press('Enter')
  await appearance
    .getByRole('button', { name: 'Flip selected element horizontally' })
    .click()
  await expect(
    management.getByLabel('Selected element canvas placement'),
  ).toHaveValue('bleed')
  await management.getByLabel('Selected element X').fill('-80')
  await management.getByLabel('Selected element X').press('Enter')
  await expect(page.getByTestId('selection-status')).toHaveAttribute(
    'data-x',
    '-80',
  )
  await appearance
    .getByLabel('Selected image presentation')
    .selectOption('cover')

  const focusX = appearance.getByLabel('Image crop horizontal focus percent')
  await focusX.fill('25')
  await focusX.press('Enter')
  const cropZoom = appearance.getByLabel('Image crop zoom')
  await cropZoom.fill('2')
  await cropZoom.press('Enter')
  await appearance.getByLabel('Selected image mask').selectOption('slant-left')
  await appearance.getByLabel('Show selected image frame border').check()

  await expect(canvas).toHaveAttribute('data-selected-rotation', '45')
  await expect(canvas).toHaveAttribute('data-selected-flip-x', 'true')
  await expect(canvas).toHaveAttribute('data-selected-overflow', 'bleed')
  await expect(canvas).toHaveAttribute(
    'data-selected-image-presentation',
    'cover',
  )
  await expect(canvas).toHaveAttribute('data-selected-image-mask', 'polygon')

  const minimapImage = page
    .getByTestId('minimap')
    .locator('[data-image-presentation="cover"]')
  await expect(minimapImage).toHaveAttribute('data-image-mask', 'polygon')
  await expect(
    page.getByTestId('minimap').locator('[data-rotation="45"]'),
  ).toBeVisible()

  await page.getByRole('button', { name: 'View', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Reader Preview' }).click()
  const readerElement = page
    .getByTestId('reader-preview')
    .locator('[data-reader-element-type="image"]')
  await expect(readerElement).toHaveAttribute('data-rotation', '45')
  await expect(
    readerElement.locator('[data-reader-image-presentation="cover"]'),
  ).toHaveAttribute('data-reader-image-mask', 'polygon')
})
