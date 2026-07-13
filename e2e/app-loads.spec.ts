import { expect, test } from '@playwright/test'

test('completes the core ScrollSplice editor walkthrough', async ({
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
  await expect(
    page.getByRole('button', { name: 'Content composition group' }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(
    page.getByRole('heading', { level: 2, name: 'Layers · Content' }),
  ).toBeVisible()
  await expect(page.getByRole('list', { name: 'Content layers' })).toBeVisible()
  await expect(page.getByRole('listitem')).toHaveCount(12)
  await expect(page.getByTestId('selection-status')).toHaveText(
    'Nothing selected',
  )
  const canvas = page.getByTestId('editor-canvas')
  await expect(canvas).toHaveAttribute('data-ready', 'true')
  const sceneCanvas = canvas.locator('canvas').first()
  const readEpisodeSample = () =>
    sceneCanvas.evaluate((surface) => {
      const context = surface.getContext('2d')

      if (!context || surface.width < 100) {
        return 'not-ready'
      }

      const deviceScale = surface.width / 800
      const pixel = context.getImageData(
        Math.round(100 * deviceScale),
        Math.round(210 * deviceScale),
        1,
        1,
      ).data

      return `${pixel[0]},${pixel[1]},${pixel[2]}`
    })

  await expect.poll(readEpisodeSample).toBe('33,25,52')

  const backgroundGroup = page.getByRole('button', {
    name: 'Background composition group',
  })
  const contentGroup = page.getByRole('button', {
    name: 'Content composition group',
  })
  const foregroundGroup = page.getByRole('button', {
    name: 'Foreground composition group',
  })

  await backgroundGroup.click()
  await expect(
    page.getByRole('heading', { level: 2, name: 'Layers · Background' }),
  ).toBeVisible()
  await expect(page.getByRole('listitem')).toHaveCount(6)
  await expect.poll(readEpisodeSample).toBe('33,25,52')

  const firstBackgroundLayer = page.locator(
    '[data-layer-id="beat-01-stillness-background"]',
  )
  const firstBackgroundEye = page.getByRole('button', {
    name: 'Beat 1 · Stillness · Background visibility',
  })
  const minimapFirstBackground = page
    .getByTestId('minimap')
    .locator('[data-element-id="beat-01-stillness-background"]')

  await firstBackgroundLayer.click()
  await expect(firstBackgroundLayer).toHaveAttribute('aria-pressed', 'true')
  await firstBackgroundEye.click()
  await expect(page.getByTestId('selection-status')).toHaveText(
    'Nothing selected',
  )
  await expect(firstBackgroundLayer).toBeDisabled()
  await expect.poll(readEpisodeSample).toBe('243,240,234')
  await expect(minimapFirstBackground).toHaveCount(0)

  const backgroundGroupEye = page.getByRole('button', {
    name: 'Background group visibility',
  })

  await backgroundGroupEye.click()
  await expect(backgroundGroupEye).toHaveAttribute('aria-pressed', 'false')
  await expect(
    page.getByText(
      'Background is hidden on the canvas. Individual eye settings are preserved.',
    ),
  ).toBeVisible()
  await backgroundGroupEye.click()
  await expect(backgroundGroupEye).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(readEpisodeSample).toBe('243,240,234')
  await firstBackgroundEye.click()
  await expect.poll(readEpisodeSample).toBe('33,25,52')
  await expect(minimapFirstBackground).toHaveCount(1)

  await foregroundGroup.click()
  await expect(
    page.getByRole('heading', { level: 2, name: 'Layers · Foreground' }),
  ).toBeVisible()
  await expect(page.getByRole('listitem')).toHaveCount(12)
  await contentGroup.click()
  await expect(page.getByRole('listitem')).toHaveCount(12)

  const assetToggle = page.getByRole('button', { name: 'Assets' })
  await assetToggle.click()
  await expect(assetToggle).toHaveAttribute('aria-expanded', 'true')
  await expect(
    page.getByRole('heading', { level: 2, name: 'Synthetic assets' }),
  ).toBeVisible()
  await assetToggle.click()
  await expect(assetToggle).toHaveAttribute('aria-expanded', 'false')

  const minimap = page.getByTestId('minimap')
  const minimapBounds = await minimap.boundingBox()

  if (!minimapBounds) {
    throw new Error('The minimap did not produce visible bounds.')
  }

  await page.mouse.click(
    minimapBounds.x + minimapBounds.width / 2,
    minimapBounds.y + minimapBounds.height * 0.8,
  )

  const episodePosition = page.getByRole('slider', {
    name: 'Episode position',
  })
  await expect
    .poll(async () => Number(await episodePosition.getAttribute('aria-valuenow')))
    .toBeGreaterThan(2_500)

  const finalCaptionLayer = page.locator(
    '[data-layer-id="beat-06-dawn-caption"]',
  )
  await finalCaptionLayer.click()
  await expect(finalCaptionLayer).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('selection-status')).toContainText(
    'Beat 6 · Dawn · Caption',
  )

  await page.getByRole('button', { name: 'Reset demo' }).click()
  await expect(episodePosition).toHaveAttribute('aria-valuenow', '0')
  await expect(page.getByTestId('selection-status')).toHaveText(
    'Nothing selected',
  )
  await expect.poll(readEpisodeSample).toBe('33,25,52')

  const canvasBounds = await canvas.boundingBox()

  if (!canvasBounds) {
    throw new Error('The editing canvas did not produce visible bounds.')
  }

  const fitScale = canvasBounds.width / 800
  const foregroundPoint = {
    x: canvasBounds.x + 400 * fitScale,
    y: canvasBounds.y + 422 * fitScale,
  }
  const firstForegroundLayer = page.locator(
    '[data-layer-id="beat-01-stillness-accent-2"]',
  )

  await page.mouse.click(foregroundPoint.x, foregroundPoint.y)
  await expect(foregroundGroup).toHaveAttribute('aria-pressed', 'true')
  await expect(firstForegroundLayer).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('button', { name: 'Reset demo' }).click()
  await expect(contentGroup).toHaveAttribute('aria-pressed', 'true')

  const titlePoint = {
    x: canvasBounds.x + 400 * fitScale,
    y: canvasBounds.y + 210 * fitScale,
  }
  const firstTitleLayer = page.locator(
    '[data-layer-id="beat-01-stillness-title"]',
  )

  await page.mouse.click(titlePoint.x, titlePoint.y)
  await expect(firstTitleLayer).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('selection-status')).toContainText(
    'x 80 · y 176',
  )

  await page.mouse.move(titlePoint.x, titlePoint.y)
  await page.mouse.down()
  await page.mouse.move(
    titlePoint.x + 50 * fitScale,
    titlePoint.y + 40 * fitScale,
    { steps: 5 },
  )
  await page.mouse.up()
  await expect(page.getByTestId('selection-status')).toContainText(
    'x 130 · y 216',
  )

  await page.getByRole('button', { name: 'Reset demo' }).click()
  await firstTitleLayer.click()
  await expect(page.getByTestId('selection-status')).toContainText(
    'x 80 · y 176',
  )

  await page.getByRole('button', { name: 'Reset demo' }).click()
  await expect.poll(readEpisodeSample).toBe('33,25,52')
  await expect(finalCaptionLayer).toBeVisible()
  await page.setViewportSize({ width: 1280, height: 720 })
  await expect
    .poll(async () => (await canvas.boundingBox())?.height ?? 0)
    .toBeLessThan(600)
  await expect.poll(readEpisodeSample).toBe('33,25,52')
  await expect(finalCaptionLayer).toBeVisible()

  await page.setViewportSize({ width: 1024, height: 768 })
  await expect(contentGroup).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Content group visibility' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { level: 2, name: 'Layers · Content' }),
  ).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true)
})
