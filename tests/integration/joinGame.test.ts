
/**
 * @jest-environment node
 */
import { POST } from '@/app/api/joinGame/[gameId]/route';
import { RedisGameRepository } from '@/infrastructure/adapters/redis/RedisGameRepository';
import { Game } from '@/domain/entities/Game';
import { NextRequest } from 'next/server';

jest.mock('ioredis', () => require('ioredis-mock'));

describe('POST /api/joinGame/:gameId', () => {
  const repo = new RedisGameRepository();
  const gameId = 'test-game-join';

  beforeEach(async () => {
    const game: Game = {
      gameId,
      adminPwd: 'pwd',
      ageOfYoungestPlayer: 10,
      status: 'JOINING',
      players: [{ id: 'host', name: 'Host' }],
      turns: [],
      createdAt: Date.now(),
    };
    await repo.save(game);
  });

  it('should join the game and return 200 with playerId', async () => {
    const body = { playerName: 'Joiner' };
    const req = new NextRequest(`http://localhost/api/joinGame/${gameId}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    const response = await POST(req, { params: { gameId } });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toHaveProperty('playerId');

    const updatedGame = await repo.findById(gameId);
    expect(updatedGame?.players).toHaveLength(2);
    expect(updatedGame?.players[1].name).toBe('Joiner');
  });

  it('should return 404 if game not found', async () => {
    const req = new NextRequest('http://localhost/api/joinGame/fake', {
      method: 'POST',
      body: JSON.stringify({ playerName: 'P' }),
    });
    const response = await POST(req, { params: { gameId: 'fake' } });
    expect(response.status).toBe(404);
  });
});
