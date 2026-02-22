
/**
 * @jest-environment node
 */
import { POST } from '@/app/api/game/[gameId]/ready/route';
import { RedisGameRepository } from '@/infrastructure/adapters/redis/RedisGameRepository';
import { Game } from '@/domain/entities/Game';
import { NextRequest } from 'next/server';

jest.mock('ioredis', () => require('ioredis-mock'));

const repo = new RedisGameRepository();

function makeRequest(gameId: string, playerSecret: string) {
  return new NextRequest(`http://localhost/api/game/${gameId}/ready`, {
    method: 'POST',
    headers: { 'x-player-secret': playerSecret },
  });
}

function baseJoiningGame(overrides: Partial<Game> = {}): Game {
  return {
    gameId: 'ready-game',
    status: 'JOINING',
    ageOfYoungestPlayer: 10,
    language: 'de-DE',
    createdAt: Date.now(),
    players: [
      { id: 'host-id', name: 'Host', role: 'HOST', secret: 'host-secret', isReady: true },
      { id: 'p2-id', name: 'Player2', role: 'PLAYER', secret: 'p2-secret', isReady: false },
    ],
    turns: [],
    ...overrides,
  };
}

describe('POST /api/game/:gameId/ready - happy path', () => {
  const gameId = 'ready-happy';

  beforeEach(async () => {
    await repo.save(baseJoiningGame({ gameId }));
  });

  it('should set isReady=true for the player and return 200 with playerId', async () => {
    const req = makeRequest(gameId, 'p2-secret');
    const res = await POST(req, { params: Promise.resolve({ gameId }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toHaveProperty('playerId', 'p2-id');

    const updated = await repo.findById(gameId);
    const player = updated?.players.find(p => p.id === 'p2-id');
    expect(player?.isReady).toBe(true);
  });

  it('should be idempotent — calling ready twice is fine', async () => {
    const req1 = makeRequest(gameId, 'p2-secret');
    const req2 = makeRequest(gameId, 'p2-secret');
    await POST(req1, { params: Promise.resolve({ gameId }) });
    const res = await POST(req2, { params: Promise.resolve({ gameId }) });
    expect(res.status).toBe(200);
  });
});

describe('POST /api/game/:gameId/ready - error cases', () => {
  it('should return 404 for non-existent game', async () => {
    const req = makeRequest('no-such-game', 'p2-secret');
    const res = await POST(req, { params: Promise.resolve({ gameId: 'no-such-game' }) });
    expect(res.status).toBe(404);
  });

  it('should return 401 when player secret is missing', async () => {
    const gameId = 'ready-no-secret';
    await repo.save(baseJoiningGame({ gameId }));

    const req = new NextRequest(`http://localhost/api/game/${gameId}/ready`, {
      method: 'POST',
    });
    const res = await POST(req, { params: Promise.resolve({ gameId }) });
    expect(res.status).toBe(401);
  });

  it('should return 401 for an unknown player secret', async () => {
    const gameId = 'ready-wrong-secret';
    await repo.save(baseJoiningGame({ gameId }));

    const req = makeRequest(gameId, 'wrong-secret');
    const res = await POST(req, { params: Promise.resolve({ gameId }) });
    expect(res.status).toBe(401);
  });
});
