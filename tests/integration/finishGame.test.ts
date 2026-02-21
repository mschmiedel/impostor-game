
/**
 * @jest-environment node
 */
import { POST } from '@/app/api/finishGame/[gameId]/route';
import { RedisGameRepository } from '@/infrastructure/adapters/redis/RedisGameRepository';
import { Game } from '@/domain/entities/Game';
import { NextRequest } from 'next/server';

jest.mock('ioredis', () => require('ioredis-mock'));

describe('POST /api/finishGame/:gameId', () => {
  const repo = new RedisGameRepository();
  const gameId = 'test-game-finish';
  const playerSecret = 'host-secret';
  const playerId = 'host-id';

  beforeEach(async () => {
    const game: Game = {
      gameId,
      // adminPwd removed
      ageOfYoungestPlayer: 10,
      language: 'de-DE',
      status: 'STARTED',
      players: [{ id: playerId, name: 'Host', role: 'HOST', secret: playerSecret }],
      turns: [],
      createdAt: Date.now(),
    };
    await repo.save(game);
  });

  it('should finish the game and return status FINISHED', async () => {
    const req = new NextRequest(`http://localhost/api/finishGame/${gameId}`, {
      method: 'POST',
      headers: {
          'x-player-secret': playerSecret
      }
    });

    const response = await POST(req, { params: Promise.resolve({ gameId }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.status).toBe('FINISHED');

    const updatedGame = await repo.findById(gameId);
    expect(updatedGame?.status).toBe('FINISHED');
  });

  it('should return 401/403 if player secret is missing or wrong', async () => {
    const req = new NextRequest(`http://localhost/api/finishGame/${gameId}`, {
      method: 'POST',
      headers: {
          'x-player-secret': 'wrong'
      }
    });
    const response = await POST(req, { params: Promise.resolve({ gameId }) });
    expect([401, 403]).toContain(response.status);
  });

  it('should return 404 if game does not exist', async () => {
    const req = new NextRequest(`http://localhost/api/finishGame/fake`, {
      method: 'POST',
      headers: {
          'x-player-secret': playerSecret
      }
    });
    const response = await POST(req, { params: Promise.resolve({ gameId: 'fake' }) });
    expect(response.status).toBe(404);
  });
});
