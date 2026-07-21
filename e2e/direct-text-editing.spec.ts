import { expect, test, type Page } from '@playwright/test'

async function editSelectedTextOnCanvas(page: Page, wording: string) {
  const canvas = page.getByTestId('editor-canvas')
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()

  const geometry = await canvas.evaluate((element) => ({
    episodeWidth: 800,
    viewportX: Number(element.getAttribute('data-viewport-x')),
    viewportY: Number(element.getAttribute('data-viewport-y')),
    x: Number(element.getAttribute('data-selected-x')),
    y: Number(element.getAttribute('data-selected-y')),
    width: Number(element.getAttribute('data-selected-width')),
    height: Number(element.getAttribute('data-selected-height')),
  }))
  const scale = box!.width / geometry.episodeWidth

  await page.mouse.click(
    box!.x + (geometry.x - geometry.viewportX + geometry.width / 2) * scale,
    box!.y + (geometry.y - geometry.viewportY + geometry.height / 2) * scale,
  )

  const editor = page.getByTestId('canvas-text-editor')
  await expect(editor).toBeVisible()
  await editor.fill(wording)
  await editor.press('ControlOrMeta+Enter')
  await expect(editor).toHaveCount(0)

  await page.mouse.dblclick(
    box!.x + (geometry.x - geometry.viewportX + geometry.width / 2) * scale,
    box!.y + (geometry.y - geometry.viewportY + geometry.height / 2) * scale,
  )
  await expect(editor).toHaveValue(wording)
  await editor.press('Escape')
}

test('edits canvas text directly in every composition group', async ({
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
  await page
    .getByRole('button', { name: 'Background plane 2', exact: true })
    .click()
  await page.getByRole('button', { name: /^Add text/ }).click()
  await editSelectedTextOnCanvas(page, 'Background wording')

  await page
    .getByRole('button', { name: 'Content composition group' })
    .click()
  await page.getByRole('button', { name: /^Add text/ }).click()
  await editSelectedTextOnCanvas(page, 'Content wording')

  await page
    .getByRole('button', { name: 'Foreground composition group' })
    .click()
  await page.getByRole('button', { name: /^Add text/ }).click()
  await editSelectedTextOnCanvas(page, 'Foreground wording')
})
