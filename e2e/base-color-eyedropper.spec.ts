import { expect, test } from '@playwright/test'

test('both base color controls provide a working canvas sampler fallback', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'EyeDropper', {
      configurable: true,
      value: undefined,
    })
  })
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

  const namedSamplers = page.getByRole('button', {
    name: 'Pick base color from canvas',
  })
  const samplers = page.locator('.base-color-eyedropper')
  await expect(namedSamplers).toHaveCount(2)

  await samplers.nth(0).click()
  await expect(page.getByTestId('editor-canvas')).toHaveAttribute(
    'data-color-sampler-active',
    'true',
  )
  await expect(
    page.getByRole('button', { name: 'Cancel canvas color sampling' }),
  ).toHaveCount(2)

  await samplers.nth(1).click()
  await expect(page.getByTestId('editor-canvas')).toHaveAttribute(
    'data-color-sampler-active',
    'false',
  )

  await samplers.nth(1).click()
  const sceneCanvas = page.locator('.konvajs-content canvas').first()
  await sceneCanvas.evaluate((canvas: HTMLCanvasElement) => {
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas context unavailable')
    context.fillStyle = '#1a7f5a'
    context.fillRect(0, 0, canvas.width, canvas.height)
  })
  const canvasBox = await sceneCanvas.boundingBox()
  expect(canvasBox).not.toBeNull()
  await page.mouse.click(
    canvasBox!.x + canvasBox!.width / 2,
    canvasBox!.y + canvasBox!.height / 2,
  )

  await expect(page.getByLabel('Canvas base color')).toHaveValue('#1a7f5a')
  await expect(
    page.getByRole('textbox', { name: 'Base color', exact: true }),
  ).toHaveValue('#1a7f5a')
  await expect(page.getByTestId('editor-canvas')).toHaveAttribute(
    'data-color-sampler-active',
    'false',
  )
})
