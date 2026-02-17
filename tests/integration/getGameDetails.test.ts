
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

  it('should retrieve game details with correct player secret', async () => {
    const { gameId, playerSecret } = createdGame;
    const url = `http://localhost/api/getGameDetails/${gameId}`;
    
    const req = new NextRequest(url, { 
        method: 'GET',
        headers: {
            'x-player-secret': playerSecret
        }
    });
    const res = await GET(req, { params: { gameId } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.gameId).toBe(gameId);
    expect(json.players).toHaveLength(1);
    expect(json.players[0].name).toBe('AdminUser');
    expect(json.players[0]).toHaveProperty('id');
  });

  it('should return 401/403 with incorrect player secret', async () => {
    const { gameId } = createdGame;
    const wrongSecret = 'wrong-secret';
    const url = `http://localhost/api/getGameDetails/${gameId}`;
    
    const req = new NextRequest(url, { 
        method: 'GET',
        headers: {
            'x-player-secret': wrongSecret
        }
    });
    const res = await GET(req, { params: { gameId } });
    
    // The implementation returns 403 for Unauthorized (which is technically correct for wrong credential, 401 is missing credential)
    // Checking for either to be safe or checking implementation strictly. Implementation says 403 for Unauthorized.
    expect([401, 403]).toContain(res.status);
  });

  it('should return 404 for non-existent game', async () => {
    const gameId = 'non-existent-id';
    const playerSecret = 'some-secret';
    const url = `http://localhost/api/getGameDetails/${gameId}`;
    
    const req = new NextRequest(url, { 
        method: 'GET',
        headers: {
            'x-player-secret': playerSecret
        }
    });
    const res = await GET(req, { params: { gameId } });
    
    expect(res.status).toBe(404);
  });
});
