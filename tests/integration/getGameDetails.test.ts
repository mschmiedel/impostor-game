
/**
 * @jest-environment node
 */
import { GET } from '@/app/api/getGameDetails/[gameId]/route';
import { POST } from '@/app/api/createGame/route';
import { NextRequest } from 'next/server';

jest.mock('ioredis', () => require('ioredis-mock'));

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

  it('should retrieve game details with correct adminPwd and player IDs', async () => {
    const { gameId, adminPwd } = createdGame;
    const url = `http://localhost/api/getGameDetails/${gameId}?adminPwd=${adminPwd}`;
    
    const req = new NextRequest(url, { method: 'GET' });
    const res = await GET(req, { params: { gameId } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.gameId).toBe(gameId);
    expect(json.players).toHaveLength(1);
    expect(json.players[0].name).toBe('AdminUser');
    expect(json.players[0]).toHaveProperty('id');
  });

  it('should return 401 with incorrect adminPwd', async () => {
    const { gameId } = createdGame;
    const wrongPwd = 'wrong-password';
    const url = `http://localhost/api/getGameDetails/${gameId}?adminPwd=${wrongPwd}`;
    
    const req = new NextRequest(url, { method: 'GET' });
    const res = await GET(req, { params: { gameId } });
    
    expect(res.status).toBe(401);
  });

  it('should return 404 for non-existent game', async () => {
    const gameId = 'non-existent-id';
    const adminPwd = 'some-password';
    const url = `http://localhost/api/getGameDetails/${gameId}?adminPwd=${adminPwd}`;
    
    const req = new NextRequest(url, { method: 'GET' });
    const res = await GET(req, { params: { gameId } });
    
    expect(res.status).toBe(404);
  });
});
