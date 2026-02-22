
/**
 * @jest-environment node
 */
import { DELETE } from '@/app/api/players/[gameId]/[playerId]/route';
import { RedisGameRepository } from '@/infrastructure/adapters/redis/RedisGameRepository';
import { Game } from '@/domain/entities/Game';
import { NextRequest } from 'next/server';

jest.mock('ioredis', () => require('ioredis-mock'));

const repo = new RedisGameRepository();

function makeRequest(gameId: string, playerId: string, playerSecret: string) {
  return new NextRequest(`http://localhost/api/players/${gameId}/${playerId}`, {
    method: 'DELETE',
    headers: { 'x-player-secret': playerSecret },
  });
}

function baseGame(overrides: Partial<Game> = {}): Game {
  return {
    gameId: 'remove-game',
    status: 'JOINING',
    joinCode: '5678',
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

describe('DELETE /api/players/:gameId/:playerId - remove player', () => {
  it('should remove a player in JOINING state and return 200', async () => {
    const gameId = 'remove-joining';
    await repo.save(baseGame({ gameId }));

    const req = makeRequest(gameId, 'player-id', 'host-secret');
    const res = await DELETE(req, { params: Promise.resolve({ gameId, playerId: 'player-id' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({ removedPlayerId: 'player-id' });

    const updated = await repo.findById(gameId);
    expect(updated?.players).toHaveLength(1);
    expect(updated?.players[0].id).toBe('host-id');
  });

  it('should remove a player in STARTED state and return 200', async () => {
    const gameId = 'remove-started';
    await repo.save(baseGame({ gameId, status: 'STARTED' }));

    const req = makeRequest(gameId, 'player-id', 'host-secret');
    const res = await DELETE(req, { params: Promise.resolve({ gameId, playerId: 'player-id' }) });

    expect(res.status).toBe(200);
  });

  it('should return 403 when a non-host tries to remove a player', async () => {
    const gameId = 'remove-nonhost';
    await repo.save(baseGame({ gameId }));

    const req = makeRequest(gameId, 'host-id', 'alice-secret');
    const res = await DELETE(req, { params: Promise.resolve({ gameId, playerId: 'host-id' }) });
    expect(res.status).toBe(403);
  });

  it('should return 400 when host tries to remove themselves', async () => {
    const gameId = 'remove-self';
    await repo.save(baseGame({ gameId }));

    const req = makeRequest(gameId, 'host-id', 'host-secret');
    const res = await DELETE(req, { params: Promise.resolve({ gameId, playerId: 'host-id' }) });
    expect(res.status).toBe(400);
  });

  it('should return 404 when the target player does not exist', async () => {
    const gameId = 'remove-notfound-player';
    await repo.save(baseGame({ gameId }));

    const req = makeRequest(gameId, 'no-such-player', 'host-secret');
    const res = await DELETE(req, { params: Promise.resolve({ gameId, playerId: 'no-such-player' }) });
    expect(res.status).toBe(404);
  });

  it('should return 404 when the game does not exist', async () => {
    const req = makeRequest('no-such-game', 'player-id', 'host-secret');
    const res = await DELETE(req, { params: Promise.resolve({ gameId: 'no-such-game', playerId: 'player-id' }) });
    expect(res.status).toBe(404);
  });
});
