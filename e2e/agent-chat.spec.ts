import { expect, test } from '@playwright/test'

test('opens left over the canvas and keeps local project messages', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')

  const trigger = page.getByRole('button', {
    name: 'Open ScrollSplice agent chat',
  })
  const inspector = page.getByRole('complementary', {
    name: 'Episode overview and layers',
  })

  await trigger.click()

  const panel = page.getByRole('region', { name: 'ScrollSplice agent chat' })
  await expect(panel).toBeVisible()
  await expect(panel).toContainText('OpenAI not connected')

  const [panelBounds, inspectorBounds, headerBounds] = await Promise.all([
    panel.boundingBox(),
    inspector.boundingBox(),
    page.locator('.app-header').boundingBox(),
  ])

  if (!panelBounds || !inspectorBounds || !headerBounds) {
    throw new Error('Chat, header, and inspector need visible bounds.')
  }

  expect(panelBounds.x + panelBounds.width).toBeLessThanOrEqual(
    inspectorBounds.x,
  )
  expect(panelBounds.y).toBeGreaterThanOrEqual(headerBounds.y + headerBounds.height)

  await page
    .getByRole('textbox', { name: 'Message about this episode' })
    .fill('Add a quiet panel after the rooftop scene.')
  await page.getByRole('button', { name: 'Save message' }).click()
  await expect(panel.getByText('Add a quiet panel after the rooftop scene.')).toBeVisible()

  await page.getByRole('button', { name: 'Close agent chat' }).click()
  await expect(panel).toBeHidden()
  await page.getByRole('button', { name: 'Open ScrollSplice agent chat' }).click()
  await expect(panel.getByText('Add a quiet panel after the rooftop scene.')).toBeVisible()

  await page.reload()
  await page.getByRole('button', { name: 'Open ScrollSplice agent chat' }).click()
  await expect(
    page.getByRole('region', { name: 'ScrollSplice agent chat' }).getByText(
      'Add a quiet panel after the rooftop scene.',
    ),
  ).toBeVisible()

  await page.setViewportSize({ width: 1024, height: 768 })
  const [narrowPanelBounds, narrowInspectorBounds] = await Promise.all([
    page.getByRole('region', { name: 'ScrollSplice agent chat' }).boundingBox(),
    page
      .getByRole('complementary', { name: 'Episode overview and layers' })
      .boundingBox(),
  ])

  if (!narrowPanelBounds || !narrowInspectorBounds) {
    throw new Error('Responsive chat and inspector need visible bounds.')
  }

  expect(narrowPanelBounds.x + narrowPanelBounds.width).toBeLessThanOrEqual(
    narrowInspectorBounds.x,
  )
})
