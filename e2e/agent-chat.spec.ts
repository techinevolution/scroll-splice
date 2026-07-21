import { expect, test, type Page } from '@playwright/test'

async function useFileMenuItem(
  page: Page,
  itemName: 'Save' | 'Reopen Current' | 'Reset Demo',
) {
  await page.getByRole('button', { name: 'File', exact: true }).click()
  const item = page
    .getByRole('menu', { name: 'File' })
    .getByRole('menuitem', { name: itemName, exact: true })
  await expect(item).toBeEnabled()
  await item.click()
}

async function expectPanelClearOfInspector(page: Page) {
  const panel = page.getByRole('region', { name: 'ScrollSplice agent chat' })
  const inspector = page.getByRole('complementary', {
    name: 'Episode overview and layers',
  })
  const [panelBounds, inspectorBounds, headerBounds] = await Promise.all([
    panel.boundingBox(),
    inspector.boundingBox(),
    page.locator('.app-header').boundingBox(),
  ])

  if (!panelBounds || !inspectorBounds || !headerBounds) {
    throw new Error('Chat, header, and inspector need visible bounds.')
  }

  expect(panelBounds.x + panelBounds.width).toBeLessThanOrEqual(
    inspectorBounds.x,
  )
  expect(panelBounds.y).toBeGreaterThanOrEqual(
    headerBounds.y + headerBounds.height,
  )
}

test('keeps the static human editor usable when the companion is absent', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')

  await page
    .getByRole('button', { name: 'Open ScrollSplice agent chat' })
    .click()

  const panel = page.getByRole('region', { name: 'ScrollSplice agent chat' })
  await expect(panel).toBeVisible()
  await expect(panel).toContainText('AI needs the local ScrollSplice build')
  await expect(page.locator('.editor-canvas-shell')).toBeVisible()
  await expectPanelClearOfInspector(page)

  await page.setViewportSize({ width: 1024, height: 768 })
  await expectPanelClearOfInspector(page)
})

test('keeps the Agent trigger reachable when the narrow inspector starts open', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 })
  await page.goto('/')

  const trigger = page.getByRole('button', {
    name: 'Open ScrollSplice agent chat',
  })
  await expect(trigger).toBeVisible()
  await trigger.click()
  await expect(
    page.getByRole('region', { name: 'ScrollSplice agent chat' }),
  ).toBeVisible()
  await expectPanelClearOfInspector(page)
})

test('shows the official login link only after the creator asks to connect', async ({
  page,
}) => {
  await page.route('**/agent-api/status', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        available: true,
        connected: false,
        models: [],
        defaultModel: null,
        defaultEffort: 'medium',
      }),
    })
  })
  await page.route('**/agent-api/login/start', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        loginId: 'login-test',
        authUrl: 'https://auth.example.invalid/scrollsplice-test',
      }),
    })
  })

  await page.goto('/')
  await page
    .getByRole('button', { name: 'Open ScrollSplice agent chat' })
    .click()

  const connect = page.getByRole('button', {
    name: 'Click here to connect your OpenAI account.',
  })
  await expect(connect).toBeVisible()
  await connect.click()

  const authorize = page.getByRole('link', { name: 'Continue to OpenAI' })
  await expect(authorize).toHaveAttribute(
    'href',
    'https://auth.example.invalid/scrollsplice-test',
  )
  await expect(page.getByText('Waiting for OpenAI sign-in…')).toBeVisible()
})

test('streams a connected response and retains only finalized conversation text', async ({
  page,
}) => {
  await page.route('**/agent-api/status', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        available: true,
        connected: true,
        models: [
          {
            id: 'gpt-5.6-terra',
            model: 'gpt-5.6-terra',
            displayName: 'GPT-5.6 Terra',
            description: '',
            supportedReasoningEfforts: [
              { reasoningEffort: 'low', description: '' },
              { reasoningEffort: 'medium', description: '' },
            ],
            defaultReasoningEffort: 'low',
          },
        ],
        defaultModel: 'gpt-5.6-terra',
        defaultEffort: 'low',
      }),
    })
  })
  await page.route('**/agent-api/turn', async (route) => {
    const body = route.request().postDataJSON()
    expect(body).toMatchObject({
      projectKey: expect.stringMatching(/^episode:/),
      model: 'gpt-5.6-terra',
      effort: 'medium',
    })
    await route.fulfill({
      contentType: 'application/x-ndjson',
      body: [
        JSON.stringify({ type: 'run-started', turnId: 'turn-test' }),
        JSON.stringify({ type: 'assistant-delta', delta: 'The title is ' }),
        JSON.stringify({ type: 'assistant-delta', delta: 'The Light We Planted.' }),
        JSON.stringify({
          type: 'assistant-completed',
          text: 'The title is The Light We Planted.',
        }),
        JSON.stringify({
          type: 'turn-completed',
          turnId: 'turn-test',
          status: 'completed',
        }),
      ].join('\n'),
    })
  })

  await page.goto('/')
  await useFileMenuItem(page, 'Reset Demo')
  await useFileMenuItem(page, 'Save')
  await page
    .getByRole('button', { name: 'Open ScrollSplice agent chat' })
    .click()

  await expect(page.getByLabel('OpenAI model')).toHaveValue('gpt-5.6-terra')
  await expect(page.getByLabel('Reasoning effort')).toHaveValue('medium')
  await page
    .getByRole('textbox', { name: 'Message About This Episode' })
    .fill('What is the current episode title?')
  await page.getByRole('button', { name: 'Send' }).click()

  await expect(page.getByText('What is the current episode title?')).toBeVisible()
  await expect(page.getByText('The title is The Light We Planted.')).toBeVisible()

  await page.reload()
  await useFileMenuItem(page, 'Reopen Current')
  await page
    .getByRole('button', { name: 'Open ScrollSplice agent chat' })
    .click()
  await expect(page.getByText('What is the current episode title?')).toBeVisible()
  await expect(page.getByText('The title is The Light We Planted.')).toBeVisible()
})
