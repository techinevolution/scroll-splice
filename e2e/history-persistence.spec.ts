import { expect, test, type Locator, type Page } from '@playwright/test'

async function openApplicationMenu(page: Page, name: 'File' | 'Edit') {
  const trigger = page.getByRole('button', { name, exact: true })

  await trigger.click()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')

  const menu = page.getByRole('menu', { name })
  await expect(menu).toBeVisible()
  return menu
}

async function useApplicationMenuItem(
  page: Page,
  menuName: 'File' | 'Edit',
  itemName: 'New Episode' | 'Save' | 'Reopen Current' | 'Undo' | 'Redo',
) {
  const menu = await openApplicationMenu(page, menuName)
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
  await expect(
    page.getByRole('button', {
      name: `Edit episode title: ${title}`,
      exact: true,
    }),
  ).toBeVisible()
}

async function acceptDiscardDialog(
  page: Page,
  expectedMessage: string,
  action: () => Promise<void>,
) {
  let dialogMessage = ''

  page.once('dialog', async (dialog) => {
    dialogMessage = dialog.message()
    await dialog.accept()
  })

  await action()
  expect(dialogMessage).toBe(expectedMessage)
}

async function expectEmptyElementList(list: Locator) {
  await expect(list.getByRole('listitem')).toHaveCount(0)
}

