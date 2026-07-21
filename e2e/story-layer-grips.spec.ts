import { expect, test } from '@playwright/test'

const STORY_IMAGE_IDS = [
  'beat-01-stillness-story-image',
  'beat-02-spark-story-image',
  'beat-03-search-story-image',
  'beat-04-crossing-story-image',
  'beat-05-chorus-story-image',
  'beat-06-dawn-story-image',
]

test('loads the six-panel story and reorders its local layer stack by grip', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'File', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Reset Demo', exact: true }).click()

  await expect(
    page.getByRole('button', {
      name: 'Edit episode title: The Light We Planted',
    }),
  ).toBeVisible()

  const storyArtTab = page.getByRole('button', {
    name: 'Content plane 1',
    exact: true,
  })
  await storyArtTab.click()

  const storyList = page.getByRole('list', {
    name: 'Content plane 1 elements',
  })
  const storyRows = storyList.locator('[data-layer-id]')
  const storyGrips = storyList.locator('.layer-element-drag-grip')

  await expect(storyRows).toHaveCount(6)
  await expect(storyGrips).toHaveCount(6)
  await expect
    .poll(() =>
      storyRows.evaluateAll((rows) =>
        rows.map((row) => row.getAttribute('data-layer-id')),
      ),
    )
    .toEqual(STORY_IMAGE_IDS)

  await storyGrips.nth(1).focus()
  await page.keyboard.press('ArrowUp')
  await expect
    .poll(() =>
      storyRows.evaluateAll((rows) =>
        rows.map((row) => row.getAttribute('data-layer-id')),
      ),
    )
    .toEqual([
      STORY_IMAGE_IDS[1],
      STORY_IMAGE_IDS[0],
      ...STORY_IMAGE_IDS.slice(2),
    ])

  await page.keyboard.press('ArrowDown')
  await expect
    .poll(() =>
      storyRows.evaluateAll((rows) =>
        rows.map((row) => row.getAttribute('data-layer-id')),
      ),
    )
    .toEqual(STORY_IMAGE_IDS)

  await storyGrips.first().dragTo(storyRows.last())

  await expect
    .poll(() =>
      storyRows.evaluateAll((rows) =>
        rows.map((row) => row.getAttribute('data-layer-id')),
      ),
    )
    .toEqual([...STORY_IMAGE_IDS.slice(1), STORY_IMAGE_IDS[0]])

  await page.keyboard.press('ControlOrMeta+z')

  await expect
    .poll(() =>
      storyRows.evaluateAll((rows) =>
        rows.map((row) => row.getAttribute('data-layer-id')),
      ),
    )
    .toEqual(STORY_IMAGE_IDS)

  await page
    .getByRole('button', { name: 'Content plane 2', exact: true })
    .click()

  const letteringList = page.getByRole('list', {
    name: 'Content plane 2 elements',
  })
  await expect(letteringList.locator('[data-layer-id]')).toHaveCount(7)
  await expect(
    letteringList.locator('[data-layer-id="beat-01-stillness-title"]'),
  ).toBeVisible()
  await expect(
    letteringList.locator('[data-layer-id$="-caption"]'),
  ).toHaveCount(6)
})
