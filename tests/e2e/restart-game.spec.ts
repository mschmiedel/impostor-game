import { test, expect, Browser, Page } from '@playwright/test';

async function setupFinishedGame(browser: Browser): Promise<{ pages: Page[]; gameUrl: string }> {
  const contexts = await Promise.all([
    browser.newContext(),
    browser.newContext(),
    browser.newContext(),
  ]);
  const [hostPage, p2Page, p3Page] = await Promise.all(contexts.map(ctx => ctx.newPage()));

  // Host creates game
  await hostPage.goto('/');
  await hostPage.locator('[data-testid="creator-name-input"]').fill('Host');
  await hostPage.locator('[data-testid="create-game-btn"]').click();
  await hostPage.waitForURL(/\/game\//);
  const gameUrl = hostPage.url();

  await hostPage.locator('[data-testid="join-code-display"]').waitFor({ state: 'visible' });
  const joinCode = (await hostPage.locator('[data-testid="join-code-display"]').textContent()) ?? '';

  // P2 joins by code
  await p2Page.goto('/');
  await p2Page.locator('[data-testid="join-game-id-input"]').fill(joinCode.trim());
  await p2Page.locator('[data-testid="join-game-btn"]').click();
  await p2Page.waitForURL(/\/join\//);
  await p2Page.locator('[data-testid="join-player-name-input"]').fill('Player 2');
  await p2Page.locator('[data-testid="join-confirm-btn"]').click();
  await p2Page.waitForURL(/\/game\//);

  // P3 joins by direct URL
  await p3Page.goto(gameUrl);
  await p3Page.waitForURL(/\/join\//);
  await p3Page.locator('[data-testid="join-player-name-input"]').fill('Player 3');
  await p3Page.locator('[data-testid="join-confirm-btn"]').click();
  await p3Page.waitForURL(/\/game\//);

  // Host starts game
  await expect(hostPage.locator('[data-testid^="player-badge-"]')).toHaveCount(3, { timeout: 15_000 });
  await hostPage.locator('[data-testid="start-game-btn"]').click();
  await expect(hostPage.locator('[data-testid="game-status"][data-status="STARTED"]')).toBeVisible({ timeout: 10_000 });

  // Host starts a turn and finishes the game
  await hostPage.locator('[data-testid="next-turn-btn"]').click();
  await hostPage.locator('[data-testid="reveal-card"]').waitFor({ state: 'visible', timeout: 10_000 });
  await hostPage.locator('[data-testid="finish-game-btn"]').click();

  // All players see game finished
  for (const page of [hostPage, p2Page, p3Page]) {
    await expect(page.locator('[data-testid="game-status"][data-status="FINISHED"]')).toBeVisible({ timeout: 10_000 });
  }

  return { pages: [hostPage, p2Page, p3Page], gameUrl };
}

test('restart-game: host resets, players confirm, new round starts', async ({ browser }) => {
  const { pages: [hostPage, p2Page, p3Page] } = await setupFinishedGame(browser);

  try {
    // Host sees restart controls, non-host players see waiting message
    await expect(hostPage.locator('[data-testid="restart-game-btn"]')).toBeVisible();
    await expect(p2Page.locator('[data-testid="waiting-for-restart"]')).toBeVisible({ timeout: 5_000 });
    await expect(p3Page.locator('[data-testid="waiting-for-restart"]')).toBeVisible({ timeout: 5_000 });

    // Host fills in new language/age and restarts
    await hostPage.locator('[data-testid="restart-language-select"]').selectOption('en-US');
    await hostPage.locator('[data-testid="restart-age-input"]').fill('12');
    await hostPage.locator('[data-testid="restart-game-btn"]').click();

    // Game transitions to JOINING — host sees it immediately
    await expect(hostPage.locator('[data-testid="game-status"][data-status="JOINING"]')).toBeVisible({ timeout: 10_000 });

    // P2 and P3 see "Join Next Round?" prompt (they are not ready)
    await expect(p2Page.locator('[data-testid="join-next-round-btn"]')).toBeVisible({ timeout: 10_000 });
    await expect(p3Page.locator('[data-testid="join-next-round-btn"]')).toBeVisible({ timeout: 10_000 });

    // Host sees P2 and P3 as not-ready (⏳ badge)
    // Wait for host to poll and see not-ready badges
    await expect(hostPage.locator('[data-testid^="not-ready-"]')).toHaveCount(2, { timeout: 10_000 });

    // P2 clicks ready
    await p2Page.locator('[data-testid="join-next-round-btn"]').click();

    // P2 now sees the lobby (no longer the "join next round" prompt)
    await expect(p2Page.locator('[data-testid="game-status"][data-status="JOINING"]')).toBeVisible({ timeout: 5_000 });

    // Host sees P2 as ready (✓) and P3 still not ready (⏳)
    // Count: only 1 not-ready badge (P3) remaining
    await expect(hostPage.locator('[data-testid^="not-ready-"]')).toHaveCount(1, { timeout: 10_000 });

    // Host tries to start with only 2 ready players — button should be disabled
    const startBtn = hostPage.locator('[data-testid="start-game-btn"]');
    await expect(startBtn).toBeDisabled({ timeout: 5_000 });

    // P3 clicks ready
    await p3Page.locator('[data-testid="join-next-round-btn"]').click();
    await expect(p3Page.locator('[data-testid="game-status"][data-status="JOINING"]')).toBeVisible({ timeout: 5_000 });

    // Host now sees all players ready
    await expect(hostPage.locator('[data-testid^="not-ready-"]')).toHaveCount(0, { timeout: 10_000 });
    await expect(startBtn).toBeEnabled({ timeout: 5_000 });

    // Host starts the new round
    await startBtn.click();
    await expect(hostPage.locator('[data-testid="game-status"][data-status="STARTED"]')).toBeVisible({ timeout: 10_000 });

    // All players see the game started
    for (const page of [p2Page, p3Page]) {
      await expect(page.locator('[data-testid="game-status"][data-status="STARTED"]')).toBeVisible({ timeout: 10_000 });
    }
  } finally {
    for (const page of [hostPage, p2Page, p3Page]) {
      await page.context().close();
    }
  }
});
