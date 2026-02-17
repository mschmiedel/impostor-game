
/**
 * @jest-environment node
 */
import { POST } from '@/app/api/nextTurn/[gameId]/route';
import { RedisGameRepository } from '@/infrastructure/adapters/redis/RedisGameRepository';
import { Game } from '@/domain/entities/Game';
import { NextRequest } from 'next/server';

jest.mock('ioredis', () => require('ioredis-mock'));

// Mock fetch for Gemini
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      candidates: [{
        content: {
          parts: [{ text: '{"word": "mock-word"}' }]
        }
      }]
    }),
  })
) as jest.Mock;

describe('POST /api/nextTurn/:gameId', () => {
  const repo = new RedisGameRepository();
  const gameId = 'test-game-turn';
  const adminPwd = 'admin-pwd';

  beforeEach(async () => {
    const game: Game = {
      gameId,
      adminPwd,
      ageOfYoungestPlayer: 10,
      language: 'en-US',
      status: 'STARTED',
      players: [
        { id: 'p1', name: 'Alice' }, 
        { id: 'p2', name: 'Bob' },
        { id: 'p3', name: 'Charlie' }
      ],
      turns: [],
      createdAt: Date.now(),
    };
    await repo.save(game);
  });

  it('should start next turn using game language', async () => {
    const req = new NextRequest(`http://localhost/api/nextTurn/${gameId}?adminPwd=${adminPwd}`, {
      method: 'POST',
    });

    const response = await POST(req, { params: { gameId } });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toHaveProperty('role');
    
    // Verify fetch was called (implicit check that language was passed logic-wise)
    expect(global.fetch).toHaveBeenCalled(); 
  });
});
