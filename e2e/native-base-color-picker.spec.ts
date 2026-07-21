import { expect, test } from '@playwright/test'

test('keeps the native base color inputs stable and synchronized', async ({
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

  await page
    .getByRole('button', { name: 'Background composition group' })
    .click()

  const canvasInput = page.getByRole('textbox', {
    name: 'Canvas base color',
  })
  const inspectorInput = page.getByRole('textbox', {
    name: 'Base color',
    exact: true,
  })

  await expect(canvasInput).toHaveValue('#ffffff')
  await expect(inspectorInput).toHaveValue('#ffffff')
  await expect(
    page.getByRole('button', { name: /Pick base color from canvas/i }),
  ).toHaveCount(0)

  await canvasInput.evaluate((input) => {
    input.dataset.nativePickerNode = 'stable'
  })
  await canvasInput.fill('#275d88')

  await expect(canvasInput).toHaveValue('#275d88')
  await expect(inspectorInput).toHaveValue('#275d88')
  await expect(canvasInput).toHaveAttribute('data-native-picker-node', 'stable')

  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(canvasInput).toHaveValue('#ffffff')
  await expect(inspectorInput).toHaveValue('#ffffff')
})
