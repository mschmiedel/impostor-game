
/**
 * @jest-environment node
 */
import { POST } from '@/app/api/createGame/route';
import { RedisGameRepository } from '@/infrastructure/adapters/redis/RedisGameRepository';
import { NextRequest } from 'next/server';

jest.mock('ioredis', () => require('ioredis-mock'));
jest.mock('@/infrastructure/adapters/redis/RateLimiter', () => ({
  limitCreateGame: jest.fn().mockResolvedValue({ allowed: true, remaining: 0 }),
  limitGlobalAPI:  jest.fn().mockResolvedValue({ allowed: true, remaining: 59 }),
  getClientIp: jest.fn().mockReturnValue('127.0.0.1'),
  hashIp:      jest.fn().mockReturnValue('hashed-test-ip'),
}));

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
    expect(json).toHaveProperty('playerSecret');
    expect(json.language).toBe('de-DE');

    const game = await repo.findById(json.gameId);
    expect(game).toBeDefined();
    expect(game?.creatorName).toBeUndefined(); // entity doesn't have creatorName field at root
    expect(game?.players[0].name).toBe('Host');
    expect(game?.language).toBe('de-DE');
  });

  it('should return 400 for an invalid creator name (too short)', async () => {
    const req = new NextRequest('http://localhost/api/createGame', {
      method: 'POST',
      body: JSON.stringify({ ageOfYoungestPlayer: 10, creatorName: 'Hi' }),
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it('should return 400 when creator name is an email', async () => {
    const req = new NextRequest('http://localhost/api/createGame', {
      method: 'POST',
      body: JSON.stringify({ ageOfYoungestPlayer: 10, creatorName: 'host@example.com' }),
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it('should return 400 when creator name resembles a phone number', async () => {
    const req = new NextRequest('http://localhost/api/createGame', {
      method: 'POST',
      body: JSON.stringify({ ageOfYoungestPlayer: 10, creatorName: '01234567' }),
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it('should return 400 for an out-of-range age', async () => {
    const req = new NextRequest('http://localhost/api/createGame', {
      method: 'POST',
      body: JSON.stringify({ ageOfYoungestPlayer: 3, creatorName: 'Alice' }),
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
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
