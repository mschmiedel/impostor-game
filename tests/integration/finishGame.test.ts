
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
  const adminPwd = 'admin-pwd-finish';

  beforeEach(async () => {
    const game: Game = {
      gameId,
      adminPwd,
      ageOfYoungestPlayer: 10,
      language: 'de-DE',
      status: 'STARTED',
      players: [{ id: 'p1', name: 'Host' }],
      turns: [],
      createdAt: Date.now(),
    };
    await repo.save(game);
  });

  it('should finish the game and return status FINISHED', async () => {
    const req = new NextRequest(`http://localhost/api/finishGame/${gameId}?adminPwd=${adminPwd}`, {
      method: 'POST',
    });

    const response = await POST(req, { params: { gameId } });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.status).toBe('FINISHED');

    const updatedGame = await repo.findById(gameId);
    expect(updatedGame?.status).toBe('FINISHED');
  });

  it('should return 401 if adminPwd is missing or wrong', async () => {
    const req = new NextRequest(`http://localhost/api/finishGame/${gameId}?adminPwd=wrong`, {
      method: 'POST',
    });
    const response = await POST(req, { params: { gameId } });
    expect(response.status).toBe(401);
  });

  it('should return 404 if game does not exist', async () => {
    const req = new NextRequest(`http://localhost/api/finishGame/fake?adminPwd=${adminPwd}`, {
      method: 'POST',
    });
    const response = await POST(req, { params: { gameId: 'fake' } });
    expect(response.status).toBe(404);
  });
});
