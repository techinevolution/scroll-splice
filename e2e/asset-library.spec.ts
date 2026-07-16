import { Buffer } from 'node:buffer'
import { deflateSync } from 'node:zlib'

import { expect, test, type Page } from '@playwright/test'

async function readLogicalCanvasPixel(
  page: Page,
  logicalX: number,
  logicalY: number,
): Promise<string> {
  const sceneCanvas = page.getByTestId('editor-canvas').locator('canvas').first()

  return sceneCanvas.evaluate(
    (canvas, point) => {
      const context = canvas.getContext('2d')

      if (!context || canvas.width < 100) {
        return 'not-ready'
      }

      const logicalScale = canvas.width / 800
      const pixel = context.getImageData(
        Math.round(point.x * logicalScale),
        Math.round(point.y * logicalScale),
        1,
        1,
      ).data

      return `${pixel[0]},${pixel[1]},${pixel[2]},${pixel[3]}`
    },
    { x: logicalX, y: logicalY },
  )
}

type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light'

function expectedBlendChannel(
  mode: BlendMode,
  backdropByte: number,
  sourceByte: number,
): number {
  const backdrop = backdropByte / 255
  const source = sourceByte / 255
  let result: number

  if (mode === 'normal') {
    result = source
  } else if (mode === 'multiply') {
    result = backdrop * source
  } else if (mode === 'screen') {
    result = backdrop + source - backdrop * source
  } else if (mode === 'overlay') {
    result =
      backdrop <= 0.5
        ? 2 * backdrop * source
        : 1 - 2 * (1 - backdrop) * (1 - source)
  } else if (source <= 0.5) {
    result =
      backdrop -
      (1 - 2 * source) * backdrop * (1 - backdrop)
  } else {
    const backdropCurve =
      backdrop <= 0.25
        ? ((16 * backdrop - 12) * backdrop + 4) * backdrop
        : Math.sqrt(backdrop)
    result = backdrop + (2 * source - 1) * (backdropCurve - backdrop)
  }

  return Math.round(result * 255)
}

function expectedBlendPixel(
  mode: BlendMode,
  backdrop: readonly [number, number, number],
  source: readonly [number, number, number],
): readonly [number, number, number] {
  return [
    expectedBlendChannel(mode, backdrop[0], source[0]),
    expectedBlendChannel(mode, backdrop[1], source[1]),
    expectedBlendChannel(mode, backdrop[2], source[2]),
  ]
}

async function expectLogicalCanvasBlendPixel(
  page: Page,
  mode: BlendMode,
  logicalX: number,
  logicalY: number,
  backdrop: readonly [number, number, number],
  source: readonly [number, number, number],
) {
  const expected = expectedBlendPixel(mode, backdrop, source)

  await expect
    .poll(async () => {
      const actual = (await readLogicalCanvasPixel(page, logicalX, logicalY))
        .split(',')
        .slice(0, 3)
        .map(Number)

      return Math.max(
        ...expected.map((channel, index) =>
          Math.abs(channel - (actual[index] ?? Number.NaN)),
        ),
      )
    })
    .toBeLessThanOrEqual(2)
}

function calculateCrc32(bytes: Uint8Array): number {
  let crc = 0xffffffff

  for (const byte of bytes) {
    crc ^= byte

    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }

  return (crc ^ 0xffffffff) >>> 0
}

function createPngChunk(type: string, data: Buffer): Buffer {
  const typeBytes = Buffer.from(type, 'ascii')
  const length = Buffer.alloc(4)
  const checksum = Buffer.alloc(4)

  length.writeUInt32BE(data.length)
  checksum.writeUInt32BE(calculateCrc32(Buffer.concat([typeBytes, data])))

  return Buffer.concat([length, typeBytes, data, checksum])
}

function createTransparentPng(width = 240, height = 160): Buffer {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8
  header[9] = 6

  const rowLength = width * 4 + 1
  const pixels = Buffer.alloc(rowLength * height)

  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * rowLength
    pixels[rowOffset] = 0

    for (let x = 0; x < width; x += 1) {
      const pixelOffset = rowOffset + 1 + x * 4
      const isTransparent = x >= width / 2

      pixels[pixelOffset] = 154
      pixels[pixelOffset + 1] = 124
      pixels[pixelOffset + 2] = 255
      pixels[pixelOffset + 3] = isTransparent ? 0 : 255
    }
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    createPngChunk('IHDR', header),
    createPngChunk('IDAT', deflateSync(pixels)),
    createPngChunk('IEND', Buffer.alloc(0)),
  ])
}

