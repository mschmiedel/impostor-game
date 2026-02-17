
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
  const adminPwd = 'admin-password';

  beforeEach(async () => {
    const game: Game = {
      gameId,
      adminPwd,
      ageOfYoungestPlayer: 10,
      status: 'JOINING',
      players: [{ id: 'host', name: 'Host' }],
      turns: [],
      createdAt: Date.now(),
    };
    await repo.save(game);
  });

  it('should start the game and return 200 with status STARTED', async () => {
    const req = new NextRequest(`http://localhost/api/startGame/${gameId}?adminPwd=${adminPwd}`, {
      method: 'POST',
    });

    const response = await POST(req, { params: { gameId } });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.status).toBe('STARTED');

    const updatedGame = await repo.findById(gameId);
    expect(updatedGame?.status).toBe('STARTED');
  });

  it('should return 401 if adminPwd is wrong', async () => {
    const req = new NextRequest(`http://localhost/api/startGame/${gameId}?adminPwd=wrong`, {
      method: 'POST',
    });
    const response = await POST(req, { params: { gameId } });
    expect(response.status).toBe(401);
  });
});
