import { expect, test } from '@playwright/test'

test('creates, names, locks, positions, aligns, and duplicates a panel', async ({
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

  await page.getByRole('button', { name: 'Panel / shape' }).click()
  const shapeForm = page.locator('.shape-create-form')
  await expect(shapeForm).toBeVisible()
  await shapeForm.getByLabel('Name').fill('Opening panel')
  await shapeForm.getByLabel('Fill').fill('#f7f3ff')
  await shapeForm.getByLabel('Line').fill('#241b2e')
  await shapeForm.getByLabel('Width').fill('10')
  await shapeForm.getByLabel('Corners').fill('18')
  await shapeForm.getByRole('button', { name: 'Add' }).click()

  const management = page.getByTestId('selected-layer-management')
  await expect(management).toBeVisible()
  await expect(page.getByTestId('selection-status')).toContainText(
    'Opening panel',
  )

  const nameInput = management.getByLabel('Name')
  await nameInput.fill('Establishing panel')
  await nameInput.press('Enter')
  await expect(page.getByTestId('selection-status')).toContainText(
    'Establishing panel',
  )

  await management
    .getByRole('button', { name: 'Lock selection', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'Unlock Establishing panel' }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(
    page.getByRole('button', { name: 'Delete Establishing panel' }),
  ).toBeDisabled()
  await expect(page.getByTestId('editor-canvas')).toHaveAttribute(
    'data-resize-handle-count',
    '0',
  )
  await management
    .getByRole('button', { name: 'Unlock selection', exact: true })
    .click()

  await management.getByLabel('Selected element X').fill('30')
  await management.getByLabel('Selected element X').press('Enter')
  await management.getByLabel('Selected element Y').fill('100')
  await management.getByLabel('Selected element Y').press('Enter')
  await expect(page.getByTestId('selection-status')).toContainText('x 30')
  await expect(page.getByTestId('selection-status')).toContainText('y 100')

  await management.getByRole('button', { name: 'Right', exact: true }).click()
  const selectedWidth = Number(
    await page.getByTestId('selection-status').getAttribute('data-width'),
  )
  await expect(page.getByTestId('selection-status')).toHaveAttribute(
    'data-x',
    String(800 - selectedWidth),
  )

  await management.getByRole('button', { name: 'Duplicate' }).click()
  await expect(page.locator('[data-layer-id]')).toHaveCount(2)
  await expect(page.getByTestId('selection-status')).toContainText('copy')

  const canvas = page.getByTestId('editor-canvas')
  await canvas.focus()
  const xBeforeNudge = Number(
    await page.getByTestId('selection-status').getAttribute('data-x'),
  )
  await page.keyboard.press('ArrowLeft')
  await expect(page.getByTestId('selection-status')).toHaveAttribute(
    'data-x',
    String(xBeforeNudge - 1),
  )
  await page.keyboard.press('Shift+ArrowUp')

  await page.keyboard.press('Control+d')
  await expect(page.locator('[data-layer-id]')).toHaveCount(3)
  await page.keyboard.press('Delete')
  await expect(page.locator('[data-layer-id]')).toHaveCount(2)
})
