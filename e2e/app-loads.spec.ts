import { expect, test, type Locator } from '@playwright/test'

async function readLogicalCanvasPixel(
  surface: Locator,
  logicalX: number,
  logicalY: number,
) {
  return surface.evaluate(
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

      return `${pixel[0]},${pixel[1]},${pixel[2]}`
    },
    { x: logicalX, y: logicalY },
  )
}

async function readLocatorX(locator: Locator) {
  const bounds = await locator.boundingBox()

  if (!bounds) {
    throw new Error('The requested header anchor did not produce visible bounds.')
  }

  return bounds.x
}

async function readLocatorBounds(locator: Locator) {
  const bounds = await locator.boundingBox()

  if (!bounds) {
    throw new Error('The requested control did not produce visible bounds.')
  }

  return bounds
}

async function expectHorizontalCentersToMatch(
  subject: Locator,
  container: Locator,
) {
  const [subjectBounds, containerBounds] = await Promise.all([
    subject.boundingBox(),
    container.boundingBox(),
  ])

  if (!subjectBounds || !containerBounds) {
    throw new Error('The centered header controls need visible bounds.')
  }

  expect(
    Math.abs(
      subjectBounds.x +
        subjectBounds.width / 2 -
        (containerBounds.x + containerBounds.width / 2),
    ),
  ).toBeLessThan(1)
}

async function readNumericAttribute(locator: Locator, name: string) {
  const rawValue = await locator.getAttribute(name)
  const value = Number(rawValue)

  if (rawValue === null || rawValue.trim() === '' || !Number.isFinite(value)) {
    throw new Error(`${name} did not contain a finite number.`)
  }

  return value
}

