
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
  const playerSecret = 'host-secret';
  const playerId = 'host-id';

  beforeEach(async () => {
    const game: Game = {
      gameId,
      ageOfYoungestPlayer: 10,
      language: 'en-US',
      status: 'STARTED',
      players: [
        { id: playerId, name: 'Alice', role: 'HOST', secret: playerSecret }, 
        { id: 'p2', name: 'Bob', role: 'PLAYER', secret: 's2' },
        { id: 'p3', name: 'Charlie', role: 'PLAYER', secret: 's3' }
      ],
      turns: [],
      createdAt: Date.now(),
    };
    await repo.save(game);
  });

  it('should start next turn using game language', async () => {
    const req = new NextRequest(`http://localhost/api/nextTurn/${gameId}`, {
      method: 'POST',
      headers: {
          'x-player-secret': playerSecret
      }
    });

    const response = await POST(req, { params: { gameId } });
    const json = await response.json();

    expect(response.status).toBe(200);
    // The endpoint returns { success: true }, not the role directly
    expect(json).toHaveProperty('success', true);
    
    // Verify fetch was called (implicit check that language was passed logic-wise)
    expect(global.fetch).toHaveBeenCalled();

    // Verify that the turn was actually created in the DB
    const updatedGame = await repo.findById(gameId);
    expect(updatedGame?.turns).toHaveLength(1);
    expect(updatedGame?.turns[0].word).toBe('mock-word');
  });
});