async function useFileMenuItem(
  page: Page,
  itemName: 'New Episode' | 'Save' | 'Reopen Current',
) {
  const fileTrigger = page.getByRole('button', { name: 'File', exact: true })
  await fileTrigger.click()

  const menu = page.getByRole('menu', { name: 'File' })
  await expect(menu).toBeVisible()
  const item = menu.getByRole('menuitem', { name: itemName, exact: true })
  await expect(item).toBeEnabled()
  await item.click()
}

async function acceptDiscardDialog(page: Page, action: () => Promise<void>) {
  let dialogMessage = ''

  page.once('dialog', async (dialog) => {
    dialogMessage = dialog.message()
    await dialog.accept()
  })

  await action()
  expect(dialogMessage).toBe(
    'Discard unsaved changes and reopen the current saved project?',
  )
}

test('places reusable assets and preserves their local sources across the document workflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')

  const canvas = page.getByTestId('editor-canvas')
  const minimap = page.getByTestId('minimap')
  const documentStatus = page.getByTestId('document-status')
  const builtInRow = page.locator('[data-layer-id="image-element-1"]')
  const uploadedRow = page.locator('[data-layer-id="image-element-2"]')
  const creatorCategory = page.getByRole('button', {
    name: 'Effects',
    exact: true,
  })
  const importedAsset = page.getByRole('button', {
    name: 'Add transparent-proof.png',
    exact: true,
  })

  await expect(canvas).toHaveAttribute('data-ready', 'true')

  await page
    .getByRole('button', { name: 'Decorations', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Add Radiance accent', exact: true })
    .click()
  await expect(builtInRow).toHaveAttribute('aria-pressed', 'true')
  await expect(
    minimap.locator('[data-element-id="image-element-1"]'),
  ).toHaveAttribute('data-image-status', 'ready')

  await page
    .getByRole('button', { name: 'My Library', exact: true })
    .click()
  const categoryName = page.getByLabel('New category name')
  await expect(categoryName).toBeEnabled()
  await categoryName.fill('Effects')
  await page
    .getByRole('button', { name: 'Create category', exact: true })
    .click()
  await expect(creatorCategory).toHaveAttribute('aria-pressed', 'true')

  await page.getByLabel('Upload image').setInputFiles({
    name: 'transparent-proof.png',
    mimeType: 'image/png',
    buffer: createTransparentPng(),
  })
  await expect(importedAsset).toBeVisible()

  // This compositing proof intentionally relies on the initial fit-width view:
  // 100% zoom, no pan, and an 800-unit logical viewport. Capture what is under
  // both halves before placing the known 240 x 160 source at the centered
  // placement calculated by the editor.
  await expect(canvas).toHaveAttribute('data-zoom-percent', '100')
  await expect(canvas).toHaveAttribute('data-viewport-x', '0')
  await expect(canvas).toHaveAttribute('data-viewport-y', '0')
  await expect(canvas).toHaveAttribute('data-viewport-width', '800')
  const viewportHeight = Number(
    await canvas.getAttribute('data-viewport-height'),
  )
  expect(viewportHeight).toBeGreaterThan(160)
  const expectedUploadedBounds = {
    x: (800 - 240) / 2,
    y: (viewportHeight - 160) / 2,
    width: 240,
    height: 160,
  }
  const opaqueSamplePoint = {
    x: expectedUploadedBounds.x + expectedUploadedBounds.width * 0.25,
    y: expectedUploadedBounds.y + expectedUploadedBounds.height * 0.5,
  }
  const transparentSamplePoint = {
    x: expectedUploadedBounds.x + expectedUploadedBounds.width * 0.75,
    y: expectedUploadedBounds.y + expectedUploadedBounds.height * 0.5,
  }
  const underlyingOpaquePixel = await readLogicalCanvasPixel(
    page,
    opaqueSamplePoint.x,
    opaqueSamplePoint.y,
  )
  const underlyingTransparentPixel = await readLogicalCanvasPixel(
    page,
    transparentSamplePoint.x,
    transparentSamplePoint.y,
  )

  await importedAsset.click()

  await expect(uploadedRow).toHaveAttribute('aria-pressed', 'true')
  await expect(canvas).toHaveAttribute('data-image-element-count', '2')
  await expect(canvas).toHaveAttribute('data-missing-image-element-count', '0')
  await expect(minimap).toHaveAttribute('data-image-element-count', '2')
  await expect(
    minimap.locator('[data-element-id="image-element-2"]'),
  ).toHaveAttribute('data-image-status', 'ready')
  const uploadedX = Number(await canvas.getAttribute('data-selected-x'))
  const uploadedY = Number(await canvas.getAttribute('data-selected-y'))
  const uploadedWidth = Number(await canvas.getAttribute('data-selected-width'))
  const uploadedHeight = Number(
    await canvas.getAttribute('data-selected-height'),
  )
  expect({
    x: uploadedX,
    y: uploadedY,
    width: uploadedWidth,
    height: uploadedHeight,
  }).toEqual(expectedUploadedBounds)
  await expect
    .poll(() =>
      readLogicalCanvasPixel(
        page,
        opaqueSamplePoint.x,
        opaqueSamplePoint.y,
      ),
    )
    .not.toBe(underlyingOpaquePixel)
  await expect
    .poll(() =>
      readLogicalCanvasPixel(
        page,
        transparentSamplePoint.x,
        transparentSamplePoint.y,
      ),
    )
    .toBe(underlyingTransparentPixel)

  await page.getByRole('button', { name: 'Close Asset Library' }).click()
  await expect(canvas).toHaveAttribute('data-resize-handle-count', '4')
  const sceneCanvas = canvas.locator('canvas').first()
  const sceneBounds = await sceneCanvas.boundingBox()
  if (!sceneBounds) {
    throw new Error('The uploaded-image resize proof needs a visible canvas.')
  }
  const viewScale = sceneBounds.width / 800
  const resizeHandlePoint = {
    x: sceneBounds.x + (uploadedX + uploadedWidth) * viewScale,
    y: sceneBounds.y + (uploadedY + uploadedHeight) * viewScale,
  }
  await page.mouse.move(resizeHandlePoint.x, resizeHandlePoint.y)
  await page.mouse.down()
  await page.mouse.move(
    resizeHandlePoint.x + 72 * viewScale,
    resizeHandlePoint.y + 48 * viewScale,
    { steps: 6 },
  )
  await page.mouse.up()
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-selected-width')))
    .toBeGreaterThan(uploadedWidth)
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-selected-height')))
    .toBeGreaterThan(uploadedHeight)
  const resizedWidth = Number(await canvas.getAttribute('data-selected-width'))
  const resizedHeight = Number(await canvas.getAttribute('data-selected-height'))

  // Resize and creation are separate history entries. Walk through both, then
  // restore the resized state before saving it.
  await page.keyboard.press('Control+z')
  await expect(uploadedRow).toBeVisible()
  await expect(canvas).toHaveAttribute('data-selected-width', String(uploadedWidth))
  await expect(canvas).toHaveAttribute(
    'data-selected-height',
    String(uploadedHeight),
  )
  await page.keyboard.press('Control+z')
  await expect(uploadedRow).toHaveCount(0)
  await page.keyboard.press('Control+Shift+z')
  await expect(uploadedRow).toBeVisible()
  await expect(canvas).toHaveAttribute('data-selected-width', String(uploadedWidth))
  await page.keyboard.press('Control+Shift+z')
  await expect(canvas).toHaveAttribute('data-selected-width', String(resizedWidth))
  await expect(canvas).toHaveAttribute(
    'data-selected-height',
    String(resizedHeight),
  )

  await useFileMenuItem(page, 'Save')
  await expect(documentStatus).toHaveText('Saved locally')

  await page.reload()

  await expect(documentStatus).toHaveText('Opened saved episode')
  await expect(builtInRow).toBeVisible()
  await expect(uploadedRow).toBeVisible()
  await expect(canvas).toHaveAttribute('data-image-element-count', '2')
  await expect(canvas).toHaveAttribute('data-missing-image-element-count', '0')
  await expect(minimap).toHaveAttribute('data-missing-image-element-count', '0')
  await expect(
    minimap.locator('[data-element-id="image-element-2"]'),
  ).toHaveAttribute('data-image-status', 'ready')
  await uploadedRow.click()
  await expect(canvas).toHaveAttribute('data-selected-width', String(resizedWidth))
  await expect(canvas).toHaveAttribute(
    'data-selected-height',
    String(resizedHeight),
  )

  await page
    .getByRole('button', { name: 'My Library', exact: true })
    .click()
  await expect(creatorCategory).toBeVisible()
  await creatorCategory.click()
  await expect(importedAsset).toBeVisible()

  await page.getByRole('button', { name: 'Close Asset Library' }).click()
  await useFileMenuItem(page, 'New Episode')
  await expect(documentStatus).toHaveText('New episode · not saved')
  await expect(builtInRow).toHaveCount(0)
  await expect(uploadedRow).toHaveCount(0)

  await page
    .getByRole('button', { name: 'My Library', exact: true })
    .click()
  await expect(creatorCategory).toHaveAttribute('aria-pressed', 'true')
  await expect(importedAsset).toBeVisible()

  await page.getByRole('button', { name: 'Close Asset Library' }).click()
  await acceptDiscardDialog(page, () => useFileMenuItem(page, 'Reopen Current'))
  await expect(documentStatus).toHaveText('Reopened saved episode')
  await expect(builtInRow).toBeVisible()
  await expect(uploadedRow).toBeVisible()
  await expect(canvas).toHaveAttribute('data-missing-image-element-count', '0')
  await expect(
    minimap.locator('[data-element-id="image-element-2"]'),
  ).toHaveAttribute('data-image-status', 'ready')
  await uploadedRow.click()
  await expect(canvas).toHaveAttribute('data-selected-width', String(resizedWidth))
  await expect(canvas).toHaveAttribute(
    'data-selected-height',
    String(resizedHeight),
  )

  await page
    .getByRole('button', { name: 'My Library', exact: true })
    .click()
  await expect(creatorCategory).toHaveAttribute('aria-pressed', 'true')
  await expect(importedAsset).toBeVisible()
})

