import { expect, test, type Page } from '@playwright/test'

async function useMenuItem(
  page: Page,
  menuName: 'File' | 'View',
  itemName:
    | 'New Episode'
    | 'Save'
    | 'Reopen Current'
    | 'Reader Preview'
    | 'Show Details Bar',
) {
  const trigger = page.getByRole('button', { name: menuName, exact: true })
  await trigger.click()

  const menu = page.getByRole('menu', { name: menuName })
  await expect(menu).toBeVisible()
  const item = menu.getByRole('menuitem', { name: itemName, exact: true })
  await expect(item).toBeEnabled()
  await item.click()
}

async function editEpisodeTitle(page: Page, title: string) {
  await page
    .getByRole('button', { name: /Edit episode title:/ })
    .click()
  const input = page.getByRole('textbox', { name: 'Episode title' })
  await input.fill(title)
  await input.press('Enter')
}

async function answerNextDialog(
  page: Page,
  expectedMessage: string,
  answer: 'accept' | 'dismiss',
  action: () => Promise<void>,
) {
  let actualMessage = ''

  page.once('dialog', async (dialog) => {
    actualMessage = dialog.message()
    if (answer === 'accept') {
      await dialog.accept()
    } else {
      await dialog.dismiss()
    }
  })

  await action()
  expect(actualMessage).toBe(expectedMessage)
}

