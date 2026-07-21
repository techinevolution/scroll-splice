import { expect, test, type Page } from '@playwright/test'

async function editSelectedTextOnCanvas(page: Page, wording: string) {
  const canvas = page.getByTestId('editor-canvas')
  await expect(canvas).toHaveAttribute('data-selected-text', 'Your text')
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

  await page.mouse.dblclick(
    box!.x + (geometry.x - geometry.viewportX + geometry.width / 2) * scale,
    box!.y + (geometry.y - geometry.viewportY + geometry.height / 2) * scale,
  )

  const editor = page.getByTestId('canvas-text-editor')
  await expect(editor).toBeVisible()
  const editorBox = await editor.boundingBox()
  expect(editorBox).not.toBeNull()
  expect(editorBox!.x).toBeCloseTo(
    box!.x + (geometry.x - geometry.viewportX) * scale,
    0,
  )
  expect(editorBox!.y).toBeCloseTo(
    box!.y + (geometry.y - geometry.viewportY) * scale,
    0,
  )
  expect(editorBox!.width).toBeCloseTo(geometry.width * scale, 0)
  expect(editorBox!.height).toBeCloseTo(geometry.height * scale, 0)
  await editor.fill(wording)
  await expect(editor).toHaveValue(wording)
  await editor.press('ControlOrMeta+Enter')
  await expect(editor).toHaveCount(0)
  await expect(canvas).toHaveAttribute('data-selected-text', wording)
}

test('moves selected text and returns from editing without deselecting it', async ({
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

  await page.getByRole('button', { name: /^Add text/ }).click()

  const canvas = page.getByTestId('editor-canvas')
  const canvasBox = await canvas.boundingBox()
  expect(canvasBox).not.toBeNull()

  const geometry = await canvas.evaluate((element) => ({
    episodeWidth: 800,
    viewportX: Number(element.getAttribute('data-viewport-x')),
    viewportY: Number(element.getAttribute('data-viewport-y')),
    x: Number(element.getAttribute('data-selected-x')),
    y: Number(element.getAttribute('data-selected-y')),
    width: Number(element.getAttribute('data-selected-width')),
    height: Number(element.getAttribute('data-selected-height')),
  }))
  const scale = canvasBox!.width / geometry.episodeWidth

  await page.mouse.click(
    canvasBox!.x +
      (geometry.x - geometry.viewportX + geometry.width / 2) * scale,
    canvasBox!.y +
      (geometry.y - geometry.viewportY + geometry.height / 2) * scale,
  )

  const editor = page.getByTestId('canvas-text-editor')
  await expect(editor).toHaveCount(0)
  await expect(page.getByTestId('selected-layer-management')).toHaveCount(0)

  await page.mouse.move(
    canvasBox!.x +
      (geometry.x - geometry.viewportX + geometry.width / 2) * scale,
    canvasBox!.y +
      (geometry.y - geometry.viewportY + geometry.height / 2) * scale,
  )
  await page.mouse.down()
  await page.mouse.move(
    canvasBox!.x +
      (geometry.x - geometry.viewportX + geometry.width / 2 + 30) * scale,
    canvasBox!.y +
      (geometry.y - geometry.viewportY + geometry.height / 2 + 20) * scale,
  )
  await page.mouse.up()

  const movedX = Number(await canvas.getAttribute('data-selected-x'))
  const movedY = Number(await canvas.getAttribute('data-selected-y'))
  expect(movedX).toBeGreaterThan(geometry.x)
  expect(movedY).toBeGreaterThan(geometry.y)

  await page.mouse.dblclick(
    canvasBox!.x +
      (movedX - geometry.viewportX + geometry.width / 2) * scale,
    canvasBox!.y +
      (movedY - geometry.viewportY + geometry.height / 2) * scale,
  )
  await expect(editor).toBeVisible()
  await editor.fill('Resize this text')
  await expect(editor).toHaveValue('Resize this text')

  await page.mouse.click(canvasBox!.x + 24, canvasBox!.y + 24)

  await expect(editor).toHaveCount(0)
  await expect(canvas).not.toHaveAttribute('data-selected-element-id', '')
  await expect(canvas).toHaveAttribute(
    'data-selected-text',
    'Resize this text',
  )
  await expect(canvas).toHaveAttribute('data-resize-handle-count', '4')

  await page.mouse.move(
    canvasBox!.x +
      (movedX - geometry.viewportX + geometry.width) * scale,
    canvasBox!.y +
      (movedY - geometry.viewportY + geometry.height) * scale,
  )
  await page.mouse.down()
  await page.mouse.move(
    canvasBox!.x +
      (movedX - geometry.viewportX + geometry.width + 40) * scale,
    canvasBox!.y +
      (movedY - geometry.viewportY + geometry.height + 20) * scale,
  )
  await page.mouse.up()

  await expect
    .poll(async () => Number(await canvas.getAttribute('data-selected-width')))
    .toBeGreaterThan(geometry.width)
})

for (const testCase of [
  {
    group: 'Background',
    plane: 'Background plane 2',
    wording: 'Background wording',
  },
  { group: 'Content', wording: 'Content wording' },
  { group: 'Foreground', wording: 'Foreground wording' },
] as const) {
  test(`edits canvas text directly in ${testCase.group}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')
    await page.evaluate(() => window.localStorage.clear())
    await page.reload()
    await expect(page.getByTestId('editor-canvas')).toHaveAttribute(
      'data-ready',
      'true',
    )

    await page
      .getByRole('button', {
        name: `${testCase.group} composition group`,
      })
      .click()
    if ('plane' in testCase) {
      await page
        .getByRole('button', { name: testCase.plane, exact: true })
        .click()
    }
    await page.getByRole('button', { name: /^Add text/ }).click()
    await editSelectedTextOnCanvas(page, testCase.wording)
  })
}
