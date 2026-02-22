
/**
 * @jest-environment node
 */
import { GET } from '@/app/api/getGameDetails/[gameId]/route';
import { POST } from '@/app/api/createGame/route';
import { RedisGameRepository } from '@/infrastructure/adapters/redis/RedisGameRepository';
import { Game } from '@/domain/entities/Game';
import { NextRequest } from 'next/server';

jest.mock('ioredis', () => require('ioredis-mock'));

const repo = new RedisGameRepository();

function makeGetRequest(gameId: string, playerSecret: string) {
  return new NextRequest(`http://localhost/api/getGameDetails/${gameId}`, {
    method: 'GET',
    headers: { 'x-player-secret': playerSecret },
  });
}

describe('GET /api/getGameDetails/[gameId]', () => {
  let createdGame: any;

  beforeAll(async () => {
    const body = {
      ageOfYoungestPlayer: 10,
      creatorName: 'AdminUser'
    };
    const req = new NextRequest('http://localhost/api/createGame', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const res = await POST(req);
    createdGame = await res.json();
  });

  it('should retrieve game details with correct player secret', async () => {
    const { gameId, playerSecret } = createdGame;
    const res = await GET(makeGetRequest(gameId, playerSecret), { params: Promise.resolve({ gameId }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.gameId).toBe(gameId);
    expect(json.players).toHaveLength(1);
    expect(json.players[0].name).toBe('AdminUser');
    expect(json.players[0]).toHaveProperty('id');
  });

  it('should return 401/403 with incorrect player secret', async () => {
    const { gameId } = createdGame;
    const res = await GET(makeGetRequest(gameId, 'wrong-secret'), { params: Promise.resolve({ gameId }) });
    expect([401, 403]).toContain(res.status);
  });

  it('should return 404 for non-existent game', async () => {
    const gameId = 'non-existent-id';
    const res = await GET(makeGetRequest(gameId, 'some-secret'), { params: Promise.resolve({ gameId }) });
    expect(res.status).toBe(404);
  });
});

describe('GET /api/getGameDetails - isMe flag', () => {
  const gameId = 'game-isme';
  const hostSecret = 'secret-host';
  const playerSecret = 'secret-player';

  beforeAll(async () => {
    const game: Game = {
      gameId,
      status: 'STARTED',
      ageOfYoungestPlayer: 10,
      language: 'de-DE',
      createdAt: Date.now(),
      players: [
        { id: 'host-id', name: 'Host', role: 'HOST', secret: hostSecret },
        { id: 'player-id', name: 'Player', role: 'PLAYER', secret: playerSecret },
      ],
      turns: [],
    };
    await repo.save(game);
  });

  it('should mark only the requesting player as isMe', async () => {
    const res = await GET(makeGetRequest(gameId, playerSecret), { params: Promise.resolve({ gameId }) });
    const json = await res.json();

    const me = json.players.find((p: any) => p.name === 'Player');
    const other = json.players.find((p: any) => p.name === 'Host');

    expect(me.isMe).toBe(true);
    expect(other.isMe).toBe(false);
  });
});

describe('GET /api/getGameDetails - joinCode visibility', () => {
  const joiningGameId = 'game-joining';
  const startedGameId = 'game-started-nojoin';
  const secret = 'secret-xyz';

  beforeAll(async () => {
    const base: Omit<Game, 'gameId' | 'status' | 'joinCode'> = {
      ageOfYoungestPlayer: 10,
      language: 'de-DE',
      createdAt: Date.now(),
      players: [{ id: 'p1', name: 'Alice', role: 'HOST', secret }],
      turns: [],
    };
    await repo.save({ ...base, gameId: joiningGameId, status: 'JOINING', joinCode: '1234' });
    await repo.save({ ...base, gameId: startedGameId, status: 'STARTED' });
  });

  it('should include joinCode when status is JOINING', async () => {
    const res = await GET(makeGetRequest(joiningGameId, secret), { params: Promise.resolve({ gameId: joiningGameId }) });
    const json = await res.json();
    expect(json.joinCode).toBe('1234');
  });

  it('should not include joinCode when status is STARTED', async () => {
    const res = await GET(makeGetRequest(startedGameId, secret), { params: Promise.resolve({ gameId: startedGameId }) });
    const json = await res.json();
    expect(json.joinCode).toBeUndefined();
  });
});

describe('GET /api/getGameDetails - word visibility in active turn', () => {
  const gameId = 'game-active-turn';
  const civilianSecret = 'secret-civilian';
  const impostorSecret = 'secret-impostor';
  const civilianId = 'civilian-id';
  const impostorId = 'impostor-id';

  beforeAll(async () => {
    const game: Game = {
      gameId,
      status: 'STARTED',
      ageOfYoungestPlayer: 10,
      language: 'de-DE',
      createdAt: Date.now(),
      players: [
        { id: civilianId, name: 'Civilian', role: 'PLAYER', secret: civilianSecret },
        { id: impostorId, name: 'Impostor', role: 'PLAYER', secret: impostorSecret },
        { id: 'p3', name: 'Other', role: 'HOST', secret: 'secret-other' },
      ],
      turns: [
        { word: 'Elefant', category: 'Tiere', impostors: [impostorId], civilians: [civilianId, 'p3'] },
      ],
    };
    await repo.save(game);
  });

  it('should show the word to a civilian in the active turn', async () => {
    const res = await GET(makeGetRequest(gameId, civilianSecret), { params: Promise.resolve({ gameId }) });
    const json = await res.json();
    const turn = json.turns[0];

    expect(turn.role).toBe('CIVILIAN');
    expect(turn.word).toBe('Elefant');
    expect(turn.isCurrent).toBe(true);
  });

  it('should hide the word from an impostor in the active turn', async () => {
    const res = await GET(makeGetRequest(gameId, impostorSecret), { params: Promise.resolve({ gameId }) });
    const json = await res.json();
    const turn = json.turns[0];

    expect(turn.role).toBe('IMPOSTOR');
    expect(turn.word).toBeNull();
    expect(turn.isCurrent).toBe(true);
  });

  it('should not reveal impostors/civilians lists in the active turn', async () => {
    const res = await GET(makeGetRequest(gameId, civilianSecret), { params: Promise.resolve({ gameId }) });
    const json = await res.json();
    const turn = json.turns[0];

    expect(turn.impostors).toBeUndefined();
    expect(turn.civilians).toBeUndefined();
  });
});

describe('GET /api/getGameDetails - finished game reveals everything', () => {
  const gameId = 'game-finished';
  const impostorSecret = 'secret-imp-fin';
  const impostorId = 'imp-fin-id';
  const civilianId = 'civ-fin-id';

  beforeAll(async () => {
    const game: Game = {
      gameId,
      status: 'FINISHED',
      ageOfYoungestPlayer: 10,
      language: 'de-DE',
      createdAt: Date.now(),
      players: [
        { id: impostorId, name: 'Impostor', role: 'PLAYER', secret: impostorSecret },
        { id: civilianId, name: 'Civilian', role: 'HOST', secret: 'secret-civ-fin' },
        { id: 'p3', name: 'Other', role: 'PLAYER', secret: 'secret-other-fin' },
      ],
      turns: [
        { word: 'Giraffe', category: 'Tiere', impostors: [impostorId], civilians: [civilianId, 'p3'] },
      ],
    };
    await repo.save(game);
  });

  it('should reveal the word to the impostor when game is finished', async () => {
    const res = await GET(makeGetRequest(gameId, impostorSecret), { params: Promise.resolve({ gameId }) });
    const json = await res.json();
    const turn = json.turns[0];

    expect(turn.word).toBe('Giraffe');
    expect(turn.isCurrent).toBe(false);
  });

  it('should reveal impostors and civilians lists when game is finished', async () => {
    const res = await GET(makeGetRequest(gameId, impostorSecret), { params: Promise.resolve({ gameId }) });
    const json = await res.json();
    const turn = json.turns[0];

    expect(turn.impostors).toContain(impostorId);
    expect(turn.civilians).toContain(civilianId);
  });
});

describe('GET /api/getGameDetails - multi-turn game', () => {
  const gameId = 'game-multi-turn';
  const impostorSecret = 'secret-imp-multi';
  const impostorId = 'imp-multi-id';
  const civilianId = 'civ-multi-id';

  beforeAll(async () => {
    const game: Game = {
      gameId,
      status: 'STARTED',
      ageOfYoungestPlayer: 10,
      language: 'de-DE',
      createdAt: Date.now(),
      players: [
        { id: impostorId, name: 'Impostor', role: 'PLAYER', secret: impostorSecret },
        { id: civilianId, name: 'Civilian', role: 'HOST', secret: 'secret-civ-multi' },
        { id: 'p3', name: 'Other', role: 'PLAYER', secret: 'secret-other-multi' },
      ],
      turns: [
        { word: 'Apfel', category: 'Obst', impostors: [impostorId], civilians: [civilianId, 'p3'] },
        { word: 'Tiger', category: 'Tiere', impostors: [impostorId], civilians: [civilianId, 'p3'] },
      ],
    };
    await repo.save(game);
  });

  it('should reveal word and roles for past turns even for the impostor', async () => {
    const res = await GET(makeGetRequest(gameId, impostorSecret), { params: Promise.resolve({ gameId }) });
    const json = await res.json();
    const pastTurn = json.turns[0];

    expect(pastTurn.word).toBe('Apfel');
    expect(pastTurn.impostors).toContain(impostorId);
    expect(pastTurn.civilians).toContain(civilianId);
    expect(pastTurn.isCurrent).toBe(false);
  });

  it('should hide word and roles for the current (last) turn from the impostor', async () => {
    const res = await GET(makeGetRequest(gameId, impostorSecret), { params: Promise.resolve({ gameId }) });
    const json = await res.json();
    const currentTurn = json.turns[1];

    expect(currentTurn.word).toBeNull();
    expect(currentTurn.impostors).toBeUndefined();
    expect(currentTurn.isCurrent).toBe(true);
  });
});
