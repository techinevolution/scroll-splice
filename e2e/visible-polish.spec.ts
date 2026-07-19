import { expect, test, type Page } from '@playwright/test'

async function useMenuItem(
  page: Page,
  menuName: 'View' | 'Window' | 'Help',
  itemName: string,
) {
  await page.getByRole('button', { name: menuName, exact: true }).click()
  await page.getByRole('menuitem', { name: itemName, exact: true }).click()
}

test('fits minimap geometry and exposes constrained inspector and help controls', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 })
  await page.goto('/')

  const canvas = page.getByTestId('editor-canvas')
  const brandMark = page.getByTestId('brand-mark')
  const brandNameScroll = page.locator('.brand-name-scroll')
  const brandNameSplice = page.locator('.brand-name-splice')
  const inspector = page.getByRole('complementary', {
    name: 'Episode overview and layers',
  })
  const minimap = page.getByTestId('minimap')
  const minimapScroller = page.getByTestId('minimap-scroll-viewport')
  const minimapBase = page.getByTestId('minimap-base')
  const inspectorToggle = page.getByRole('button', {
    name: 'Hide inspector',
  })

  await expect(canvas).toHaveAttribute('data-ready', 'true')
  await expect(brandMark).toBeVisible()
  await expect(brandNameScroll).toHaveText('Scroll')
  await expect(brandNameSplice).toHaveText('Splice')
  expect(
    await brandMark.evaluate((image) => image.naturalWidth),
  ).toBeGreaterThan(0)
  await expect(inspector).toBeVisible()
  await expect(inspector).toHaveCSS('position', 'fixed')
  await expect(inspectorToggle).toHaveAttribute('aria-expanded', 'true')

  const [workspaceBounds, minimapBounds, minimapBaseBounds, scrollerBounds] =
    await Promise.all([
      page.locator('.editor-workspace').boundingBox(),
      minimap.boundingBox(),
      minimapBase.boundingBox(),
      minimapScroller.boundingBox(),
    ])

  if (
    !workspaceBounds ||
    !minimapBounds ||
    !minimapBaseBounds ||
    !scrollerBounds
  ) {
    throw new Error('The constrained editor and minimap need visible bounds.')
  }

  expect(workspaceBounds.x + workspaceBounds.width).toBeGreaterThan(1000)
  expect(minimapBounds.width).toBeGreaterThan(100)
  expect(
    await minimapScroller.evaluate(
      (element) => element.scrollHeight > element.clientHeight,
    ),
  ).toBe(true)
  expect(minimapBaseBounds.width / minimapBaseBounds.height).toBeCloseTo(
    800 / 7_360,
    2,
  )
  expect(minimapBaseBounds.width).toBeGreaterThan(minimapBounds.width - 4)

  const zoomSlider = page.getByRole('slider', { name: 'Canvas zoom' })
  await zoomSlider.fill('200')
  const expandedViewportFrame = page.getByTestId('minimap-viewport')
  const expandedFrameBounds = await expandedViewportFrame.boundingBox()
  if (!expandedFrameBounds) {
    throw new Error('The expanded minimap viewport frame needs visible bounds.')
  }

  const viewportXBeforeExpandedFrameDrag = Number(
    await canvas.getAttribute('data-viewport-x'),
  )
  const leftExpansionCenterX =
    expandedFrameBounds.x + expandedFrameBounds.width * (24 / 496)
  const frameCenterY =
    expandedFrameBounds.y + expandedFrameBounds.height / 2

  await page.mouse.move(leftExpansionCenterX, frameCenterY)
  await page.mouse.down()
  await page.mouse.move(leftExpansionCenterX + 10, frameCenterY, { steps: 4 })
  await page.mouse.up()
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-viewport-x')))
    .toBeGreaterThan(viewportXBeforeExpandedFrameDrag)

  await zoomSlider.fill('100')

  await minimapScroller.evaluate((element) => {
    element.scrollTop = element.scrollHeight - element.clientHeight
  })
  await page.mouse.click(
    minimapBaseBounds.x + minimapBaseBounds.width / 2,
    scrollerBounds.y + scrollerBounds.height * 0.75,
  )
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-viewport-y')))
    .toBeGreaterThan(2_500)

  await page.getByRole('button', { name: 'Close inspector' }).click()
  await expect(inspector).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Show inspector' }),
  ).toBeFocused()

  await page.getByRole('button', { name: 'Show inspector' }).click()
  await expect(inspector).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(inspector).toHaveCount(0)

  await useMenuItem(page, 'Window', 'Show Inspector')
  await expect(inspector).toBeVisible()
  await useMenuItem(page, 'Window', 'Hide Inspector')
  await expect(inspector).toHaveCount(0)

  await useMenuItem(page, 'Help', 'Shortcuts & About')
  const helpDialog = page.getByRole('dialog', { name: 'ScrollSplice help' })
  await expect(helpDialog).toBeVisible()
  await expect(helpDialog).toContainText('Bypass snapping while dragging')
  await expect(helpDialog).toContainText('local-first editor')
  await page.keyboard.press('Escape')
  await expect(helpDialog).toHaveCount(0)
})


test('switches and remembers the selected appearance and optional details bar', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')

  const shell = page.locator('.app-shell')
  await expect(shell).toHaveAttribute('data-theme', 'dark')
  await expect(page.getByTestId('details-bar')).toHaveCount(0)
  await expect(page.getByLabel('All changes saved locally.')).toBeVisible()

  await useMenuItem(page, 'View', 'Use Light Mode')
  await expect(shell).toHaveAttribute('data-theme', 'light')
  await expect(shell).toHaveCSS('background-color', 'rgb(238, 241, 239)')

  await useMenuItem(page, 'View', 'Show Details Bar')
  await expect(page.getByTestId('details-bar')).toBeVisible()
  await expect(page.getByTestId('selection-status')).toHaveText(
    'Nothing selected',
  )

  await page.reload()
  await expect(shell).toHaveAttribute('data-theme', 'light')
  await expect(page.getByTestId('details-bar')).toBeVisible()

  await useMenuItem(page, 'View', 'Use Dark Mode')
  await expect(shell).toHaveAttribute('data-theme', 'dark')
  await useMenuItem(page, 'View', 'Hide Details Bar')
  await expect(page.getByTestId('details-bar')).toHaveCount(0)
})
