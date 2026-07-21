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
  await page.getByRole('button', { name: menuName, exact: true }).click()
  const item = page
    .getByRole('menu', { name: menuName })
    .getByRole('menuitem', { name: itemName, exact: true })

  await expect(item).toBeEnabled()
  await item.click()
}

async function applyBalloonProperties(page: Page) {
  const controls = page.getByTestId('selected-balloon-controls')

  await controls.getByLabel('Editable balloon type').selectOption('wavy')
  await controls.getByLabel('Editable balloon fill color').fill('#fff4d6')
  await controls.getByLabel('Editable balloon outline color').fill('#34213d')
  await controls.getByLabel('Editable balloon tail side').selectOption('right')
  await controls.getByLabel('Editable balloon tail anchor').fill('0.7')
  await controls.getByLabel('Editable balloon tail tip X').fill('1.25')
  await controls.getByLabel('Editable balloon tail tip Y').fill('0.6')
  await controls.getByRole('button', { name: 'Apply balloon' }).click()
}

test('edits an empty balloon body and preserves it through save, reopen, and reader preview', async ({
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

  await useMenuItem(page, 'File', 'New Episode')
  await useMenuItem(page, 'View', 'Show Details Bar')
  await page
    .getByRole('button', { name: 'Speech Balloons', exact: true })
    .click()
  await page.getByTestId('add-editable-balloon').click()
  await page.getByRole('button', { name: 'Close Asset Library' }).click()

  const balloonRow = page.locator('[data-layer-id="speech-balloon-1"]')
  const controls = page.getByTestId('selected-balloon-controls')
  await expect(balloonRow).toHaveAttribute('aria-pressed', 'true')
  await expect(controls).toBeVisible()
  await applyBalloonProperties(page)

  await expect(page.getByTestId('editor-canvas')).toHaveAttribute(
    'data-selected-element-id',
    'speech-balloon-1',
  )
  await expect(controls.getByLabel('Editable balloon wording')).toHaveCount(0)
  await expect(controls.getByLabel('Editable balloon type')).toHaveValue('wavy')
  await expect(
    controls.getByLabel('Editable balloon fill color'),
  ).toHaveValue('#fff4d6')
  await expect(
    controls.getByLabel('Editable balloon tail side'),
  ).toHaveValue('right')

  await useMenuItem(page, 'File', 'Save')
  await expect(page.getByTestId('document-status')).toHaveText('Saved Locally')

  await controls.getByLabel('Editable balloon fill color').fill('#f0d8ff')
  await controls.getByRole('button', { name: 'Apply balloon' }).click()
  await expect(page.getByTestId('document-status')).toHaveText(
    'Unsaved Changes',
  )

  page.once('dialog', (dialog) => dialog.accept())
  await useMenuItem(page, 'File', 'Reopen Current')
  await balloonRow.click()
  await expect(controls.getByLabel('Editable balloon wording')).toHaveCount(0)
  await expect(controls.getByLabel('Editable balloon type')).toHaveValue('wavy')
  await expect(
    controls.getByLabel('Editable balloon outline color'),
  ).toHaveValue('#34213d')
  await expect(
    controls.getByLabel('Editable balloon tail tip X'),
  ).toHaveValue('1.25')

  await useMenuItem(page, 'View', 'Reader Preview')
  const readerBalloon = page.getByTestId(
    'reader-preview-element-speech-balloon-1',
  )
  await expect(readerBalloon).toHaveAttribute(
    'data-reader-element-type',
    'speech-balloon',
  )
  await expect(readerBalloon).toHaveText('')
  await expect(readerBalloon.locator('path').first()).toHaveAttribute(
    'fill',
    '#fff4d6',
  )
  await page.getByTestId('reader-preview-close').click()
})