test('supports a creator story from blank episode through saved reader preview', async ({
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

  // A creator begins a fresh episode and gives the workspace a meaningful name.
  await useMenuItem(page, 'File', 'New Episode')
  await useMenuItem(page, 'View', 'Show Details Bar')
  await editEpisodeTitle(page, 'Moonlit Garden')

  // They organize broad visual planes before placing story content.
  await page
    .getByRole('button', { name: 'Background composition group' })
    .click()
  await page
    .getByRole('button', { name: 'Background plane 2', exact: true })
    .click()
  const planeName = page.getByTestId('active-layer-plane-name')
  await planeName.fill('Evening color')
  await page.keyboard.press('Control+s')
  await expect(page.getByTestId('document-status')).toHaveText('Saved Locally')
  await page.reload()
  await page
    .getByRole('button', { name: 'Background composition group' })
    .click()
  await page
    .getByRole('button', { name: 'Background plane 2', exact: true })
    .click()
  await expect(planeName).toHaveValue('Evening color')

  await page.getByRole('button', { name: 'Add Background plane' }).click()
  await planeName.fill('Vignette')
  await planeName.press('Enter')
  await page
    .getByTestId('layer-plane-drag-grip-background-plane-3')
    .dragTo(
      page.locator('[data-layer-plane-id="background-plane-2"]'),
      { targetPosition: { x: 4, y: 18 } },
    )
  await expect(
    page.getByRole('button', { name: 'Background plane 2', exact: true }),
  ).toHaveAttribute('title', 'Vignette')

  await page
    .getByRole('button', { name: 'Content composition group' })
    .click()
  await planeName.fill('Panels')
  await planeName.press('Enter')
  await page.getByRole('button', { name: 'Add Content plane' }).click()
  await planeName.fill('Lettering')
  await planeName.press('Enter')

  // A transparent decoration and independent wording are assembled on one plane.
  await page
    .getByRole('button', { name: 'Decorations', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Add Radiance accent', exact: true })
    .click()
  await expect(page.locator('[data-layer-id="image-element-1"]')).toBeVisible()
  await page.getByRole('button', { name: 'Add Text', exact: true }).click()
  await expect(page.getByTestId('selected-text-controls')).toBeVisible()
  await page
    .getByTestId('selected-text-wording')
    .fill('Meet me where the roots remember.')
  await page.getByTestId('selected-text-font-size').fill('40')
  await page.getByTestId('selected-text-font-weight').selectOption('700')
  await page.getByTestId('selected-text-alignment').selectOption('center')
  await page.getByTestId('selected-text-apply').click()
  await expect(page.getByTestId('editor-canvas')).toHaveAttribute(
    'data-selected-element-id',
    'text-element-1',
  )

  // Stack controls explain overlap, and Move to Plane reorganizes without
  // forcing the creator to delete and re-place anything.
  const sendBackward = page.getByRole('button', {
    name: 'Send Text 1 backward',
  })
  await expect(sendBackward).toBeEnabled()
  await sendBackward.click()
  await expect(sendBackward).toBeDisabled()
  await page.getByRole('button', { name: 'Bring Text 1 forward' }).click()

  await page.getByTestId('move-element-plane-select').selectOption(
    'content-plane-1',
  )
  await page.getByTestId('move-element-plane-submit').click()
  await expect(
    page.locator('[data-layer-id="text-element-1"]'),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(planeName).toHaveValue('Panels')

  // Reader Preview removes editor chrome while preserving the exact document.
  const editorViewportBeforePreview = await page
    .getByTestId('editor-canvas')
    .evaluate((canvas) => ({
      x: canvas.getAttribute('data-viewport-x'),
      y: canvas.getAttribute('data-viewport-y'),
    }))
  await useMenuItem(page, 'View', 'Reader Preview')
  const preview = page.getByTestId('reader-preview')
  const closePreview = page.getByTestId('reader-preview-close')
  await expect(preview).toBeVisible()
  await expect(closePreview).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(closePreview).toBeFocused()
  await expect(page.getByTestId('reader-preview-episode-name')).toHaveText(
    'Moonlit Garden',
  )
  await expect(
    page.getByTestId('reader-preview-element-text-element-1'),
  ).toContainText('Meet me where the roots remember.')
  await page.keyboard.press('Control+z')
  await page.keyboard.press('Control+s')
  await expect(
    page.getByTestId('reader-preview-element-text-element-1'),
  ).toContainText('Meet me where the roots remember.')
  await expect(page.getByTestId('episode-heading')).toHaveAttribute(
    'data-dirty',
    'true',
  )
  await expect(preview.locator('[data-testid="selection-status"]')).toHaveCount(
    0,
  )
  await page.keyboard.press('Escape')
  await expect(preview).toHaveCount(0)
  await expect(page.getByTestId('editor-canvas')).toHaveAttribute(
    'data-selected-element-id',
    'text-element-1',
  )
  await expect(page.getByTestId('editor-canvas')).toHaveAttribute(
    'data-viewport-x',
    editorViewportBeforePreview.x ?? '',
  )
  await expect(page.getByTestId('editor-canvas')).toHaveAttribute(
    'data-viewport-y',
    editorViewportBeforePreview.y ?? '',
  )

  // The complete document survives save, reload, and preview reopening.
  await useMenuItem(page, 'File', 'Save')
  await expect(page.getByTestId('document-status')).toHaveText('Saved Locally')
  await page.reload()
  await expect(
    page.getByRole('button', {
      name: 'Edit episode title: Moonlit Garden',
      exact: true,
    }),
  ).toBeVisible()
  await expect(planeName).toHaveValue('Panels')
  await useMenuItem(page, 'View', 'Reader Preview')
  await expect(
    page.getByTestId('reader-preview-element-text-element-1'),
  ).toContainText('Meet me where the roots remember.')
  await page.getByTestId('reader-preview-close').click()

  // Reset is cancelable, and accepting it never overwrites the saved slot.
  await editEpisodeTitle(page, 'Unsaved Variation')
  await answerNextDialog(
    page,
    'Discard unsaved changes and reset the demo?',
    'dismiss',
    async () => {
      await page.getByRole('button', { name: 'File', exact: true }).click()
      await page.getByRole('menuitem', { name: 'Reset Demo' }).click()
    },
  )
  await expect(
    page.getByRole('button', {
      name: 'Edit episode title: Unsaved Variation',
      exact: true,
    }),
  ).toBeVisible()

  await answerNextDialog(
    page,
    'Discard unsaved changes and reset the demo?',
    'accept',
    async () => {
      await page.getByRole('button', { name: 'File', exact: true }).click()
      await page.getByRole('menuitem', { name: 'Reset Demo' }).click()
    },
  )
  await expect(
    page.getByRole('button', {
      name: 'Edit episode title: The Light We Planted',
      exact: true,
    }),
  ).toBeVisible()

  await answerNextDialog(
    page,
    'Discard unsaved changes and reopen the current saved project?',
    'accept',
    () => useMenuItem(page, 'File', 'Reopen Current'),
  )
  await expect(
    page.getByRole('button', {
      name: 'Edit episode title: Moonlit Garden',
      exact: true,
    }),
  ).toBeVisible()
})
