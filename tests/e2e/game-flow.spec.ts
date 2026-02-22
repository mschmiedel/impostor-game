import { test, expect, Page } from '@playwright/test';

// Reveals the card and returns the role and word.
// Waits until the card is in "tap to reveal" state first (role-display not in DOM),
// then clicks and reads the content within the 2-second reveal window.
async function revealCard(page: Page): Promise<{ role: string; word: string }> {
  await expect(page.locator('[data-testid="role-display"]')).not.toBeVisible();
  await page.locator('[data-testid="reveal-card"]').click();
  await page.locator('[data-testid="role-display"]').waitFor({ state: 'visible', timeout: 3_000 });
  const role = (await page.locator('[data-testid="role-display"]').textContent()) ?? '';
  const word = (await page.locator('[data-testid="secret-word-display"]').textContent()) ?? '';
  return { role: role.trim(), word: word.trim() };
}

// Waits for the reveal card to appear in all 3 sessions, reveals each card
// sequentially, and asserts 1 impostor + 2 civilians with correct word visibility.
async function assertTurnRoles(page1: Page, page2: Page, page3: Page) {
  for (const page of [page1, page2, page3]) {
    await page.locator('[data-testid="reveal-card"]').waitFor({ state: 'visible', timeout: 10_000 });
  }

  const roles: Array<{ role: string; word: string }> = [];
  for (const page of [page1, page2, page3]) {
    roles.push(await revealCard(page));
  }

  // With 3 players: floor(3/3) = 1 impostor, 2 civilians
  const impostors = roles.filter(r => r.role === 'IMPOSTOR');
  const civilians = roles.filter(r => r.role === 'CIVILIAN');

  expect(impostors).toHaveLength(1);
  expect(civilians).toHaveLength(2);

  impostors.forEach(r => expect(r.word).toBe('???'));
  civilians.forEach(r => {
    expect(r.word).not.toBe('???');
    expect(r.word.length).toBeGreaterThan(0);
  });
}

