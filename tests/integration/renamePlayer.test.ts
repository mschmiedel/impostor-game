
/**
 * @jest-environment node
 */
import { PATCH } from '@/app/api/players/[gameId]/[playerId]/route';
import { RedisGameRepository } from '@/infrastructure/adapters/redis/RedisGameRepository';
import { Game } from '@/domain/entities/Game';
import { NextRequest } from 'next/server';

jest.mock('ioredis', () => require('ioredis-mock'));

const repo = new RedisGameRepository();

function makeRequest(gameId: string, playerId: string, playerSecret: string, body: object) {
  return new NextRequest(`http://localhost/api/players/${gameId}/${playerId}`, {
    method: 'PATCH',
    headers: { 'x-player-secret': playerSecret },
    body: JSON.stringify(body),
  });
}

function baseGame(overrides: Partial<Game> = {}): Game {
  return {
    gameId: 'rename-game',
    status: 'JOINING',
    joinCode: '1234',
    ageOfYoungestPlayer: 10,
    language: 'de-DE',
    createdAt: Date.now(),
    players: [
      { id: 'host-id', name: 'Host', role: 'HOST', secret: 'host-secret' },
      { id: 'player-id', name: 'Alice', role: 'PLAYER', secret: 'alice-secret' },
    ],
    turns: [],
    ...overrides,
  };
}

describe('PATCH /api/players/:gameId/:playerId - rename player', () => {
  const gameId = 'rename-happy';

  beforeEach(async () => {
    await repo.save(baseGame({ gameId }));
  });

  it('should rename the player and return 200', async () => {
    const req = makeRequest(gameId, 'player-id', 'alice-secret', { newName: 'Alicia' });
    const res = await PATCH(req, { params: Promise.resolve({ gameId, playerId: 'player-id' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({ playerId: 'player-id', name: 'Alicia' });

    const updated = await repo.findById(gameId);
    expect(updated?.players.find(p => p.id === 'player-id')?.name).toBe('Alicia');
  });

  it('should trim whitespace from the new name', async () => {
    const req = makeRequest(gameId, 'player-id', 'alice-secret', { newName: '  Bob  ' });
    const res = await PATCH(req, { params: Promise.resolve({ gameId, playerId: 'player-id' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.name).toBe('Bob');
  });

  it('should return 403 for wrong secret', async () => {
    const req = makeRequest(gameId, 'player-id', 'wrong-secret', { newName: 'Alicia' });
    const res = await PATCH(req, { params: Promise.resolve({ gameId, playerId: 'player-id' }) });
    expect(res.status).toBe(403);
  });

  it('should return 400 when game is in STARTED state', async () => {
    const startedId = 'rename-started';
    await repo.save(baseGame({ gameId: startedId, status: 'STARTED' }));

    const req = makeRequest(startedId, 'player-id', 'alice-secret', { newName: 'Alicia' });
    const res = await PATCH(req, { params: Promise.resolve({ gameId: startedId, playerId: 'player-id' }) });
    expect(res.status).toBe(400);
  });

  it('should return 400 for an empty name', async () => {
    const req = makeRequest(gameId, 'player-id', 'alice-secret', { newName: '   ' });
    const res = await PATCH(req, { params: Promise.resolve({ gameId, playerId: 'player-id' }) });
    expect(res.status).toBe(400);
  });

  it('should return 404 when game does not exist', async () => {
    const req = makeRequest('no-such-game', 'player-id', 'alice-secret', { newName: 'Alicia' });
    const res = await PATCH(req, { params: Promise.resolve({ gameId: 'no-such-game', playerId: 'player-id' }) });
    expect(res.status).toBe(404);
  });

  it('should return 404 when player does not exist', async () => {
    const req = makeRequest(gameId, 'no-such-player', 'alice-secret', { newName: 'Alicia' });
    const res = await PATCH(req, { params: Promise.resolve({ gameId, playerId: 'no-such-player' }) });
    expect(res.status).toBe(404);
  });
});