test('drags built-in and imported assets to canvas points without duplicate placement', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')

  const canvas = page.getByTestId('editor-canvas')
  await expect(canvas).toHaveAttribute('data-ready', 'true')
  await expect(canvas).toHaveAttribute('data-image-element-count', '0')

  await page
    .getByRole('button', { name: 'Decorations', exact: true })
    .click()
  const builtInCard = page.getByRole('button', {
    name: 'Add Radiance accent',
    exact: true,
  })
  await expect(builtInCard).toHaveAttribute('draggable', 'true')

  const initialCanvasBounds = await canvas.boundingBox()
  if (!initialCanvasBounds) {
    throw new Error('The drag placement proof needs a visible canvas.')
  }

  await builtInCard.dragTo(canvas, {
    targetPosition: {
      x: initialCanvasBounds.width - 2,
      y: initialCanvasBounds.height / 2,
    },
  })

  await expect(canvas).toHaveAttribute('data-image-element-count', '1')
  const builtInX = Number(await canvas.getAttribute('data-selected-x'))
  const builtInWidth = Number(await canvas.getAttribute('data-selected-width'))
  expect(builtInX + builtInWidth).toBeCloseTo(800, 5)

  await page.keyboard.press('Control+z')
  await expect(canvas).toHaveAttribute('data-image-element-count', '0')
  await page.keyboard.press('Control+Shift+z')
  await expect(canvas).toHaveAttribute('data-image-element-count', '1')

  await page.getByRole('slider', { name: 'Canvas zoom' }).fill('50')
  await expect(canvas).toHaveAttribute('data-zoom-percent', '50')
  const gutterCanvasBounds = await canvas.boundingBox()
  if (!gutterCanvasBounds) {
    throw new Error('The gutter rejection proof needs a visible canvas.')
  }
  await builtInCard.dragTo(canvas, {
    targetPosition: {
      x: gutterCanvasBounds.width * 0.9,
      y: gutterCanvasBounds.height / 2,
    },
  })
  await expect(canvas).toHaveAttribute('data-image-element-count', '1')
  await expect(
    page.getByText('Drop the asset inside the episode canvas.', {
      exact: true,
    }),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Uploads', exact: true }).click()
  await page.getByLabel('Upload image').setInputFiles({
    name: 'dragged-transparent.png',
    mimeType: 'image/png',
    buffer: createTransparentPng(),
  })
  const importedCard = page.getByRole('button', {
    name: 'Add dragged-transparent.png',
    exact: true,
  })
  await expect(importedCard).toHaveAttribute('draggable', 'true')

  await page.getByRole('slider', { name: 'Canvas zoom' }).fill('200')
  await expect(canvas).toHaveAttribute('data-zoom-percent', '200')
  await canvas.press('Shift+ArrowRight')
  await expect(canvas).toHaveAttribute('data-viewport-x', '400')

  const zoomedCanvasBounds = await canvas.boundingBox()
  if (!zoomedCanvasBounds) {
    throw new Error('The zoomed drag placement proof needs a visible canvas.')
  }

  const targetPosition = {
    x: zoomedCanvasBounds.width / 2,
    y: zoomedCanvasBounds.height / 2,
  }
  const viewportX = Number(await canvas.getAttribute('data-viewport-x'))
  const viewportY = Number(await canvas.getAttribute('data-viewport-y'))
  const viewScale = (zoomedCanvasBounds.width / 800) * 2
  const expectedLogicalCenter = {
    x: viewportX + targetPosition.x / viewScale,
    y: viewportY + targetPosition.y / viewScale,
  }

  await importedCard.dragTo(canvas, { targetPosition })

  await expect(canvas).toHaveAttribute('data-image-element-count', '2')
  const importedX = Number(await canvas.getAttribute('data-selected-x'))
  const importedY = Number(await canvas.getAttribute('data-selected-y'))
  const importedWidth = Number(await canvas.getAttribute('data-selected-width'))
  const importedHeight = Number(
    await canvas.getAttribute('data-selected-height'),
  )
  expect(importedX + importedWidth / 2).toBeCloseTo(
    expectedLogicalCenter.x,
    5,
  )
  expect(importedY + importedHeight / 2).toBeCloseTo(
    expectedLogicalCenter.y,
    5,
  )

  await page.keyboard.press('Control+z')
  await expect(canvas).toHaveAttribute('data-image-element-count', '1')
  await page.keyboard.press('Control+Shift+z')
  await expect(canvas).toHaveAttribute('data-image-element-count', '2')

  await canvas.evaluate((element) => {
    const dataTransfer = new DataTransfer()
    dataTransfer.setData(
      'application/x-scrollsplice-asset-v1+json',
      '{"kind":"built-in","assetId":"bad","extra":true}',
    )
    const bounds = element.getBoundingClientRect()
    element.dispatchEvent(
      new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        clientX: bounds.left + bounds.width / 2,
        clientY: bounds.top + bounds.height / 2,
        dataTransfer,
      }),
    )
  })
  await expect(canvas).toHaveAttribute('data-image-element-count', '2')
  await expect(
    page.getByText(
      'Only valid items from the ScrollSplice Asset Library can be dropped here.',
      { exact: true },
    ),
  ).toBeVisible()
})

