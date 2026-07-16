import { expect, test, type Page } from '@playwright/test'

async function useMenuItem(
  page: Page,
  menuName: 'Window' | 'Help',
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
  const inspector = page.getByRole('complementary', {
    name: 'Episode overview and layers',
  })
  const minimap = page.getByTestId('minimap')
  const minimapBase = page.getByTestId('minimap-base')
  const inspectorToggle = page.getByRole('button', {
    name: 'Hide inspector',
  })

  await expect(canvas).toHaveAttribute('data-ready', 'true')
  await expect(inspector).toBeVisible()
  await expect(inspector).toHaveCSS('position', 'fixed')
  await expect(inspectorToggle).toHaveAttribute('aria-expanded', 'true')

  const [workspaceBounds, minimapBounds, minimapBaseBounds] =
    await Promise.all([
      page.locator('.editor-workspace').boundingBox(),
      minimap.boundingBox(),
      minimapBase.boundingBox(),
    ])

  if (!workspaceBounds || !minimapBounds || !minimapBaseBounds) {
    throw new Error('The constrained editor and minimap need visible bounds.')
  }

  expect(workspaceBounds.x + workspaceBounds.width).toBeGreaterThan(1000)
  expect(minimapBaseBounds.width / minimapBaseBounds.height).toBeCloseTo(
    800 / 4_600,
    2,
  )
  expect(minimapBaseBounds.width).toBeLessThan(minimapBounds.width - 8)

  await page.mouse.click(
    minimapBaseBounds.x + minimapBaseBounds.width / 2,
    minimapBaseBounds.y + minimapBaseBounds.height * 0.8,
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
