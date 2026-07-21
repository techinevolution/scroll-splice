import { expect, test, type Page } from '@playwright/test'

async function useFileMenuItem(page: Page, name: string) {
  await page.getByRole('button', { name: 'File', exact: true }).click()
  const item = page.getByRole('menuitem', { name, exact: true })
  await expect(item).toBeEnabled()
  await item.click()
}

async function editEpisodeTitle(page: Page, title: string) {
  await page.getByRole('button', { name: /Edit episode title:/ }).click()
  const input = page.getByRole('textbox', { name: 'Episode title' })
  await input.fill(title)
  await input.press('Enter')
}

test('recovers work, manages local projects, and round-trips a portable project', async ({
  page,
}) => {
  test.setTimeout(60_000)
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/')
  await page.evaluate(async () => {
    window.localStorage.clear()
    await new Promise<void>((resolve) => {
      const request = window.indexedDB.deleteDatabase(
        'scrollsplice-asset-library-v1',
      )
      request.onsuccess = () => resolve()
      request.onerror = () => resolve()
      request.onblocked = () => resolve()
    })
  })
  await page.reload()

  const recoveredTitle = 'Recovered Local Story'
  await editEpisodeTitle(page, recoveredTitle)
  await expect(page.getByTestId('document-status')).toHaveText(
    'Unsaved Changes',
  )

  await page.waitForTimeout(850)
  await page.reload()
  const recoveryBanner = page.getByTestId('recovery-banner')
  await expect(recoveryBanner).toBeVisible()
  await recoveryBanner.getByRole('button', { name: 'Restore' }).click()
  await expect(
    page.getByRole('button', {
      name: `Edit episode title: ${recoveredTitle}`,
      exact: true,
    }),
  ).toBeVisible()

  await useFileMenuItem(page, 'Save')
  await expect(page.getByTestId('document-status')).toHaveText('Saved Locally')
  await expect(recoveryBanner).toHaveCount(0)

  await useFileMenuItem(page, 'Save As…')
  await expect(page.getByTestId('document-status')).toHaveText(
    'Saved a New Local Project',
  )

  await useFileMenuItem(page, 'Open Local Project…')
  const projectDialog = page.getByRole('dialog', { name: 'Local Projects' })
  await expect(projectDialog).toBeVisible()
  await expect(projectDialog.locator('.project-list > li')).toHaveCount(2)
  await expect(projectDialog.getByRole('button', { name: 'Current' })).toBeDisabled()

  const nonCurrentRow = projectDialog
    .getByRole('button', { name: 'Open', exact: true })
    .first()
    .locator('xpath=../..')
  page.once('dialog', (dialog) => dialog.accept())
  await nonCurrentRow
    .getByRole('button', { name: `Delete local project ${recoveredTitle}` })
    .click()
  await expect(projectDialog.locator('.project-list > li')).toHaveCount(1)
  await projectDialog.getByRole('button', { name: 'Done' }).click()

  const downloadPromise = page.waitForEvent('download')
  await useFileMenuItem(page, 'Export Project File…')
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/\.scrollsplice$/)
  const portablePath = await download.path()
  expect(portablePath).toBeTruthy()

  await useFileMenuItem(page, 'New Episode')
  await expect(
    page.getByRole('button', {
      name: 'Edit episode title: Untitled Episode',
      exact: true,
    }),
  ).toBeVisible()

  const fileChooserPromise = page.waitForEvent('filechooser')
  await useFileMenuItem(page, 'Import Project…')
  const chooser = await fileChooserPromise
  let importConfirmationMessage = ''
  page.once('dialog', async (dialog) => {
    importConfirmationMessage = dialog.message()
    await dialog.accept()
  })
  await chooser.setFiles(portablePath!)
  expect(importConfirmationMessage).toBe(
    'Discard unsaved changes and import the selected portable project?',
  )

  await expect(
    page.getByRole('button', {
      name: `Edit episode title: ${recoveredTitle}`,
      exact: true,
    }),
  ).toBeVisible()
  await expect(page.getByTestId('document-status')).toContainText(
    'Imported Portable Project',
  )
})
