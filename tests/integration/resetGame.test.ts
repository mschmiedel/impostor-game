
/**
 * @jest-environment node
 */
import { POST } from '@/app/api/game/[gameId]/reset/route';
import { RedisGameRepository } from '@/infrastructure/adapters/redis/RedisGameRepository';
import { Game } from '@/domain/entities/Game';
import { NextRequest } from 'next/server';

jest.mock('ioredis', () => require('ioredis-mock'));

const repo = new RedisGameRepository();

function makeRequest(gameId: string, playerSecret: string, body: object) {
  return new NextRequest(`http://localhost/api/game/${gameId}/reset`, {
    method: 'POST',
    headers: { 'x-player-secret': playerSecret, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function baseFinishedGame(overrides: Partial<Game> = {}): Game {
  return {
    gameId: 'reset-game',
    status: 'FINISHED',
    ageOfYoungestPlayer: 10,
    language: 'de-DE',
    createdAt: Date.now(),
    players: [
      { id: 'host-id', name: 'Host', role: 'HOST', secret: 'host-secret', isReady: true },
      { id: 'p2-id', name: 'Player2', role: 'PLAYER', secret: 'p2-secret', isReady: true },
    ],
    turns: [{ word: 'Apfel', category: 'Obst', impostors: ['p2-id'], civilians: ['host-id'] }],
    ...overrides,
  };
}

describe('POST /api/game/:gameId/reset - happy path', () => {
  const gameId = 'reset-happy';

  beforeEach(async () => {
    await repo.save(baseFinishedGame({ gameId }));
  });

  it('should reset game to JOINING and return 200', async () => {
    const req = makeRequest(gameId, 'host-secret', { language: 'en-US', ageOfYoungestPlayer: 8 });
    const res = await POST(req, { params: Promise.resolve({ gameId }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe('JOINING');

    const updated = await repo.findById(gameId);
    expect(updated?.status).toBe('JOINING');
    expect(updated?.turns).toHaveLength(0);
    expect(updated?.language).toBe('en-US');
    expect(updated?.ageOfYoungestPlayer).toBe(8);
  });

  it('should set host isReady=true and non-host players isReady=false', async () => {
    const req = makeRequest(gameId, 'host-secret', { language: 'de-DE', ageOfYoungestPlayer: 10 });
    await POST(req, { params: Promise.resolve({ gameId }) });

    const updated = await repo.findById(gameId);
    const host = updated?.players.find(p => p.role === 'HOST');
    const player = updated?.players.find(p => p.role === 'PLAYER');

    expect(host?.isReady).toBe(true);
    expect(player?.isReady).toBe(false);
  });
});

describe('POST /api/game/:gameId/reset - error cases', () => {
  it('should return 404 for non-existent game', async () => {
    const req = makeRequest('no-such-game', 'host-secret', { language: 'de-DE', ageOfYoungestPlayer: 10 });
    const res = await POST(req, { params: Promise.resolve({ gameId: 'no-such-game' }) });
    expect(res.status).toBe(404);
  });

  it('should return 401 when player secret is missing', async () => {
    const gameId = 'reset-no-secret';
    await repo.save(baseFinishedGame({ gameId }));

    const req = new NextRequest(`http://localhost/api/game/${gameId}/reset`, {
      method: 'POST',
      body: JSON.stringify({ language: 'de-DE', ageOfYoungestPlayer: 10 }),
    });
    const res = await POST(req, { params: Promise.resolve({ gameId }) });
    expect(res.status).toBe(401);
  });

  it('should return 401 when player secret is wrong', async () => {
    const gameId = 'reset-wrong-secret';
    await repo.save(baseFinishedGame({ gameId }));

    const req = makeRequest(gameId, 'wrong-secret', { language: 'de-DE', ageOfYoungestPlayer: 10 });
    const res = await POST(req, { params: Promise.resolve({ gameId }) });
    expect(res.status).toBe(401);
  });

  it('should return 403 when a non-host player tries to reset', async () => {
    const gameId = 'reset-non-host';
    await repo.save(baseFinishedGame({ gameId }));

    const req = makeRequest(gameId, 'p2-secret', { language: 'de-DE', ageOfYoungestPlayer: 10 });
    const res = await POST(req, { params: Promise.resolve({ gameId }) });
    expect(res.status).toBe(403);
  });

  it('should return 400 when game is not in FINISHED state', async () => {
    const gameId = 'reset-not-finished';
    await repo.save(baseFinishedGame({ gameId, status: 'STARTED' }));

    const req = makeRequest(gameId, 'host-secret', { language: 'de-DE', ageOfYoungestPlayer: 10 });
    const res = await POST(req, { params: Promise.resolve({ gameId }) });
    expect(res.status).toBe(400);
  });
});