test('preserves a saved episode and keeps history inside one document', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })

  // Load once so localStorage has an origin, then start the proof from a clean
  // browser slot. Later reloads intentionally preserve the explicit save.
  await page.goto('/')
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()

  const fileTrigger = page.getByRole('button', { name: 'File', exact: true })
  const editTrigger = page.getByRole('button', { name: 'Edit', exact: true })
  const documentStatus = page.getByTestId('document-status')
  const episodeHeading = page.getByTestId('episode-heading')

  await expect(documentStatus).toHaveText('Demo ready · not saved')
  await expect(episodeHeading).toHaveAttribute('data-dirty', 'false')

  const fileMenu = await openApplicationMenu(page, 'File')
  await expect(fileMenu.getByRole('menuitem')).toHaveText([
    'New Episode',
    'Open Local Project…',
    'Save',
    'Save As…',
    'Reopen Current',
    'Import Project…',
    'Export Project File…',
    'Export Episode Images…',
    'Reset Demo',
  ])
  await expect(
    fileMenu.getByRole('menuitem', { name: 'Reopen Current', exact: true }),
  ).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(fileTrigger).toHaveAttribute('aria-expanded', 'false')

  const editMenu = await openApplicationMenu(page, 'Edit')
  await expect(editMenu.getByRole('menuitem')).toHaveText(['Undo', 'Redo'])
  await expect(
    editMenu.getByRole('menuitem', { name: 'Undo', exact: true }),
  ).toBeDisabled()
  await expect(
    editMenu.getByRole('menuitem', { name: 'Redo', exact: true }),
  ).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(editTrigger).toHaveAttribute('aria-expanded', 'false')

  const addContentPlane = page.getByRole('button', {
    name: 'Add Content plane',
  })
  const contentPlane3 = page.getByRole('button', {
    name: 'Content plane 3',
    exact: true,
  })

  await addContentPlane.click()
  await expect(contentPlane3).toHaveAttribute('aria-pressed', 'true')
  await expect(documentStatus).toHaveText('Unsaved changes')

  const undoMenu = await openApplicationMenu(page, 'Edit')
  await expect(
    undoMenu.getByRole('menuitem', { name: 'Undo', exact: true }),
  ).toBeEnabled()
  await expect(
    undoMenu.getByRole('menuitem', { name: 'Redo', exact: true }),
  ).toBeDisabled()
  await undoMenu
    .getByRole('menuitem', { name: 'Undo', exact: true })
    .click()
  await expect(contentPlane3).toHaveCount(0)

  const redoMenu = await openApplicationMenu(page, 'Edit')
  await expect(
    redoMenu.getByRole('menuitem', { name: 'Undo', exact: true }),
  ).toBeDisabled()
  await expect(
    redoMenu.getByRole('menuitem', { name: 'Redo', exact: true }),
  ).toBeEnabled()
  await redoMenu
    .getByRole('menuitem', { name: 'Redo', exact: true })
    .click()
  await expect(contentPlane3).toHaveAttribute('aria-pressed', 'true')

  await page.keyboard.press('Control+z')
  await expect(contentPlane3).toHaveCount(0)
  await page.keyboard.press('Control+Shift+z')
  await expect(contentPlane3).toHaveAttribute('aria-pressed', 'true')

  await page
    .getByRole('button', { name: 'Decorations', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Add Radiance accent' })
    .click()

  const syntheticShapeRow = page.locator(
    '[data-layer-id="image-element-1"]',
  )
  await expect(syntheticShapeRow).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Close Asset Library' }).click()

  const savedTitle = 'History and Persistence Proof'
  await editEpisodeTitle(page, savedTitle)

  const contentPlane3Visibility = page.getByRole('button', {
    name: 'Content plane 3 visibility',
  })
  await contentPlane3Visibility.click()
  await expect(contentPlane3Visibility).toHaveAttribute(
    'aria-pressed',
    'false',
  )

  await useApplicationMenuItem(page, 'File', 'Save')
  await expect(documentStatus).toHaveText('Saved locally')
  await expect(episodeHeading).toHaveAttribute('data-dirty', 'false')
  await expect(fileTrigger).toHaveAttribute('aria-expanded', 'false')

  await page.reload()

  await expect(documentStatus).toHaveText('Opened saved episode')
  await expect(episodeHeading).toHaveAttribute('data-dirty', 'false')
  await expect(
    page.getByRole('button', {
      name: `Edit episode title: ${savedTitle}`,
      exact: true,
    }),
  ).toBeVisible()
  await expect(contentPlane3).toBeVisible()
  await expect(contentPlane3Visibility).toHaveAttribute(
    'aria-pressed',
    'false',
  )
  await contentPlane3.click()
  await expect(syntheticShapeRow).toBeVisible()

  const editMenuAfterReload = await openApplicationMenu(page, 'Edit')
  await expect(
    editMenuAfterReload.getByRole('menuitem', {
      name: 'Undo',
      exact: true,
    }),
  ).toBeDisabled()
  await expect(
    editMenuAfterReload.getByRole('menuitem', {
      name: 'Redo',
      exact: true,
    }),
  ).toBeDisabled()
  await page.keyboard.press('Escape')

  await editEpisodeTitle(page, 'Unsaved Detour')
  await contentPlane3Visibility.click()
  await expect(contentPlane3Visibility).toHaveAttribute('aria-pressed', 'true')
  await expect(documentStatus).toHaveText('Unsaved changes')

  await acceptDiscardDialog(
    page,
    'Discard unsaved changes and reopen the current saved project?',
    () => useApplicationMenuItem(page, 'File', 'Reopen Current'),
  )

  await expect(documentStatus).toHaveText('Reopened saved episode')
  await expect(episodeHeading).toHaveAttribute('data-dirty', 'false')
  await expect(
    page.getByRole('button', {
      name: `Edit episode title: ${savedTitle}`,
      exact: true,
    }),
  ).toBeVisible()
  await expect(contentPlane3Visibility).toHaveAttribute(
    'aria-pressed',
    'false',
  )
  await contentPlane3.click()
  await expect(syntheticShapeRow).toBeVisible()

  await useApplicationMenuItem(page, 'File', 'New Episode')

  await expect(documentStatus).toHaveText('New episode · not saved')
  await expect(episodeHeading).toHaveAttribute('data-dirty', 'true')
  await expect(
    page.getByRole('button', {
      name: 'Edit episode title: Untitled Episode',
      exact: true,
    }),
  ).toBeVisible()
  await expect(page.getByTestId('editor-canvas')).toHaveAttribute(
    'data-episode-height',
    '1280',
  )
  await expect(contentPlane3).toHaveCount(0)
  await expectEmptyElementList(page.getByTestId('layer-elements-list'))

  const editMenuAfterNewEpisode = await openApplicationMenu(page, 'Edit')
  await expect(
    editMenuAfterNewEpisode.getByRole('menuitem', {
      name: 'Undo',
      exact: true,
    }),
  ).toBeDisabled()
  await expect(
    editMenuAfterNewEpisode.getByRole('menuitem', {
      name: 'Redo',
      exact: true,
    }),
  ).toBeDisabled()
  await page.keyboard.press('Escape')

  await acceptDiscardDialog(
    page,
    'Discard unsaved changes and reopen the current saved project?',
    () => useApplicationMenuItem(page, 'File', 'Reopen Current'),
  )

  await expect(documentStatus).toHaveText('Reopened saved episode')
  await expect(
    page.getByRole('button', {
      name: `Edit episode title: ${savedTitle}`,
      exact: true,
    }),
  ).toBeVisible()
  await expect(contentPlane3).toBeVisible()
  await expect(contentPlane3Visibility).toHaveAttribute(
    'aria-pressed',
    'false',
  )
  await contentPlane3.click()
  await expect(syntheticShapeRow).toBeVisible()

  const finalEditMenu = await openApplicationMenu(page, 'Edit')
  await expect(
    finalEditMenu.getByRole('menuitem', { name: 'Undo', exact: true }),
  ).toBeDisabled()
  await expect(
    finalEditMenu.getByRole('menuitem', { name: 'Redo', exact: true }),
  ).toBeDisabled()
})