test('rename own name in lobby: player sees update on all screens', async ({ browser }) => {
  const ctx1 = await browser.newContext();
  const ctx2 = await browser.newContext();

  const page1 = await ctx1.newPage();
  const page2 = await ctx2.newPage();

  try {
    // Host creates game
    await page1.goto('/');
    await page1.locator('[data-testid="creator-name-input"]').fill('Player 1');
    await page1.locator('[data-testid="create-game-btn"]').click();
    await page1.waitForURL(/\/game\//);

    await page1.locator('[data-testid="join-code-display"]').waitFor({ state: 'visible' });
    const joinCode = (await page1.locator('[data-testid="join-code-display"]').textContent()) ?? '';

    // Player 2 joins
    await page2.goto('/');
    await page2.locator('[data-testid="join-game-id-input"]').fill(joinCode.trim());
    await page2.locator('[data-testid="join-game-btn"]').click();
    await page2.waitForURL(/\/join\//);
    await page2.locator('[data-testid="join-player-name-input"]').fill('Player 2');
    await page2.locator('[data-testid="join-confirm-btn"]').click();
    await page2.waitForURL(/\/game\//);

    // Host sees both badges
    await expect(page1.locator('[data-testid^="player-badge-"]')).toHaveCount(2, { timeout: 10_000 });

    // Player 2 edits their own name
    await page2.locator('[data-testid="edit-name-btn"]').click();
    await page2.locator('[data-testid="edit-name-input"]').fill('Player Two');
    await page2.locator('[data-testid="save-name-btn"]').click();

    // Player 2's own badge shows the new name (edit UI closes)
    await expect(page2.locator('[data-testid="edit-name-btn"]')).toBeVisible({ timeout: 5_000 });

    // Host's polling picks up the new name within 2s
    await expect(page1.getByText('Player Two')).toBeVisible({ timeout: 5_000 });
  } finally {
    await ctx1.close();
    await ctx2.close();
  }
});

test('host removes player from lobby', async ({ browser }) => {
  const ctx1 = await browser.newContext();
  const ctx2 = await browser.newContext();

  const page1 = await ctx1.newPage();
  const page2 = await ctx2.newPage();

  try {
    // Host creates game
    await page1.goto('/');
    await page1.locator('[data-testid="creator-name-input"]').fill('Player 1');
    await page1.locator('[data-testid="create-game-btn"]').click();
    await page1.waitForURL(/\/game\//);

    await page1.locator('[data-testid="join-code-display"]').waitFor({ state: 'visible' });
    const joinCode = (await page1.locator('[data-testid="join-code-display"]').textContent()) ?? '';

    // Player 2 joins
    await page2.goto('/');
    await page2.locator('[data-testid="join-game-id-input"]').fill(joinCode.trim());
    await page2.locator('[data-testid="join-game-btn"]').click();
    await page2.waitForURL(/\/join\//);
    await page2.locator('[data-testid="join-player-name-input"]').fill('Player 2');
    await page2.locator('[data-testid="join-confirm-btn"]').click();
    await page2.waitForURL(/\/game\//);

    // Host sees both player badges
    await expect(page1.locator('[data-testid^="player-badge-"]')).toHaveCount(2, { timeout: 10_000 });

    // Host removes Player 2
    await page1.locator('[data-testid="remove-player-btn"]').click();

    // Host now sees only their own badge
    await expect(page1.locator('[data-testid^="player-badge-"]')).toHaveCount(1, { timeout: 5_000 });

    // Player 2's next poll returns 403 → "removed by host" error message is shown
    await expect(page2.getByTestId('error-message')).toBeVisible({ timeout: 5_000 });
    await expect(page2.getByTestId('error-message')).not.toContainText('Fehler beim Beitreten');
  } finally {
    await ctx1.close();
    await ctx2.close();
  }
});

test('3-player game: create → join → 2 turns → finish', async ({ browser }) => {
  // Step 1: Open 3 isolated browser contexts (separate localStorage / session state)
  const ctx1 = await browser.newContext();
  const ctx2 = await browser.newContext();
  const ctx3 = await browser.newContext();

  const page1 = await ctx1.newPage();
  const page2 = await ctx2.newPage();
  const page3 = await ctx3.newPage();

  try {
    // Step 2: Session 1 creates a new game as "Player 1"
    await page1.goto('/');
    await page1.locator('[data-testid="creator-name-input"]').fill('Player 1');
    await page1.locator('[data-testid="create-game-btn"]').click();

    await page1.waitForURL(/\/game\//);
    const gameUrl = page1.url();

    // Wait for the 4-digit join code to appear in JOINING state
    await page1.locator('[data-testid="join-code-display"]').waitFor({ state: 'visible' });
    const joinCode = (await page1.locator('[data-testid="join-code-display"]').textContent()) ?? '';
    expect(joinCode.trim()).toMatch(/^\d{4}$/);

    // Step 3: Session 2 goes to home, enters the join code, joins as "Player 2"
    await page2.goto('/');
    await page2.locator('[data-testid="join-game-id-input"]').fill(joinCode.trim());
    await page2.locator('[data-testid="join-game-btn"]').click();

    await page2.waitForURL(/\/join\//);
    await page2.locator('[data-testid="join-player-name-input"]').fill('Player 2');
    await page2.locator('[data-testid="join-confirm-btn"]').click();
    await page2.waitForURL(/\/game\//);

    // Step 4: Session 3 navigates directly to the game URL from step 2.
    // Without a playerSecret in localStorage it gets redirected to /join/{gameId}.
    await page3.goto(gameUrl);
    await page3.waitForURL(/\/join\//);
    await page3.locator('[data-testid="join-player-name-input"]').fill('Player 3');
    await page3.locator('[data-testid="join-confirm-btn"]').click();
    await page3.waitForURL(/\/game\//);

    // Step 5: Session 1 waits until all 3 player badges are visible, then starts the game
    await expect(page1.locator('[data-testid^="player-badge-"]')).toHaveCount(3, { timeout: 15_000 });
    await page1.locator('[data-testid="start-game-btn"]').click();

    // Wait for game to transition to STARTED
    await expect(page1.locator('[data-testid="game-status"]')).toHaveText('STARTED', { timeout: 10_000 });

    // Session 1 (host) immediately starts the first turn
    await page1.locator('[data-testid="next-turn-btn"]').click();

    // Step 6: Assert roles and words for turn 1
    await assertTurnRoles(page1, page2, page3);

    // Step 7: Session 1 starts the second turn
    await page1.locator('[data-testid="next-turn-btn"]').click();

    // Step 8: Assert roles and words for turn 2
    await assertTurnRoles(page1, page2, page3);

    // Step 9: Session 1 ends the game
    await page1.locator('[data-testid="finish-game-btn"]').click();

    // Step 10: All 3 sessions see the game as finished
    for (const page of [page1, page2, page3]) {
      await expect(page.locator('[data-testid="game-status"]')).toHaveText('FINISHED', { timeout: 10_000 });
      await expect(page.locator('[data-testid="new-game-btn"]')).toBeVisible();
    }
  } finally {
    await ctx1.close();
    await ctx2.close();
    await ctx3.close();
  }
});
