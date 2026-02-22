
/**
 * @jest-environment node
 */
import { POST as postByGameId } from '@/app/api/joinGame/[gameId]/route';
import { POST as postByCode } from '@/app/api/joinGame/route';
import { RedisGameRepository } from '@/infrastructure/adapters/redis/RedisGameRepository';
import { Game } from '@/domain/entities/Game';
import { NextRequest } from 'next/server';

jest.mock('ioredis', () => require('ioredis-mock'));

const repo = new RedisGameRepository();

function makeJoinByIdRequest(gameId: string, playerName: string) {
  return new NextRequest(`http://localhost/api/joinGame/${gameId}`, {
    method: 'POST',
    body: JSON.stringify({ playerName }),
  });
}

function makeJoinByCodeRequest(body: object) {
  return new NextRequest('http://localhost/api/joinGame', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function baseGame(overrides: Partial<Game> = {}): Game {
  return {
    gameId: 'default-game',
    status: 'JOINING',
    joinCode: '1234',
    ageOfYoungestPlayer: 10,
    language: 'de-DE',
    createdAt: Date.now(),
    players: [{ id: 'host-id', name: 'Host', role: 'HOST', secret: 'host-secret', isReady: true }],
    turns: [],
    ...overrides,
  };
}

describe('POST /api/joinGame/:gameId - join by gameId', () => {
  const gameId = 'game-join-by-id';

  beforeEach(async () => {
    await repo.save(baseGame({ gameId }));
  });

  it('should add the player and return 200 with playerId', async () => {
    const response = await postByGameId(makeJoinByIdRequest(gameId, 'Alice'), { params: Promise.resolve({ gameId }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toHaveProperty('playerId');

    const updatedGame = await repo.findById(gameId);
    expect(updatedGame?.players).toHaveLength(2);
    expect(updatedGame?.players[1].name).toBe('Alice');
  });

  it('should return 404 if game does not exist', async () => {
    const response = await postByGameId(makeJoinByIdRequest('no-such-game', 'Alice'), { params: Promise.resolve({ gameId: 'no-such-game' }) });
    expect(response.status).toBe(404);
  });
});

describe('POST /api/joinGame - join by joinCode', () => {
  const gameId = 'game-join-by-code';
  const joinCode = '9999';

  beforeEach(async () => {
    await repo.save(baseGame({ gameId, joinCode }));
  });

  it('should add the player and return 200 when using a valid joinCode', async () => {
    const response = await postByCode(makeJoinByCodeRequest({ joinCode, playerName: 'Bob' }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.gameId).toBe(gameId);
    expect(json).toHaveProperty('playerId');
    expect(json).toHaveProperty('playerSecret');

    const updatedGame = await repo.findById(gameId);
    expect(updatedGame?.players).toHaveLength(2);
    expect(updatedGame?.players[1].name).toBe('Bob');
  });

  it('should return 404 for an invalid joinCode', async () => {
    const response = await postByCode(makeJoinByCodeRequest({ joinCode: '0000', playerName: 'Bob' }));
    expect(response.status).toBe(404);
  });

  it('should return 400 when neither gameId nor joinCode is provided', async () => {
    const response = await postByCode(makeJoinByCodeRequest({ playerName: 'Bob' }));
    expect(response.status).toBe(400);
  });
});

describe('POST /api/joinGame - game state validation', () => {
  it('should return 400 when game is in STARTED state', async () => {
    const gameId = 'game-started';
    await repo.save(baseGame({ gameId, status: 'STARTED' }));

    const response = await postByGameId(makeJoinByIdRequest(gameId, 'Alice'), { params: Promise.resolve({ gameId }) });
    expect(response.status).toBe(400);
  });

  it('should return 400 when game is in FINISHED state', async () => {
    const gameId = 'game-finished-join';
    await repo.save(baseGame({ gameId, status: 'FINISHED' }));

    const response = await postByGameId(makeJoinByIdRequest(gameId, 'Alice'), { params: Promise.resolve({ gameId }) });
    expect(response.status).toBe(400);
  });
});

describe('POST /api/joinGame - input validation', () => {
  const gameId = 'game-input-val';

  beforeEach(async () => {
    await repo.save(baseGame({ gameId }));
  });

  it('should return 400 when playerName is missing', async () => {
    const response = await postByGameId(makeJoinByIdRequest(gameId, ''), { params: Promise.resolve({ gameId }) });
    expect(response.status).toBe(400);
  });
});

describe('POST /api/joinGame - player role and response', () => {
  const gameId = 'game-role-check';

  beforeEach(async () => {
    await repo.save(baseGame({ gameId }));
  });

  it('should assign the PLAYER role to the joining player', async () => {
    await postByGameId(makeJoinByIdRequest(gameId, 'Carol'), { params: Promise.resolve({ gameId }) });

    const updatedGame = await repo.findById(gameId);
    const carol = updatedGame?.players.find(p => p.name === 'Carol');

    expect(carol?.role).toBe('PLAYER');
    expect(carol?.isReady).toBe(true);
  });

  it('should return gameId, playerId and playerSecret in the response', async () => {
    const response = await postByGameId(makeJoinByIdRequest(gameId, 'Dave'), { params: Promise.resolve({ gameId }) });
    const json = await response.json();

    expect(json).toHaveProperty('gameId', gameId);
    expect(json).toHaveProperty('playerId');
    expect(json).toHaveProperty('playerSecret');
    expect(typeof json.playerSecret).toBe('string');
    expect(json.playerSecret.length).toBeGreaterThan(0);
  });
});