test('completes the ScrollSplice layer-plane editor walkthrough', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')

  await expect(page).toHaveTitle('ScrollSplice')
  await expect(
    page.getByRole('heading', { level: 1, name: 'ScrollSplice' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { level: 2, name: 'Story canvas' }),
  ).toBeVisible()

  const canvas = page.getByTestId('editor-canvas')
  const sceneCanvas = canvas.locator('canvas').first()
  const inspector = page.getByRole('complementary', {
    name: 'Episode overview and layers',
  })
  const compositionGroups = page.getByRole('group', {
    name: 'Composition groups',
  })
  const selectionStatus = page.getByTestId('selection-status')
  const minimap = page.getByTestId('minimap')
  const minimapBase = page.getByTestId('minimap-base')
  const episodePosition = page.getByRole('region', {
    name: 'Episode position and viewport',
  })
  const backgroundGroup = page.getByRole('button', {
    name: 'Background composition group',
  })
  const contentGroup = page.getByRole('button', {
    name: 'Content composition group',
  })
  const contentGroupEye = page.getByRole('button', {
    name: 'Content group visibility',
  })
  const contentPlane1 = page.getByRole('button', {
    name: 'Content plane 1',
    exact: true,
  })
  const contentPlane2 = page.getByRole('button', {
    name: 'Content plane 2',
    exact: true,
  })
  const firstTitleLayer = page.locator(
    '[data-layer-id="beat-01-stillness-title"]',
  )
  const resetDemo = page.getByRole('button', { name: 'Reset demo' })
  const episodeLabel = page.getByTestId('episode-label')
  const appHeader = page.locator('.app-header')
  const magnetToggle = page.getByTestId('alignment-magnet-toggle')
  const sliceGuidesToggle = page.getByTestId('slice-guides-toggle')
  const decorationsCategory = page.getByRole('button', {
    name: 'Decorations',
    exact: true,
  })

  await expect(canvas).toHaveAttribute('data-ready', 'true')
  await expect(episodePosition).toHaveAttribute(
    'aria-describedby',
    'minimap-navigation-help minimap-position-status',
  )
  await expect(page.locator('#minimap-position-status')).toContainText(
    'Viewport starts at x 0, y 0',
  )
  await expect(canvas).toHaveAttribute('data-base-color', '#F3F0EA')
  await expect(canvas).toHaveCSS('border-radius', '0px')
  await expect(canvas).toHaveCSS('border-width', '0px')
  const [flushCanvasBounds, flushSceneBounds] = await Promise.all([
    canvas.boundingBox(),
    sceneCanvas.boundingBox(),
  ])
  expect(flushSceneBounds).toEqual(flushCanvasBounds)
  await expect(contentGroup).toHaveAttribute('aria-pressed', 'true')
  await expect(contentPlane1).toHaveAttribute('aria-pressed', 'true')
  await expect(
    page.getByRole('heading', { level: 2, name: 'Layers · Content' }),
  ).toBeVisible()
  await expect(selectionStatus).toHaveText('Nothing selected')

  const editEpisodeTitle = page.getByRole('button', {
    name: /Edit episode title:/,
  })
  const episodeTitleInput = page.getByRole('textbox', {
    name: 'Episode title',
  })

  const episodeLabelXBeforeEdit = await readLocatorX(episodeLabel)
  const resetXBeforeEdit = await readLocatorX(resetDemo)
  await expectHorizontalCentersToMatch(editEpisodeTitle, appHeader)
  const episodeTitleBoundsBeforeEdit = await readLocatorBounds(editEpisodeTitle)
  await editEpisodeTitle.click()
  await expect(episodeTitleInput).toBeFocused()
  const episodeTitleInputBoundsAtStart = await readLocatorBounds(
    episodeTitleInput,
  )
  expect(
    Math.abs(episodeTitleInputBoundsAtStart.x - episodeTitleBoundsBeforeEdit.x),
  ).toBeLessThan(1)
  expect(
    Math.abs((await readLocatorX(episodeLabel)) - episodeLabelXBeforeEdit),
  ).toBeLessThan(1)
  expect(
    Math.abs((await readLocatorX(resetDemo)) - resetXBeforeEdit),
  ).toBeLessThan(1)
  await episodeTitleInput.fill('A')
  const shortEpisodeTitleWidth = (await episodeTitleInput.boundingBox())?.width
  await episodeTitleInput.fill('A Light Below the Garden Wall')
  const mediumEpisodeTitleWidth = (await episodeTitleInput.boundingBox())?.width
  await episodeTitleInput.fill('x'.repeat(60))
  const longEpisodeTitleBounds = await readLocatorBounds(episodeTitleInput)
  const longEpisodeTitleWidth = longEpisodeTitleBounds.width
  if (
    shortEpisodeTitleWidth === undefined ||
    mediumEpisodeTitleWidth === undefined
  ) {
    throw new Error('The dynamic episode title field needs visible bounds.')
  }
  expect(mediumEpisodeTitleWidth).toBeGreaterThan(shortEpisodeTitleWidth)
  expect(longEpisodeTitleWidth).toBeGreaterThan(mediumEpisodeTitleWidth)
  expect(longEpisodeTitleWidth).toBeLessThanOrEqual(380)
  expect(
    Math.abs(longEpisodeTitleBounds.x - episodeTitleInputBoundsAtStart.x),
  ).toBeLessThan(1)
  expect(longEpisodeTitleBounds.x + longEpisodeTitleBounds.width).toBeLessThan(
    resetXBeforeEdit,
  )
  await episodeTitleInput.fill('  A Light Below  ')
  await episodeTitleInput.press('Enter')
  await expect(page.getByText('A Light Below', { exact: true })).toBeVisible()

  await editEpisodeTitle.click()
  await episodeTitleInput.fill('Committed on blur')
  await page.getByRole('heading', { level: 1, name: 'ScrollSplice' }).click()
  await expect(
    page.getByText('Committed on blur', { exact: true }),
  ).toBeVisible()

  await editEpisodeTitle.click()
  await episodeTitleInput.fill('Cancelled title')
  await episodeTitleInput.press('Escape')
  await expect(
    page.getByText('Committed on blur', { exact: true }),
  ).toBeVisible()

  await editEpisodeTitle.click()
  await episodeTitleInput.fill('Composing title')
  await episodeTitleInput.dispatchEvent('keydown', {
    key: 'Enter',
    code: 'Enter',
    isComposing: true,
  })
  await expect(episodeTitleInput).toBeVisible()
  await expect(episodeTitleInput).toHaveValue('Composing title')
  await episodeTitleInput.press('Escape')

  await editEpisodeTitle.click()
  await episodeTitleInput.fill('   ')
  await episodeTitleInput.press('Enter')
  await expect(
    page.getByText('Committed on blur', { exact: true }),
  ).toBeVisible()

  await editEpisodeTitle.click()
  await episodeTitleInput.fill('')
  await episodeTitleInput.pressSequentially('x'.repeat(61))
  await expect(episodeTitleInput).toHaveValue('x'.repeat(60))
  await episodeTitleInput.fill(`  ${'x'.repeat(60)}  `)
  await expect(episodeTitleInput).toHaveValue(`  ${'x'.repeat(60)}  `)
  await episodeTitleInput.press('Enter')
  await expect(page.getByText('x'.repeat(60), { exact: true })).toBeVisible()
  await expectHorizontalCentersToMatch(editEpisodeTitle, appHeader)

  await expect(sliceGuidesToggle).toHaveAttribute('aria-pressed', 'true')
  await expect(canvas).toHaveAttribute('data-slice-guide-count', '3')
  await expect(canvas).toHaveAttribute('data-slice-guides-visible', 'true')
  await canvas.hover()
  await page.mouse.wheel(0, 700)
  const firstSliceGuide = page.locator('[data-slice-guide-y="1280"]')
  await expect(firstSliceGuide).toBeVisible()
  await expect(firstSliceGuide).toHaveText('')
  await expect(firstSliceGuide).toHaveCSS('border-top-style', 'dotted')
  const firstSliceGuideBounds = await firstSliceGuide.boundingBox()
  const guideSceneBounds = await sceneCanvas.boundingBox()
  if (!firstSliceGuideBounds || !guideSceneBounds) {
    throw new Error('The first slice guide needs visible canvas bounds.')
  }
  expect(Math.abs(firstSliceGuideBounds.x - guideSceneBounds.x)).toBeLessThan(2)
  expect(
    Math.abs(firstSliceGuideBounds.width - guideSceneBounds.width),
  ).toBeLessThan(2)
  await sliceGuidesToggle.click()
  await expect(sliceGuidesToggle).toHaveAttribute('aria-pressed', 'false')
  await expect(canvas).toHaveAttribute('data-slice-guides-visible', 'false')
  await expect(firstSliceGuide).toHaveCount(0)
  await sliceGuidesToggle.click()
  await expect(sliceGuidesToggle).toHaveAttribute('aria-pressed', 'true')
  await expect(firstSliceGuide).toBeVisible()
  await resetDemo.click()
  await expect(episodePosition).toHaveAttribute('data-viewport-y', '0')

  const inspectorBounds = await inspector.boundingBox()
  const canvasBoundsAtStart = await canvas.boundingBox()
  const compositionGroupBounds = await compositionGroups.boundingBox()

  expect(inspectorBounds?.y).toBe(0)
  if (!canvasBoundsAtStart || !compositionGroupBounds) {
    throw new Error('The canvas and composition controls need visible bounds.')
  }
  expect(
    Math.abs(
      canvasBoundsAtStart.x +
        canvasBoundsAtStart.width / 2 -
        (compositionGroupBounds.x + compositionGroupBounds.width / 2),
    ),
  ).toBeLessThan(3)

  await expect(magnetToggle).toHaveAttribute('aria-pressed', 'true')
  await page
    .getByRole('button', { name: 'Foreground composition group' })
    .click()
  const foregroundPlane1 = page.getByRole('button', {
    name: 'Foreground plane 1',
    exact: true,
  })
  await expect(foregroundPlane1).toHaveAttribute('aria-pressed', 'true')
  await canvas.hover()
  await page.mouse.wheel(0, 450)
  await expect
    .poll(() => readNumericAttribute(canvas, 'data-viewport-y'))
    .toBeGreaterThan(400)
  const canvasBoundsBeforeAssetDrawer = await canvas.boundingBox()
  await decorationsCategory.click()
  await page.getByRole('button', { name: 'Add Radiance accent' }).click()
  const snapResizeShapeRow = page.locator(
    '[data-layer-id="image-element-1"]',
  )
  await expect(snapResizeShapeRow).toHaveAttribute('aria-pressed', 'true')
  await expect(canvas).toHaveAttribute('data-resize-handle-count', '4')
  await expect(page.locator('.asset-panel')).toHaveCSS('width', '58px')
  await expect(page.locator('.asset-rail')).toHaveCSS('width', '58px')
  const canvasBoundsWithAssetDrawer = await canvas.boundingBox()
  if (!canvasBoundsBeforeAssetDrawer || !canvasBoundsWithAssetDrawer) {
    throw new Error('The asset drawer needs a visible editing canvas.')
  }
  expect(
    Math.abs(canvasBoundsWithAssetDrawer.x - canvasBoundsBeforeAssetDrawer.x),
  ).toBeLessThan(1)
  expect(
    Math.abs(
      canvasBoundsWithAssetDrawer.width - canvasBoundsBeforeAssetDrawer.width,
    ),
  ).toBeLessThan(1)
  await page.getByRole('button', { name: 'Close Asset Library' }).click()

  const snapSceneBounds = await sceneCanvas.boundingBox()
  if (!snapSceneBounds) {
    throw new Error('The snapping canvas did not produce visible bounds.')
  }
  const snapScale = snapSceneBounds.width / 800
  const snapViewportY = await readNumericAttribute(canvas, 'data-viewport-y')
  const syntheticStartX = await readNumericAttribute(canvas, 'data-selected-x')
  const syntheticStartY = await readNumericAttribute(canvas, 'data-selected-y')
  const syntheticStartWidth = await readNumericAttribute(
    canvas,
    'data-selected-width',
  )
  const syntheticStartHeight = await readNumericAttribute(
    canvas,
    'data-selected-height',
  )
  const centeredSyntheticX = (800 - syntheticStartWidth) / 2
  const syntheticCenter = {
    x:
      snapSceneBounds.x +
      (syntheticStartX + syntheticStartWidth / 2) * snapScale,
    y:
      snapSceneBounds.y +
      (syntheticStartY - snapViewportY + syntheticStartHeight / 2) * snapScale,
  }
  const syntheticMinimapElement = minimap.locator(
    '[data-element-id="image-element-1"]',
  )
  const syntheticMinimapBounds = syntheticMinimapElement.locator('rect').last()
  const syntheticMinimapStartX = await readNumericAttribute(
    syntheticMinimapBounds,
    'x',
  )

  await page.keyboard.down('Alt')
  await page.mouse.move(syntheticCenter.x, syntheticCenter.y)
  await page.mouse.down()
  await page.mouse.move(syntheticCenter.x + 260, syntheticCenter.y, {
    steps: 5,
  })
  await expect
    .poll(() => readNumericAttribute(selectionStatus, 'data-x'))
    .toBeGreaterThan(syntheticStartX + 200)
  await expect
    .poll(() => readNumericAttribute(syntheticMinimapBounds, 'x'))
    .toBeGreaterThan(syntheticMinimapStartX + 200)
  await expect(canvas).toHaveAttribute(
    'data-selected-x',
    String(syntheticStartX),
  )
  await page.mouse.up()
  await page.keyboard.up('Alt')
  await expect
    .poll(() => readNumericAttribute(canvas, 'data-selected-x'))
    .toBeGreaterThan(centeredSyntheticX + 200)

  const offCenterX = await readNumericAttribute(canvas, 'data-selected-x')
  const offCenterY = await readNumericAttribute(canvas, 'data-selected-y')
  const offCenterPoint = {
    x:
      snapSceneBounds.x +
      (offCenterX + syntheticStartWidth / 2) * snapScale,
    y:
      snapSceneBounds.y +
      (offCenterY - snapViewportY + syntheticStartHeight / 2) * snapScale,
  }
  const centerSnapGuide = page.getByTestId('center-snap-guide')
  await page.mouse.move(offCenterPoint.x, offCenterPoint.y)
  await page.mouse.down()
  let centerGuideAppeared = false
  for (let dragDistance = 4; dragDistance <= 380; dragDistance += 4) {
    await page.mouse.move(
      offCenterPoint.x - dragDistance,
      offCenterPoint.y,
    )
    if ((await centerSnapGuide.count()) > 0) {
      centerGuideAppeared = true
      break
    }
  }
  expect(centerGuideAppeared).toBe(true)
  await expect(centerSnapGuide).toBeVisible()
  await page.mouse.up()
  await expect(canvas).toHaveAttribute(
    'data-selected-x',
    String(centeredSyntheticX),
  )
  await expect(centerSnapGuide).toHaveCount(0)

  await page
    .locator('[data-layer-id="beat-01-stillness-accent-1"]')
    .click()
  await snapResizeShapeRow.click()
  await expect(canvas).toHaveAttribute(
    'data-selected-element-id',
    'image-element-1',
  )

  const minimapWidthBeforeResize = await readNumericAttribute(
    syntheticMinimapBounds,
    'width',
  )
  const minimapHeightBeforeResize = await readNumericAttribute(
    syntheticMinimapBounds,
    'height',
  )
  const resizeViewportY = await readNumericAttribute(canvas, 'data-viewport-y')
  const resizeHandlePoint = {
    x:
      snapSceneBounds.x +
      (centeredSyntheticX + syntheticStartWidth) * snapScale,
    y:
      snapSceneBounds.y +
      (offCenterY - resizeViewportY + syntheticStartHeight) * snapScale,
  }
  await page.mouse.move(resizeHandlePoint.x, resizeHandlePoint.y)
  await page.mouse.down()
  await page.mouse.move(
    resizeHandlePoint.x + 60 * snapScale,
    resizeHandlePoint.y + 44 * snapScale,
    { steps: 6 },
  )
  await expect
    .poll(() => readNumericAttribute(selectionStatus, 'data-width'))
    .toBeGreaterThan(syntheticStartWidth)
  await expect
    .poll(() => readNumericAttribute(syntheticMinimapBounds, 'width'))
    .toBeGreaterThan(minimapWidthBeforeResize)
  await expect(canvas).toHaveAttribute(
    'data-selected-width',
    String(syntheticStartWidth),
  )
  await page.mouse.up()
  await expect
    .poll(() => readNumericAttribute(canvas, 'data-selected-width'))
    .toBeGreaterThan(syntheticStartWidth)
  await expect
    .poll(() => readNumericAttribute(canvas, 'data-selected-height'))
    .toBeGreaterThan(syntheticStartHeight)
  await expect
    .poll(() => readNumericAttribute(syntheticMinimapBounds, 'width'))
    .toBeGreaterThan(minimapWidthBeforeResize)
  await expect
    .poll(() => readNumericAttribute(syntheticMinimapBounds, 'height'))
    .toBeGreaterThan(minimapHeightBeforeResize)
  await resetDemo.click()
  await expect(contentGroup).toHaveAttribute('aria-pressed', 'true')
  await expect(contentPlane1).toHaveAttribute('aria-pressed', 'true')

  const panelList = page.getByRole('list', {
    name: 'Content plane 1 elements',
  })
  await expect(panelList.getByRole('listitem')).toHaveCount(6)
  await expect
    .poll(() =>
      panelList.locator('[data-layer-id]').evaluateAll((rows) =>
        rows.map((row) => row.getAttribute('data-layer-id')),
      ),
    )
    .toEqual([
      'beat-01-stillness-background',
      'beat-02-spark-background',
      'beat-03-search-background',
      'beat-04-crossing-background',
      'beat-05-chorus-background',
      'beat-06-dawn-background',
    ])

  await page.getByRole('button', { name: 'Add asset', exact: true }).click()
  await expect(decorationsCategory).toHaveAttribute('aria-expanded', 'true')
  await page.getByRole('button', { name: 'Add Radiance accent' }).click()
  const syntheticShapeRow = page.locator(
    '[data-layer-id="image-element-1"]',
  )
  await expect(syntheticShapeRow).toHaveAttribute('aria-pressed', 'true')
  await expect(panelList.getByRole('listitem')).toHaveCount(7)
  await page
    .getByRole('button', { name: 'Delete Radiance accent' })
    .click()
  await expect(syntheticShapeRow).toHaveCount(0)
  await expect(panelList.getByRole('listitem')).toHaveCount(6)
  await page.getByRole('button', { name: 'Close Asset Library' }).click()
  await expect(decorationsCategory).toHaveAttribute('aria-expanded', 'false')

  await contentPlane2.click()
  const textList = page.getByRole('list', {
    name: 'Content plane 2 elements',
  })
  await expect(textList.getByRole('listitem')).toHaveCount(12)
  await expect
    .poll(() =>
      textList.locator('[data-layer-id]').evaluateAll((rows) =>
        rows.slice(0, 4).map((row) => row.getAttribute('data-layer-id')),
      ),
    )
    .toEqual([
      'beat-01-stillness-title',
      'beat-01-stillness-caption',
      'beat-02-spark-title',
      'beat-02-spark-caption',
    ])

  await contentPlane1.click()
  const firstPanelRow = page.locator(
    '[data-layer-id="beat-01-stillness-background"]',
  )
  const firstPanelEye = page.getByRole('button', {
    name: 'Beat 1 · Stillness · Panel visibility',
  })
  const minimapFirstPanel = minimap.locator(
    '[data-element-id="beat-01-stillness-background"]',
  )

  await firstPanelRow.click()
  await expect(selectionStatus).toContainText('Beat 1 · Stillness · Panel')
  await firstPanelEye.click()
  await expect(firstPanelRow).toBeEnabled()
  await expect(firstPanelRow).toHaveAttribute('aria-pressed', 'true')
  await expect(selectionStatus).toContainText('Beat 1 · Stillness · Panel')
  await expect(minimapFirstPanel).toHaveCount(0)
  await firstPanelRow.click()
  await firstPanelEye.click()
  await expect(minimapFirstPanel).toHaveCount(1)

  const contentPlane1Eye = page.getByRole('button', {
    name: 'Content plane 1 visibility',
  })
  await contentPlane1Eye.click()
  await expect(contentPlane1Eye).toHaveAttribute('aria-pressed', 'false')
  await expect(firstPanelRow).toBeEnabled()
  await expect(selectionStatus).toContainText('Beat 1 · Stillness · Panel')
  await expect(minimapFirstPanel).toHaveCount(0)
  await expect(
    page.getByText('Content plane 1 is hidden. Its elements remain editable here.'),
  ).toBeVisible()
  await contentPlane1Eye.click()
  await expect(minimapFirstPanel).toHaveCount(1)

  await backgroundGroup.click()
  await contentGroupEye.click()
  await expect(contentGroupEye).toHaveAttribute('aria-pressed', 'false')
  await expect(
    page.getByRole('button', { name: 'Background plane 1', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(
    page.getByRole('button', {
      name: 'Delete plane unavailable: Background plane 1 is pinned and cannot be deleted.',
    }),
  ).toBeDisabled()
  await expect(
    page.getByRole('button', {
      name: 'Add asset unavailable: Background plane 1 is the full-episode base color',
    }),
  ).toBeDisabled()
  const baseColor = page.getByLabel('Base color', { exact: true })
  const canvasBaseColor = page.getByLabel('Canvas base color', { exact: true })
  const canvasBaseColorControl = page.locator('.canvas-base-color-control')
  await expect(baseColor).toHaveValue('#f3f0ea')
  await expect(canvasBaseColor).toHaveValue('#f3f0ea')
  const [baseCanvasBounds, baseControlBounds] = await Promise.all([
    canvas.boundingBox(),
    canvasBaseColorControl.boundingBox(),
  ])
  if (!baseCanvasBounds || !baseControlBounds) {
    throw new Error('The canvas base control needs visible canvas bounds.')
  }
  const baseControlInsetX = baseControlBounds.x - baseCanvasBounds.x
  const baseControlInsetY = baseControlBounds.y - baseCanvasBounds.y
  expect(baseControlInsetX).toBeGreaterThanOrEqual(8)
  expect(baseControlInsetX).toBeLessThanOrEqual(20)
  expect(baseControlInsetY).toBeGreaterThanOrEqual(8)
  expect(baseControlInsetY).toBeLessThanOrEqual(20)
  expect(baseControlBounds.x + baseControlBounds.width).toBeLessThan(
    baseCanvasBounds.x + baseCanvasBounds.width,
  )
  expect(baseControlBounds.y + baseControlBounds.height).toBeLessThan(
    baseCanvasBounds.y + baseCanvasBounds.height,
  )
  await expect(minimapBase).toHaveAttribute('fill', '#F3F0EA')
  await expect
    .poll(() => readLogicalCanvasPixel(sceneCanvas, 10, 20))
    .toBe('243,240,234')

  await baseColor.fill('#123456')
  await expect(canvas).toHaveAttribute('data-base-color', '#123456')
  await expect(minimapBase).toHaveAttribute('fill', '#123456')
  await expect
    .poll(() => readLogicalCanvasPixel(sceneCanvas, 10, 20))
    .toBe('18,52,86')

  await canvasBaseColor.fill('#654321')
  await expect(baseColor).toHaveValue('#654321')
  await expect(canvas).toHaveAttribute('data-base-color', '#654321')
  await expect(minimapBase).toHaveAttribute('fill', '#654321')

  const backgroundBaseEye = page.getByRole('button', {
    name: 'Background plane 1 visibility',
  })
  await backgroundBaseEye.click()
  await expect(backgroundBaseEye).toHaveAttribute('aria-pressed', 'false')
  await expect(canvas).toHaveAttribute('data-base-color', 'transparent')
  await expect(minimapBase).toHaveCount(0)
  await backgroundBaseEye.click()
  await expect(canvas).toHaveAttribute('data-base-color', '#654321')
  await expect(minimapBase).toHaveAttribute('fill', '#654321')

  const backgroundPlane2 = page.getByRole('button', {
    name: 'Background plane 2',
    exact: true,
  })
  await backgroundPlane2.click()
  await page.getByRole('button', { name: 'Color region' }).click()
  await page.getByLabel('Color region color').fill('#334477')
  await page.getByLabel('Color region start').fill('300')
  await page.getByLabel('Color region length').fill('')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.locator('.color-region-form')).toBeVisible()
  await page.getByLabel('Color region length').fill('600')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  const colorRegionRow = page.locator(
    '[data-layer-id="background-color-region-1"]',
  )
  const colorRegionMinimap = minimap.locator(
    '[data-element-id="background-color-region-1"]',
  )
  await expect(colorRegionRow).toHaveAttribute('aria-pressed', 'true')
  await expect(colorRegionMinimap).toHaveAttribute('fill', '#334477')
  await expect(colorRegionMinimap).toHaveAttribute('x', '0')
  await expect(canvas).toHaveAttribute('data-selected-x', '0')
  await expect(canvas).toHaveAttribute('data-resize-handle-count', '8')
  const colorRegionCanvasBounds = await sceneCanvas.boundingBox()
  if (!colorRegionCanvasBounds) {
    throw new Error('The color-region canvas did not produce visible bounds.')
  }
  const colorRegionScale = colorRegionCanvasBounds.width / 800
  const colorRegionRightHandle = {
    x: colorRegionCanvasBounds.x + colorRegionCanvasBounds.width - 2,
    y: colorRegionCanvasBounds.y + (300 + 600 / 2) * colorRegionScale,
  }
  const colorRegionMinimapWidthBeforeResize = await readNumericAttribute(
    colorRegionMinimap,
    'width',
  )
  await page.mouse.move(colorRegionRightHandle.x, colorRegionRightHandle.y)
  await page.mouse.down()
  await page.mouse.move(
    colorRegionRightHandle.x - 180 * colorRegionScale,
    colorRegionRightHandle.y,
    { steps: 6 },
  )
  await expect
    .poll(() => readNumericAttribute(selectionStatus, 'data-width'))
    .toBeLessThan(700)
  await expect
    .poll(() => readNumericAttribute(colorRegionMinimap, 'width'))
    .toBeLessThan(colorRegionMinimapWidthBeforeResize)
  await expect(canvas).toHaveAttribute('data-selected-width', '800')
  await page.mouse.up()

  const resizedColorRegionWidth = await readNumericAttribute(
    canvas,
    'data-selected-width',
  )
  expect(resizedColorRegionWidth).toBeLessThan(700)
  expect(
    Math.abs(
      (await readNumericAttribute(canvas, 'data-selected-height')) - 600,
    ),
  ).toBeLessThan(0.01)
  const centeredColorRegionX = (800 - resizedColorRegionWidth) / 2
  const colorRegionDragPoint = {
    x: colorRegionCanvasBounds.x + 20 * colorRegionScale,
    y: colorRegionCanvasBounds.y + 350 * colorRegionScale,
  }
  await page.mouse.move(colorRegionDragPoint.x, colorRegionDragPoint.y)
  await page.mouse.down()
  await page.mouse.move(
    colorRegionDragPoint.x + centeredColorRegionX * colorRegionScale,
    colorRegionDragPoint.y,
    { steps: 6 },
  )
  await expect
    .poll(async () =>
      Math.abs(
        (await readNumericAttribute(selectionStatus, 'data-x')) -
          centeredColorRegionX,
      ),
    )
    .toBeLessThan(1)
  await expect
    .poll(async () =>
      Math.abs(
        (await readNumericAttribute(colorRegionMinimap, 'x')) -
          centeredColorRegionX,
      ),
    )
    .toBeLessThan(1)
  await expect(centerSnapGuide).toBeVisible()
  await expect(canvas).toHaveAttribute('data-selected-x', '0')
  await page.mouse.up()
  await expect
    .poll(async () =>
      Math.abs(
        (await readNumericAttribute(canvas, 'data-selected-x')) -
          centeredColorRegionX,
      ),
    )
    .toBeLessThan(1)
  await expect(centerSnapGuide).toHaveCount(0)

  await magnetToggle.click()
  await expect(magnetToggle).toHaveAttribute('aria-pressed', 'false')
  const centeredColorRegionPoint = {
    x:
      colorRegionCanvasBounds.x +
      (centeredColorRegionX + 20) * colorRegionScale,
    y: colorRegionDragPoint.y,
  }
  await page.mouse.move(centeredColorRegionPoint.x, centeredColorRegionPoint.y)
  await page.mouse.down()
  await page.mouse.move(
    centeredColorRegionPoint.x + 60 * colorRegionScale,
    centeredColorRegionPoint.y,
    { steps: 5 },
  )
  await expect
    .poll(() => readNumericAttribute(selectionStatus, 'data-x'))
    .toBeGreaterThan(centeredColorRegionX + 40)
  await expect(centerSnapGuide).toHaveCount(0)
  await page.mouse.up()
  const freelyMovedColorRegionX = await readNumericAttribute(
    canvas,
    'data-selected-x',
  )
  expect(freelyMovedColorRegionX).toBeGreaterThan(centeredColorRegionX + 40)
  await magnetToggle.click()
  await expect(magnetToggle).toHaveAttribute('aria-pressed', 'true')

  const movedColorRegionY = await readNumericAttribute(canvas, 'data-selected-y')
  await canvas.hover()
  await page.mouse.wheel(0, 1_200)
  await expect
    .poll(() => readNumericAttribute(episodePosition, 'data-viewport-y'))
    .toBeGreaterThan(900)
  expect(await readNumericAttribute(canvas, 'data-selected-x')).toBe(
    freelyMovedColorRegionX,
  )
  expect(await readNumericAttribute(colorRegionMinimap, 'x')).toBe(
    freelyMovedColorRegionX,
  )
  await page.mouse.wheel(0, -1_200)
  await expect(episodePosition).toHaveAttribute('data-viewport-y', '0')
  expect(await readNumericAttribute(canvas, 'data-selected-x')).toBe(
    freelyMovedColorRegionX,
  )
  expect(await readNumericAttribute(colorRegionMinimap, 'x')).toBe(
    freelyMovedColorRegionX,
  )
  await expect
    .poll(() =>
      readLogicalCanvasPixel(
        sceneCanvas,
        freelyMovedColorRegionX + 10,
        movedColorRegionY + 10,
      ),
    )
    .toBe('51,68,119')

  await contentGroupEye.click()
  await expect(contentGroupEye).toHaveAttribute('aria-pressed', 'true')
  await contentGroup.click()
  await expect(contentPlane1).toHaveAttribute('aria-pressed', 'true')
  const addContentPlane = page.getByRole('button', {
    name: 'Add Content plane',
  })

  await addContentPlane.click()
  const contentPlane3 = page.getByRole('button', {
    name: 'Content plane 3',
    exact: true,
  })
  await expect(contentPlane3).toHaveAttribute('aria-pressed', 'true')
  await expect(
    page.getByText('This plane is empty and can be safely deleted.'),
  ).toBeVisible()
  const deleteContentPlane3 = page.getByRole('button', {
    name: 'Delete Content plane 3',
  })
  await expect(deleteContentPlane3).toBeEnabled()
  await expect(
    page.getByRole('button', { name: 'Add asset to Content plane 3' }),
  ).toBeEnabled()
  const contentPlane3Eye = page.getByRole('button', {
    name: 'Content plane 3 visibility',
  })
  await contentPlane3Eye.click()
  await expect(contentPlane3Eye).toHaveAttribute('aria-pressed', 'false')
  await deleteContentPlane3.click()
  await expect(contentPlane3).toHaveCount(0)
  await expect(contentPlane2).toHaveAttribute('aria-pressed', 'true')

  await addContentPlane.click()
  await expect(contentPlane3).toHaveAttribute('aria-pressed', 'true')

  for (let order = 4; order <= 10; order += 1) {
    await addContentPlane.click()
    await expect(
      page.getByRole('button', {
        name: `Content plane ${order}`,
        exact: true,
      }),
    ).toHaveAttribute('aria-pressed', 'true')
  }

  const planeScrollport = page.getByTestId('layer-plane-scrollport')
  const planeTabs = page.locator('[data-layer-plane-id]')
  const readPlaneOrder = () =>
    planeTabs.evaluateAll((tabs) =>
      tabs.map((tab) => tab.getAttribute('data-layer-plane-id')),
    )
  const planeOrderBeforeNavigation = await readPlaneOrder()
  expect(planeOrderBeforeNavigation).toEqual([
    'content-plane-1',
    'content-plane-2',
    'content-plane-3',
    'content-plane-4',
    'content-plane-5',
    'content-plane-6',
    'content-plane-7',
    'content-plane-8',
    'content-plane-9',
    'content-plane-10',
  ])

  await contentPlane1.click()
  await expect
    .poll(() => planeScrollport.evaluate((scrollport) => scrollport.scrollLeft))
    .toBeLessThan(2)
  const planeScrollMetrics = await planeScrollport.evaluate((scrollport) => ({
    clientWidth: scrollport.clientWidth,
    scrollWidth: scrollport.scrollWidth,
  }))
  expect(planeScrollMetrics.scrollWidth).toBeGreaterThan(
    planeScrollMetrics.clientWidth,
  )
  const scrollRight = page.getByRole('button', {
    name: 'Scroll layer planes right',
  })
  await expect(scrollRight).toBeEnabled()
  const scrollLeftBeforeNavigation = await planeScrollport.evaluate(
    (scrollport) => scrollport.scrollLeft,
  )
  await scrollRight.click()
  await expect
    .poll(() => planeScrollport.evaluate((scrollport) => scrollport.scrollLeft))
    .toBeGreaterThan(scrollLeftBeforeNavigation)
  expect(await readPlaneOrder()).toEqual(planeOrderBeforeNavigation)
  await expect(contentPlane1).toHaveAttribute('aria-pressed', 'true')

  const contentPlane10 = page.getByRole('button', {
    name: 'Content plane 10',
    exact: true,
  })
  await contentPlane10.click()
  await expect(contentPlane10).toHaveAttribute('aria-pressed', 'true')
  const contentPlane10Tab = page.locator(
    '[data-layer-plane-id="content-plane-10"]',
  )
  await expect
    .poll(async () => {
      const scrollportBounds = await planeScrollport.boundingBox()
      const tabBounds = await contentPlane10Tab.boundingBox()

      return Boolean(
        scrollportBounds &&
          tabBounds &&
          tabBounds.x >= scrollportBounds.x - 1 &&
          tabBounds.x + tabBounds.width <=
            scrollportBounds.x + scrollportBounds.width + 1,
      )
    })
    .toBe(true)

  await page.getByRole('button', { name: 'Reset demo' }).click()
  await expect(contentGroup).toHaveAttribute('aria-pressed', 'true')
  await expect(contentPlane1).toHaveAttribute('aria-pressed', 'true')
  await expect(
    page.getByText('Signal in the Fog', { exact: true }),
  ).toBeVisible()
  await expect(selectionStatus).toHaveText('Nothing selected')
  await expect(episodePosition).toHaveAttribute('data-viewport-y', '0')
  await expect(canvas).toHaveAttribute('data-base-color', '#F3F0EA')
  await expect(minimapBase).toHaveAttribute('fill', '#F3F0EA')
  await expect(minimapFirstPanel).toHaveCount(1)
  await expect.poll(readPlaneOrder).toEqual([
    'content-plane-1',
    'content-plane-2',
  ])

  const initialEpisodeHeight = Number(
    await canvas.getAttribute('data-episode-height'),
  )
  expect(initialEpisodeHeight).toBeGreaterThan(0)
  await episodePosition.press('End')
  const episodeBottomEdge = page.getByRole('button', {
    name: /Resize episode from bottom edge/,
  })
  await expect(episodeBottomEdge).toBeVisible()
  const episodeBottomEdgeBounds = await episodeBottomEdge.boundingBox()
  if (!episodeBottomEdgeBounds) {
    throw new Error('The episode bottom edge did not produce visible bounds.')
  }
  await page.mouse.move(
    episodeBottomEdgeBounds.x + episodeBottomEdgeBounds.width / 2,
    episodeBottomEdgeBounds.y + episodeBottomEdgeBounds.height / 2,
  )
  await page.mouse.down()
  await page.mouse.move(
    episodeBottomEdgeBounds.x + episodeBottomEdgeBounds.width / 2,
    episodeBottomEdgeBounds.y + episodeBottomEdgeBounds.height / 2 - 24,
    { steps: 4 },
  )
  await page.mouse.up()
  const finelyTrimmedHeight = Number(
    await canvas.getAttribute('data-episode-height'),
  )
  expect(finelyTrimmedHeight).toBeLessThan(initialEpisodeHeight)
  expect(initialEpisodeHeight - finelyTrimmedHeight).toBeLessThan(1_280)

  await page.getByRole('button', { name: 'Reset demo' }).click()
  await episodePosition.press('End')
  const viewportAtOriginalEnd = await episodePosition.getAttribute(
    'data-viewport-y',
  )
  const addScrollSpace = page.getByRole('button', {
    name: /Add scroll space/,
  })
  await expect(addScrollSpace).toBeVisible()
  await addScrollSpace.click()

  const onceExtendedHeight = initialEpisodeHeight + 1_280
  await expect(canvas).toHaveAttribute(
    'data-episode-height',
    String(onceExtendedHeight),
  )
  await expect(episodePosition).toHaveAttribute(
    'data-viewport-y',
    viewportAtOriginalEnd ?? '0',
  )
  await expect(minimapBase).toHaveAttribute(
    'height',
    String(onceExtendedHeight),
  )
  await expect(minimap.locator('svg')).toHaveAttribute(
    'viewBox',
    `0 0 800 ${onceExtendedHeight}`,
  )
  await expect(addScrollSpace).toBeHidden()

  await episodePosition.press('End')
  await expect(addScrollSpace).toBeVisible()
  await expect
    .poll(() => readLogicalCanvasPixel(sceneCanvas, 10, 20))
    .toBe('243,240,234')
  await addScrollSpace.click()
  await expect(canvas).toHaveAttribute(
    'data-episode-height',
    String(initialEpisodeHeight + 2_560),
  )

  await page.getByRole('button', { name: 'Reset demo' }).click()
  await expect(canvas).toHaveAttribute(
    'data-episode-height',
    String(initialEpisodeHeight),
  )
  await expect(episodePosition).toHaveAttribute('data-viewport-y', '0')

  await decorationsCategory.click()
  await expect(decorationsCategory).toHaveAttribute('aria-expanded', 'true')
  const decorRailLabel = decorationsCategory.getByText('Decor', {
    exact: true,
  })
  await expect(decorRailLabel).toBeVisible()
  const [decorButtonBounds, decorLabelBounds] = await Promise.all([
    decorationsCategory.boundingBox(),
    decorRailLabel.boundingBox(),
  ])
  if (!decorButtonBounds || !decorLabelBounds) {
    throw new Error('The Decor rail label did not produce visible bounds.')
  }
  expect(decorLabelBounds.x).toBeGreaterThanOrEqual(decorButtonBounds.x - 0.5)
  expect(
    decorLabelBounds.x + decorLabelBounds.width,
  ).toBeLessThanOrEqual(
    decorButtonBounds.x + decorButtonBounds.width + 0.5,
  )
  await expect(
    page.getByRole('heading', { level: 2, name: 'Decorations' }),
  ).toBeVisible()

  await page.getByRole('button', { name: 'File', exact: true }).click()
  const saveMenuItem = page.getByRole('menuitem', {
    name: 'Save',
    exact: true,
  })
  await expect(saveMenuItem).toBeVisible()
  expect(
    await saveMenuItem.evaluate((item) => {
      const bounds = item.getBoundingClientRect()
      const topmost = document.elementFromPoint(
        bounds.left + bounds.width / 2,
        bounds.top + bounds.height / 2,
      )

      return topmost === item || item.contains(topmost)
    }),
  ).toBe(true)
  await saveMenuItem.click()

  await decorationsCategory.click()
  await expect(decorationsCategory).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('#asset-panel-content')).toHaveCount(0)

  const zoomSlider = page.getByRole('slider', { name: 'Canvas zoom' })
  const minimapViewport = page.getByTestId('minimap-viewport')
  await expect(zoomSlider).toHaveValue('100')
  await zoomSlider.fill('200')
  await expect(canvas).toHaveAttribute('data-zoom-percent', '200')
  await expect(canvas).toHaveAttribute('data-viewport-width', '400')
  await expect(minimapViewport).toHaveAttribute('width', '400')

  await contentPlane2.click()
  await firstTitleLayer.click()
  const zoomedSceneBounds = await sceneCanvas.boundingBox()
  if (!zoomedSceneBounds) {
    throw new Error('The zoomed editing surface did not produce visible bounds.')
  }
  const zoomedViewportX = Number(await canvas.getAttribute('data-viewport-x'))
  const zoomedViewportY = Number(await canvas.getAttribute('data-viewport-y'))
  const zoomedScale = (zoomedSceneBounds.width / 800) * 2
  const zoomedTitlePoint = {
    x: zoomedSceneBounds.x + (400 - zoomedViewportX) * zoomedScale,
    y: zoomedSceneBounds.y + (210 - zoomedViewportY) * zoomedScale,
  }
  await page.mouse.move(zoomedTitlePoint.x, zoomedTitlePoint.y)
  await page.mouse.down()
  await page.mouse.move(
    zoomedTitlePoint.x + 20,
    zoomedTitlePoint.y + 20,
    { steps: 4 },
  )
  await page.mouse.up()
  await expect
    .poll(async () => {
      const status = (await selectionStatus.textContent()) ?? ''
      const position = status.match(/x (\d+) · y (\d+)/)

      return Boolean(
        position && Number(position[1]) > 80 && Number(position[2]) > 176,
      )
    })
    .toBe(true)

  await page.getByRole('button', { name: 'Reset demo' }).click()
  await zoomSlider.fill('200')

  const zoomedMinimapBounds = await minimap.boundingBox()
  if (!zoomedMinimapBounds) {
    throw new Error('The zoomed minimap did not produce visible bounds.')
  }
  await page.mouse.click(
    zoomedMinimapBounds.x + zoomedMinimapBounds.width * 0.9,
    zoomedMinimapBounds.y + zoomedMinimapBounds.height * 0.1,
  )
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-viewport-x')))
    .toBeGreaterThan(200)

  await zoomSlider.fill('50')
  await expect(canvas).toHaveAttribute('data-zoom-percent', '50')
  await expect(canvas).toHaveAttribute('data-viewport-x', '0')
  await expect(canvas).toHaveAttribute('data-viewport-width', '800')

  await page.getByRole('button', { name: 'Fit Width' }).click()
  await expect(zoomSlider).toHaveValue('100')
  await expect(canvas).toHaveAttribute('data-viewport-x', '0')

  const minimapBounds = await minimap.boundingBox()
  if (!minimapBounds) {
    throw new Error('The minimap did not produce visible bounds.')
  }
  await page.mouse.click(
    minimapBounds.x + minimapBounds.width / 2,
    minimapBounds.y + minimapBounds.height * 0.8,
  )
  await expect
    .poll(async () => Number(await episodePosition.getAttribute('data-viewport-y')))
    .toBeGreaterThan(2_500)

  await contentPlane2.click()
  const finalCaptionLayer = page.locator(
    '[data-layer-id="beat-06-dawn-caption"]',
  )
  await finalCaptionLayer.click()
  await expect(finalCaptionLayer).toHaveAttribute('aria-pressed', 'true')
  await expect(selectionStatus).toContainText('Beat 6 · Dawn · Caption')

  await page.getByRole('button', { name: 'Reset demo' }).click()
  await expect(episodePosition).toHaveAttribute('data-viewport-y', '0')
  await expect
    .poll(() => readLogicalCanvasPixel(sceneCanvas, 100, 210))
    .toBe('33,25,52')
  const sceneCanvasBounds = await sceneCanvas.boundingBox()
  if (!sceneCanvasBounds) {
    throw new Error('The editing surface did not produce visible bounds.')
  }
  const fitScale = sceneCanvasBounds.width / 800
  const titlePoint = {
    x: sceneCanvasBounds.x + 400 * fitScale,
    y: sceneCanvasBounds.y + 210 * fitScale,
  }
  await page.mouse.click(titlePoint.x, titlePoint.y)
  await expect(selectionStatus).toContainText('x 80 · y 176')
  await expect(contentGroup).toHaveAttribute('aria-pressed', 'true')
  await expect(contentPlane2).toHaveAttribute('aria-pressed', 'true')
  await expect(firstTitleLayer).toHaveAttribute('aria-pressed', 'true')

  await page.mouse.move(titlePoint.x, titlePoint.y)
  await page.mouse.down()
  await page.mouse.move(
    titlePoint.x + 50 * fitScale,
    titlePoint.y + 40 * fitScale,
    { steps: 5 },
  )
  await page.mouse.up()
  await expect(selectionStatus).toContainText(/x (129|130) · y 216/)

  await page.getByRole('button', { name: 'Reset demo' }).click()
  await contentPlane2.click()
  await firstTitleLayer.click()
  await expect(selectionStatus).toContainText('x 80 · y 176')

  await page.getByRole('button', { name: 'Reset demo' }).click()
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1024, height: 768 },
  ]) {
    await page.setViewportSize(viewport)
    const responsiveEpisodeLabelX = await readLocatorX(episodeLabel)
    const responsiveResetX = await readLocatorX(resetDemo)
    await expectHorizontalCentersToMatch(editEpisodeTitle, appHeader)
    const responsiveTitleBounds = await readLocatorBounds(editEpisodeTitle)
    await editEpisodeTitle.click()
    await expect(episodeTitleInput).toBeFocused()
    const responsiveInputBounds = await readLocatorBounds(episodeTitleInput)
    expect(
      Math.abs(responsiveInputBounds.x - responsiveTitleBounds.x),
    ).toBeLessThan(1)
    expect(
      Math.abs(
        (await readLocatorX(episodeLabel)) - responsiveEpisodeLabelX,
      ),
    ).toBeLessThan(1)
    expect(
      Math.abs((await readLocatorX(resetDemo)) - responsiveResetX),
    ).toBeLessThan(1)
    await episodeTitleInput.fill('x'.repeat(60))
    const responsiveLongInputBounds = await readLocatorBounds(episodeTitleInput)
    expect(
      Math.abs(responsiveLongInputBounds.x - responsiveInputBounds.x),
    ).toBeLessThan(1)
    expect(
      responsiveLongInputBounds.x + responsiveLongInputBounds.width,
    ).toBeLessThan(responsiveResetX)
    expect(
      Math.abs(
        (await readLocatorX(episodeLabel)) - responsiveEpisodeLabelX,
      ),
    ).toBeLessThan(1)
    expect(
      Math.abs((await readLocatorX(resetDemo)) - responsiveResetX),
    ).toBeLessThan(1)
    await episodeTitleInput.press('Enter')
    await expectHorizontalCentersToMatch(editEpisodeTitle, appHeader)
    expect(
      Math.abs(
        (await readLocatorX(episodeLabel)) - responsiveEpisodeLabelX,
      ),
    ).toBeLessThan(1)
    expect(
      Math.abs((await readLocatorX(resetDemo)) - responsiveResetX),
    ).toBeLessThan(1)
    await expect(canvas).toHaveAttribute('data-ready', 'true')
    await expect(inspector).toBeVisible()
    await expect(contentGroup).toBeVisible()
    await expect(contentPlane1).toBeVisible()
    await expect
      .poll(async () => (await inspector.boundingBox())?.y ?? -1)
      .toBe(0)
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true)
    const headerRegions = await page.evaluate(() => {
      const brand = document.querySelector('.brand-lockup')?.getBoundingClientRect()
      const episode = document
        .querySelector('.episode-heading')
        ?.getBoundingClientRect()
      const reset = document.querySelector('.reset-button')?.getBoundingClientRect()

      return brand && episode && reset
        ? {
            brandRight: brand.right,
            episodeLeft: episode.left,
            episodeRight: episode.right,
            resetLeft: reset.left,
          }
        : null
    })
    expect(headerRegions).not.toBeNull()
    expect(headerRegions?.episodeLeft).toBeGreaterThanOrEqual(
      headerRegions?.brandRight ?? 0,
    )
    expect(headerRegions?.episodeRight).toBeLessThanOrEqual(
      headerRegions?.resetLeft ?? 0,
    )

    await page.getByRole('button', { name: 'Reset demo' }).click()
  }

  await expect
    .poll(async () => (await canvas.boundingBox())?.height ?? 0)
    .toBeLessThan(650)
})
