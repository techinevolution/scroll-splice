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

  await expect(canvas).toHaveAttribute('data-ready', 'true')
  await expect(episodePosition).toHaveAttribute(
    'aria-describedby',
    'minimap-navigation-help minimap-position-status',
  )
  await expect(page.locator('#minimap-position-status')).toContainText(
    'Viewport starts at x 0, y 0',
  )
  await expect(canvas).toHaveAttribute('data-base-color', '#F3F0EA')
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

  await editEpisodeTitle.click()
  await expect(episodeTitleInput).toBeFocused()
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
  const assetToggle = page.getByRole('button', { name: 'Assets' })
  await expect(assetToggle).toHaveAttribute('aria-expanded', 'true')
  await page.getByRole('button', { name: 'Add Violet demo shape' }).click()
  const syntheticShapeRow = page.locator(
    '[data-layer-id="synthetic-shape-1"]',
  )
  await expect(syntheticShapeRow).toHaveAttribute('aria-pressed', 'true')
  await expect(panelList.getByRole('listitem')).toHaveCount(7)
  await page
    .getByRole('button', { name: 'Delete Violet demo shape' })
    .click()
  await expect(syntheticShapeRow).toHaveCount(0)
  await expect(panelList.getByRole('listitem')).toHaveCount(6)
  await assetToggle.click()
  await expect(assetToggle).toHaveAttribute('aria-expanded', 'false')

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
  await expect(
    page.getByRole('button', { name: 'Background plane 1', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(
    page.getByRole('button', {
      name: 'Delete plane unavailable: Background plane 1 is pinned and cannot be deleted.',
    }),
  ).toBeDisabled()
  const baseColor = page.getByLabel('Base color', { exact: true })
  const canvasBaseColor = page.getByLabel('Canvas base color', { exact: true })
  await expect(baseColor).toHaveValue('#f3f0ea')
  await expect(canvasBaseColor).toHaveValue('#f3f0ea')
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
  await page.getByLabel('Color region length').fill('600')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  const colorRegionRow = page.locator(
    '[data-layer-id="background-color-region-1"]',
  )
  await expect(colorRegionRow).toHaveAttribute('aria-pressed', 'true')
  await expect(
    minimap.locator('[data-element-id="background-color-region-1"]'),
  ).toHaveAttribute('fill', '#334477')

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
  const fineTuneHeight = page.getByRole('button', {
    name: /Fine tune episode height/,
  })
  await expect(fineTuneHeight).toBeVisible()
  const fineTuneBounds = await fineTuneHeight.boundingBox()
  if (!fineTuneBounds) {
    throw new Error('The fine height handle did not produce visible bounds.')
  }
  await page.mouse.move(
    fineTuneBounds.x + fineTuneBounds.width / 2,
    fineTuneBounds.y + fineTuneBounds.height / 2,
  )
  await page.mouse.down()
  await page.mouse.move(
    fineTuneBounds.x + fineTuneBounds.width / 2,
    fineTuneBounds.y + fineTuneBounds.height / 2 - 24,
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
    name: 'Add scroll space 1,280u',
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

  await assetToggle.click()
  await expect(assetToggle).toHaveAttribute('aria-expanded', 'true')
  await expect(
    page.getByRole('heading', { level: 2, name: 'Synthetic assets' }),
  ).toBeVisible()
  await assetToggle.click()
  await expect(assetToggle).toHaveAttribute('aria-expanded', 'false')

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
    await editEpisodeTitle.click()
    await episodeTitleInput.fill('x'.repeat(60))
    await episodeTitleInput.press('Enter')
    await page.setViewportSize(viewport)
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
