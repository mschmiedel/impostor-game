
/**
 * @jest-environment node
 */
import { POST } from '@/app/api/nextTurn/[gameId]/route';
import { RedisGameRepository } from '@/infrastructure/adapters/redis/RedisGameRepository';
import { Game } from '@/domain/entities/Game';
import { NextRequest } from 'next/server';

jest.mock('ioredis', () => require('ioredis-mock'));

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      candidates: [{
        content: {
          parts: [{ text: '{"categories": [{"name": "mock-category", "words": ["mock-word"]}]}' }]
        }
      }]
    }),
  })
) as jest.Mock;

const repo = new RedisGameRepository();

function makePostRequest(gameId: string, playerSecret: string) {
  return new NextRequest(`http://localhost/api/nextTurn/${gameId}`, {
    method: 'POST',
    headers: { 'x-player-secret': playerSecret },
  });
}

function makePlayers(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i}`,
    name: `Player${i}`,
    role: (i === 0 ? 'HOST' : 'PLAYER') as 'HOST' | 'PLAYER',
    secret: `secret${i}`,
  }));
}

describe('POST /api/nextTurn/:gameId - happy path', () => {
  const gameId = 'test-game-turn';
  const hostSecret = 'secret0';

  beforeEach(async () => {
    const game: Game = {
      gameId,
      ageOfYoungestPlayer: 10,
      language: 'en-US',
      status: 'STARTED',
      players: makePlayers(3),
      turns: [],
      createdAt: Date.now(),
    };
    await repo.save(game);
  });

  it('should start next turn and persist the word', async () => {
    const response = await POST(makePostRequest(gameId, hostSecret), { params: Promise.resolve({ gameId }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toHaveProperty('success', true);

    const updatedGame = await repo.findById(gameId);
    expect(updatedGame?.turns).toHaveLength(1);
    expect(updatedGame?.turns[0].word).toBe('mock-word');
    expect(updatedGame?.turns[0].category).toBe('mock-category');
  });
});

describe('POST /api/nextTurn/:gameId - authorization', () => {
  const gameId = 'game-auth-turn';
  const hostSecret = 'secret0';

  beforeEach(async () => {
    const game: Game = {
      gameId,
      ageOfYoungestPlayer: 10,
      language: 'de-DE',
      status: 'STARTED',
      players: makePlayers(3),
      turns: [],
      createdAt: Date.now(),
    };
    await repo.save(game);
  });

  it('should return 401 when a non-host player tries to start a turn', async () => {
    const playerSecret = 'secret1'; // PLAYER role, not HOST
    const response = await POST(makePostRequest(gameId, playerSecret), { params: Promise.resolve({ gameId }) });
    expect(response.status).toBe(401);
  });

  it('should return 401 for an unknown player secret', async () => {
    const response = await POST(makePostRequest(gameId, 'wrong-secret'), { params: Promise.resolve({ gameId }) });
    expect(response.status).toBe(401);
  });

  it('should return 404 for a non-existent game', async () => {
    const response = await POST(makePostRequest('no-such-game', 'any-secret'), { params: Promise.resolve({ gameId: 'no-such-game' }) });
    expect(response.status).toBe(404);
  });
});

describe('POST /api/nextTurn/:gameId - turn structure', () => {
  const gameId = 'game-structure-turn';
  const hostSecret = 'secret0';

  beforeEach(async () => {
    const game: Game = {
      gameId,
      ageOfYoungestPlayer: 10,
      language: 'de-DE',
      status: 'STARTED',
      players: makePlayers(4),
      turns: [],
      createdAt: Date.now(),
    };
    await repo.save(game);
  });

  it('should assign every player to exactly one group', async () => {
    await POST(makePostRequest(gameId, hostSecret), { params: Promise.resolve({ gameId }) });

    const game = await repo.findById(gameId);
    const turn = game!.turns[0];
    const allPlayerIds = game!.players.map(p => p.id);

    // Every player appears in exactly one list
    for (const id of allPlayerIds) {
      const inImpostors = turn.impostors.includes(id);
      const inCivilians = turn.civilians.includes(id);
      expect(inImpostors || inCivilians).toBe(true);
      expect(inImpostors && inCivilians).toBe(false);
    }

    // Total adds up
    expect(turn.impostors.length + turn.civilians.length).toBe(allPlayerIds.length);
  });

  it('should accumulate turns instead of replacing them', async () => {
    await POST(makePostRequest(gameId, hostSecret), { params: Promise.resolve({ gameId }) });
    await POST(makePostRequest(gameId, hostSecret), { params: Promise.resolve({ gameId }) });

    const game = await repo.findById(gameId);
    expect(game?.turns).toHaveLength(2);
  });

  it('should exclude previously used words from the next turn', async () => {
    // Use a unique language to get a fresh cache key independent of other tests
    const uniqueGameId = 'game-prev-words-excl';
    const uniqueLanguage = 'it-IT';

    // Override mock for this test to return a pool with known words
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{ text: '{"categories": [{"name": "test-cat", "words": ["Apfel", "Tiger", "Giraffe"]}]}' }]
            }
          }]
        }),
      })
    );

    const gameWithTurns: Game = {
      gameId: uniqueGameId,
      ageOfYoungestPlayer: 10,
      language: uniqueLanguage,
      status: 'STARTED',
      players: makePlayers(4),
      turns: [
        { word: 'Apfel', category: 'test-cat', impostors: ['p0'], civilians: ['p1', 'p2', 'p3'] },
        { word: 'Tiger', category: 'test-cat', impostors: ['p1'], civilians: ['p0', 'p2', 'p3'] },
      ],
      createdAt: Date.now(),
    };
    await repo.save(gameWithTurns);

    await POST(makePostRequest(uniqueGameId, hostSecret), { params: Promise.resolve({ gameId: uniqueGameId }) });

    const updatedGame = await repo.findById(uniqueGameId);
    const newWord = updatedGame?.turns[2].word;
    // Only 'Giraffe' remains unused in the pool
    expect(newWord).toBe('Giraffe');
    expect(newWord).not.toBe('Apfel');
    expect(newWord).not.toBe('Tiger');
  });
});

describe('POST /api/nextTurn/:gameId - impostor count', () => {
  const hostSecret = 'secret0';

  async function startTurnForGame(gameId: string, playerCount: number) {
    const game: Game = {
      gameId,
      ageOfYoungestPlayer: 10,
      language: 'de-DE',
      status: 'STARTED',
      players: makePlayers(playerCount),
      turns: [],
      createdAt: Date.now(),
    };
    await repo.save(game);
    await POST(makePostRequest(gameId, hostSecret), { params: Promise.resolve({ gameId }) });
    return repo.findById(gameId);
  }

  it('should assign 1 impostor for 2–5 players', async () => {
    for (const count of [2, 3, 4, 5]) {
      const game = await startTurnForGame(`game-imp-${count}p`, count);
      expect(game!.turns[0].impostors).toHaveLength(1);
    }
  });

  it('should assign 2 impostors for 6–8 players', async () => {
    for (const count of [6, 7, 8]) {
      const game = await startTurnForGame(`game-imp-${count}p`, count);
      expect(game!.turns[0].impostors).toHaveLength(2);
    }
  });
});
