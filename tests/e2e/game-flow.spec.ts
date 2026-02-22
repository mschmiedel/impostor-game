import { test, expect, Page, Browser } from '@playwright/test';

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

// Reveals the card and captures role, word, and whether category-display is visible.
// All reads happen within the 2-second auto-hide window.
async function revealCardFull(page: Page): Promise<{ role: string; word: string; categoryVisible: boolean }> {
  await expect(page.locator('[data-testid="role-display"]')).not.toBeVisible();
  await page.locator('[data-testid="reveal-card"]').click();
  await page.locator('[data-testid="role-display"]').waitFor({ state: 'visible', timeout: 3_000 });
  const role = (await page.locator('[data-testid="role-display"]').textContent()) ?? '';
  const word = (await page.locator('[data-testid="secret-word-display"]').textContent()) ?? '';
  const categoryVisible = await page.locator('[data-testid="category-display"]').isVisible();
  return { role: role.trim(), word: word.trim(), categoryVisible };
}

// Sets up a game with the given number of players (ctx1 = host) and starts a turn.
// Returns pages in order [host, p2, p3, ...].
async function setupGameAndStartTurn(browser: Browser, playerCount: number, language = 'de-DE'): Promise<Page[]> {
  const contexts = await Promise.all(Array.from({ length: playerCount }, () => browser.newContext()));
  const pages = await Promise.all(contexts.map(ctx => ctx.newPage()));

  // Host creates game
  await pages[0].goto('/');
  if (language !== 'de-DE') {
    await pages[0].locator('[data-testid="language-select"]').selectOption(language);
  }
  await pages[0].locator('[data-testid="creator-name-input"]').fill('Host');
  await pages[0].locator('[data-testid="create-game-btn"]').click();
  await pages[0].waitForURL(/\/game\//);

  const gameUrl = pages[0].url();
  await pages[0].locator('[data-testid="join-code-display"]').waitFor({ state: 'visible' });
  const joinCode = (await pages[0].locator('[data-testid="join-code-display"]').textContent()) ?? '';

  // Remaining players join
  for (let i = 1; i < playerCount; i++) {
    if (i === 1) {
      // Use join code
      await pages[i].goto('/');
      await pages[i].locator('[data-testid="join-game-id-input"]').fill(joinCode.trim());
      await pages[i].locator('[data-testid="join-game-btn"]').click();
    } else {
      // Navigate directly to game URL (redirects to /join/)
      await pages[i].goto(gameUrl);
    }
    await pages[i].waitForURL(/\/join\//);
    await pages[i].locator('[data-testid="join-player-name-input"]').fill(`Player ${i + 1}`);
    await pages[i].locator('[data-testid="join-confirm-btn"]').click();
    await pages[i].waitForURL(/\/game\//);
  }

  // Host waits for all players then starts game
  await expect(pages[0].locator('[data-testid^="player-badge-"]')).toHaveCount(playerCount, { timeout: 15_000 });
  await pages[0].locator('[data-testid="start-game-btn"]').click();
  await expect(pages[0].locator('[data-testid="game-status"]')).toHaveText('STARTED', { timeout: 10_000 });

  // Start first turn
  await pages[0].locator('[data-testid="next-turn-btn"]').click();

  // Wait for reveal card in all sessions
  for (const page of pages) {
    await page.locator('[data-testid="reveal-card"]').waitFor({ state: 'visible', timeout: 10_000 });
  }

  return pages;
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

    // Player 2's next poll returns 403 → error message is shown
    await expect(page2.getByTestId('error-message')).toBeVisible({ timeout: 5_000 });
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

// ── Test A: 3-player handicap ────────────────────────────────────────────────
// With exactly 3 players the impostor receives the category as a handicap clue.
test('3-player handicap: impostor sees category-display, word stays hidden', async ({ browser }) => {
  const pages = await setupGameAndStartTurn(browser, 3);
  const contexts = pages.map(p => p.context());

  try {
    // Reveal all cards and gather per-player info within the 2-second window
    const results: Array<{ role: string; word: string; categoryVisible: boolean; page: Page }> = [];
    for (const page of pages) {
      const info = await revealCardFull(page);
      results.push({ ...info, page });
    }

    const impostors = results.filter(r => r.role === 'IMPOSTOR');
    const civilians = results.filter(r => r.role === 'CIVILIAN');

    expect(impostors).toHaveLength(1);
    expect(civilians).toHaveLength(2);

    // Impostor with ≤3 players: category VISIBLE, word hidden
    expect(impostors[0].categoryVisible).toBe(true);
    expect(impostors[0].word).toBe('???');

    // Civilians always see category and actual word
    for (const c of civilians) {
      expect(c.categoryVisible).toBe(true);
      expect(c.word).not.toBe('???');
      expect(c.word.length).toBeGreaterThan(0);
    }
  } finally {
    for (const ctx of contexts) await ctx.close();
  }
});

// ── Test B: 4-player standard rules ─────────────────────────────────────────
// With 4+ players the impostor does NOT receive the category.
test('4-player standard: impostor does NOT see category-display', async ({ browser }) => {
  const pages = await setupGameAndStartTurn(browser, 4);
  const contexts = pages.map(p => p.context());

  try {
    const results: Array<{ role: string; word: string; categoryVisible: boolean; page: Page }> = [];
    for (const page of pages) {
      const info = await revealCardFull(page);
      results.push({ ...info, page });
    }

    const impostors = results.filter(r => r.role === 'IMPOSTOR');
    const civilians = results.filter(r => r.role === 'CIVILIAN');

    expect(impostors).toHaveLength(1);
    expect(civilians).toHaveLength(3);

    // Impostor with >3 players: category NOT visible, word hidden
    expect(impostors[0].categoryVisible).toBe(false);
    expect(impostors[0].word).toBe('???');

    // Civilians still see category and word
    for (const c of civilians) {
      expect(c.categoryVisible).toBe(true);
      expect(c.word).not.toBe('???');
    }
  } finally {
    for (const ctx of contexts) await ctx.close();
  }
});

// ── Test C: Multilingual parameterized ───────────────────────────────────────
// Runs a minimal game-flow (create → join × 2 → start → turn) for each locale.
// Asserts the UI loads without crashing and successfully transitions to STARTED.
const supportedLocales: Array<{ code: string; label: string }> = [
  { code: 'de-DE', label: 'Deutsch' },
  { code: 'en-US', label: 'English' },
];

for (const locale of supportedLocales) {
  test(`multilingual game flow: ${locale.label} (${locale.code})`, async ({ browser }) => {
    const pages = await setupGameAndStartTurn(browser, 3, locale.code);
    const contexts = pages.map(p => p.context());

    try {
      // All players should see game status STARTED
      for (const page of pages) {
        await expect(page.locator('[data-testid="game-status"]')).toHaveText('STARTED', { timeout: 10_000 });
      }

      // Reveal card on host's page — UI should not crash and content should render
      const hostResult = await revealCardFull(pages[0]);
      expect(['IMPOSTOR', 'CIVILIAN']).toContain(hostResult.role);
      expect(hostResult.word.length).toBeGreaterThanOrEqual(0); // any string incl. '???'
    } finally {
      for (const ctx of contexts) await ctx.close();
    }
  });
}
