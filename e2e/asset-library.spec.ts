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
  itemName: 'New Episode' | 'Save' | 'Reopen',
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
    'Discard unsaved changes and reopen the last save?',
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
  await acceptDiscardDialog(page, () => useFileMenuItem(page, 'Reopen'))
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
