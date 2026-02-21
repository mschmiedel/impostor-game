
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
      status: 'JOINING',
      players: [{ id: playerId, name: 'Host', role: 'HOST', secret: playerSecret }],
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
