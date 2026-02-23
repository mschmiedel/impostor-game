
/**
 * @jest-environment node
 */
import { POST } from '@/app/api/startGame/[gameId]/route';
import { RedisGameRepository } from '@/infrastructure/adapters/redis/RedisGameRepository';
import { Game } from '@/domain/entities/Game';
import { NextRequest } from 'next/server';

jest.mock('ioredis', () => require('ioredis-mock'));

describe('POST /api/startGame/:gameId', () => {
  const repo = new RedisGameRepository();
  const gameId = 'test-game-start';
  const playerSecret = 'host-secret';
  const playerId = 'host-id';

  beforeEach(async () => {
    const game: Game = {
      gameId,
      ageOfYoungestPlayer: 10,
      language: 'de-DE',
      status: 'JOINING',
      players: [
        { id: playerId, name: 'Host', role: 'HOST', secret: playerSecret, isReady: true },
        { id: 'p2', name: 'Player2', role: 'PLAYER', secret: 'p2-secret', isReady: true },
        { id: 'p3', name: 'Player3', role: 'PLAYER', secret: 'p3-secret', isReady: true },
      ],
      turns: [],
      createdAt: Date.now(),
    };
    await repo.save(game);
  });

  it('should start the game and return 200 with status STARTED', async () => {
    const req = new NextRequest(`http://localhost/api/startGame/${gameId}`, {
      method: 'POST',
      headers: {
          'x-player-secret': playerSecret
      }
    });

    const response = await POST(req, { params: Promise.resolve({ gameId }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.status).toBe('STARTED');

    const updatedGame = await repo.findById(gameId);
    expect(updatedGame?.status).toBe('STARTED');
  });

  it('should return 401/403 if player secret is wrong', async () => {
    const req = new NextRequest(`http://localhost/api/startGame/${gameId}`, {
      method: 'POST',
      headers: {
          'x-player-secret': 'wrong'
      }
    });
    const response = await POST(req, { params: Promise.resolve({ gameId }) });
    expect([401, 403]).toContain(response.status);
  });
});

describe('POST /api/startGame/:gameId - non-ready player filter', () => {
  const repo = new RedisGameRepository();
  const gameId = 'test-game-start-nonready';
  const playerSecret = 'host-secret-nr';

  it('should return 400 when fewer than 3 players are ready', async () => {
    const game: Game = {
      gameId,
      ageOfYoungestPlayer: 10,
      language: 'de-DE',
      status: 'JOINING',
      players: [
        { id: 'h', name: 'Host', role: 'HOST', secret: playerSecret, isReady: true },
        { id: 'p2', name: 'Player2', role: 'PLAYER', secret: 'p2-secret-nr', isReady: true },
        { id: 'p3', name: 'Player3', role: 'PLAYER', secret: 'p3-secret-nr', isReady: false },
      ],
      turns: [],
      createdAt: Date.now(),
    };
    await repo.save(game);

    const req = new NextRequest(`http://localhost/api/startGame/${gameId}`, {
      method: 'POST',
      headers: { 'x-player-secret': playerSecret },
    });
    const response = await POST(req, { params: Promise.resolve({ gameId }) });
    expect(response.status).toBe(400);
  });
});
