
/**
 * @jest-environment node
 */
import { POST } from '@/app/api/createGame/route';
import { RedisGameRepository } from '@/infrastructure/adapters/redis/RedisGameRepository';
import { NextRequest } from 'next/server';

jest.mock('ioredis', () => require('ioredis-mock'));

describe('POST /api/createGame', () => {
  const repo = new RedisGameRepository();

  it('should create a new game with default language', async () => {
    const body = {
      ageOfYoungestPlayer: 12,
      creatorName: 'Host'
    };
    const req = new NextRequest('http://localhost/api/createGame', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json).toHaveProperty('gameId');
    expect(json).toHaveProperty('adminPwd');
    expect(json.language).toBe('de-DE');

    const game = await repo.findById(json.gameId);
    expect(game).toBeDefined();
    expect(game?.creatorName).toBeUndefined(); // entity doesn't have creatorName field at root
    expect(game?.players[0].name).toBe('Host');
    expect(game?.language).toBe('de-DE');
  });

  it('should create a new game with specified language', async () => {
    const body = {
      ageOfYoungestPlayer: 12,
      creatorName: 'Host',
      language: 'en-US'
    };
    const req = new NextRequest('http://localhost/api/createGame', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.language).toBe('en-US');

    const game = await repo.findById(json.gameId);
    expect(game?.language).toBe('en-US');
  });
});