test('edits opacity, gradients, tiled textures, and blend modes through save and reopen', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await useFileMenuItem(page, 'New Episode')

  const canvas = page.getByTestId('editor-canvas')
  const minimap = page.getByTestId('minimap')
  const documentStatus = page.getByTestId('document-status')
  await expect(canvas).toHaveAttribute('data-ready', 'true')

  await page
    .getByRole('button', { name: 'Background composition group' })
    .click()
  await page
    .getByRole('button', { name: 'Background plane 2', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Color region', exact: true })
    .click()
  await page.getByLabel('Color region color').fill('#406080')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await page
    .getByRole('button', { name: 'Color region', exact: true })
    .click()
  await page.getByLabel('Color region color').fill('#c08040')
  await page.getByRole('button', { name: 'Add', exact: true }).click()

  const regionRow = page.locator(
    '[data-layer-id="background-color-region-2"]',
  )
  const regionMinimap = minimap.locator(
    '[data-element-id="background-color-region-2"]',
  )
  await expect(regionRow).toHaveAttribute('aria-pressed', 'true')
  await expect(
    page.getByTestId('selected-appearance-controls'),
  ).toBeVisible()

  const blendMode = page.getByLabel('Selected element blend mode')
  const blendModes: readonly BlendMode[] = [
    'normal',
    'multiply',
    'screen',
    'overlay',
    'soft-light',
  ]
  for (const mode of blendModes) {
    await blendMode.selectOption(mode)
    await expect(canvas).toHaveAttribute('data-selected-blend-mode', mode)
    await expect(regionMinimap).toHaveAttribute('data-blend-mode', mode)
    await expectLogicalCanvasBlendPixel(
      page,
      mode,
      100,
      100,
      [64, 96, 128],
      [192, 128, 64],
    )
  }
  await blendMode.selectOption('normal')

  const opacityPercent = page.getByLabel(
    'Selected element opacity percent',
  )
  await opacityPercent.fill('45')
  await expect(canvas).toHaveAttribute('data-selected-opacity', '0.45')
  await expect(regionMinimap).toHaveAttribute('data-opacity', '0.45')

  await page
    .getByLabel('Background region fill')
    .selectOption('vertical-gradient')
  await page.getByLabel('Top gradient color').fill('#ff4a3d')
  await page.getByLabel('Bottom gradient color').fill('#35206f')
  await page.getByLabel('Top gradient opacity percent').fill('100')
  await page.getByLabel('Bottom gradient opacity percent').fill('20')
  await expect(canvas).toHaveAttribute(
    'data-selected-fill-kind',
    'vertical-gradient',
  )
  await expect(regionMinimap).toHaveAttribute(
    'data-fill-kind',
    'vertical-gradient',
  )
  await expect(
    minimap.locator('linearGradient[id^="minimap-appearance-"]'),
  ).toHaveCount(1)

  await opacityPercent.fill('0')
  await expect(regionRow).toHaveAttribute('aria-pressed', 'true')
  await expect(regionMinimap).toHaveAttribute('opacity', '0')
  await expect(
    minimap.locator(
      '[data-selection-outline-for="background-color-region-2"]',
    ),
  ).toBeVisible()
  await regionRow.click()
  await page.keyboard.press('Control+z')
  await expect(canvas).toHaveAttribute('data-selected-opacity', '0.45')

  await page
    .getByRole('button', { name: 'Content composition group' })
    .click()
  await page
    .getByRole('button', { name: 'Decorations', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Add Radiance accent', exact: true })
    .click()
  await page.getByRole('button', { name: 'Close Asset Library' }).click()

  const imageRow = page.locator('[data-layer-id="image-element-1"]')
  const imageMinimap = minimap.locator('[data-element-id="image-element-1"]')
  await expect(imageRow).toHaveAttribute('aria-pressed', 'true')
  await page
    .getByLabel('Selected image presentation')
    .selectOption('tile')
  await expect(canvas).toHaveAttribute(
    'data-selected-image-presentation',
    'tile',
  )
  await expect(canvas).toHaveAttribute('data-resize-handle-count', '8')
  await expect(imageMinimap).toHaveAttribute(
    'data-image-presentation',
    'tile',
  )
  await expect(
    minimap.locator('pattern[id^="minimap-appearance-"]'),
  ).toHaveCount(1)

  await blendMode.selectOption('multiply')
  await opacityPercent.fill('70')
  await useFileMenuItem(page, 'Save')
  await expect(documentStatus).toHaveText('Saved locally')

  await page.reload()
  await expect(documentStatus).toHaveText('Opened saved episode')
  await imageRow.click()
  await expect(canvas).toHaveAttribute(
    'data-selected-image-presentation',
    'tile',
  )
  await expect(canvas).toHaveAttribute('data-selected-opacity', '0.7')
  await expect(canvas).toHaveAttribute(
    'data-selected-blend-mode',
    'multiply',
  )

  await page.getByLabel('Selected element opacity percent').fill('80')
  await acceptDiscardDialog(page, () => useFileMenuItem(page, 'Reopen Current'))
  await imageRow.click()
  await expect(canvas).toHaveAttribute('data-selected-opacity', '0.7')
  await expect(canvas).toHaveAttribute(
    'data-selected-image-presentation',
    'tile',
  )
})

test('keeps the Asset Library as a responsive overlay beside its 58px rail', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')

  const canvas = page.getByTestId('editor-canvas')
  const rail = page.locator('.asset-rail')
  const panel = page.locator('.asset-panel')
  const drawer = page.locator('#asset-panel-content')
  const categoryNames = [
    'Uploads',
    'Speech Balloons',
    'Decorations',
    'Splatters',
    'My Library',
  ]

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1280, height: 720 },
    { width: 1024, height: 768 },
  ]) {
    await page.setViewportSize(viewport)
    const canvasBefore = await canvas.boundingBox()

    await page
      .getByRole('button', { name: 'Decorations', exact: true })
      .click()
    await expect(drawer).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Close Asset Library' }),
    ).toBeVisible()
    await expect(panel).toHaveCSS('width', '58px')
    await expect(rail).toHaveCSS('width', '58px')

    for (const categoryName of categoryNames) {
      await expect(
        page.getByRole('button', { name: categoryName, exact: true }),
      ).toBeVisible()
    }

    const canvasWithDrawer = await canvas.boundingBox()
    if (!canvasBefore || !canvasWithDrawer) {
      throw new Error('The responsive editor canvas did not produce bounds.')
    }
    expect(Math.abs(canvasWithDrawer.x - canvasBefore.x)).toBeLessThan(1)
    expect(Math.abs(canvasWithDrawer.width - canvasBefore.width)).toBeLessThan(1)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)

    await page.getByRole('button', { name: 'Close Asset Library' }).click()
    await expect(drawer).toHaveCount(0)
  }
})
