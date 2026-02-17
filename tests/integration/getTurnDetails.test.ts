
import { RedisGameRepository } from '../../src/infrastructure/adapters/redis/RedisGameRepository';
import { GetTurnDetailsUseCase } from '../../src/application/use-cases/getTurnDetails';
import { Game } from '../../src/domain/entities/Game';
import { v4 as uuidv4 } from 'uuid';

// Mock Redis Repository
jest.mock('../../src/infrastructure/adapters/redis/RedisGameRepository');

describe('GetTurnDetailsUseCase', () => {
  let useCase: GetTurnDetailsUseCase;
  let mockRepo: jest.Mocked<RedisGameRepository>;

  beforeEach(() => {
    mockRepo = new RedisGameRepository() as jest.Mocked<RedisGameRepository>;
    useCase = new GetTurnDetailsUseCase(mockRepo);
  });

  it('should return turn details for civilian', async () => {
    const gameId = uuidv4();
    const p1 = { id: 'p1', name: 'Alice' };
    const p2 = { id: 'p2', name: 'Bob' };
    const p3 = { id: 'p3', name: 'Charlie' };
    
    const game: Game = {
      gameId,
      adminPwd: 'pwd',
      ageOfYoungestPlayer: 10,
      language: 'de-DE',
      status: 'STARTED',
      players: [p1, p2, p3],
      turns: [
        { word: 'FirstWord', impostors: ['p2'], civilians: ['p1', 'p3'] },
        { word: 'SecondWord', impostors: ['p1'], civilians: ['p2', 'p3'] }
      ],
      createdAt: Date.now()
    };

    mockRepo.findById.mockResolvedValue(game);

    // Act: Check for p2 (Civilian in turn 2, Impostor in turn 1)
    const result = await useCase.execute(gameId, 'p2');

    // Assert
    expect(result.status).toBe('STARTED');
    expect(result.actualTurn?.role).toBe('CIVILIAN');
    expect(result.actualTurn?.word).toBe('SecondWord'); // Civilian sees word
    
    // Past turn (Turn 1): p2 was Impostor. Past turns should reveal everything.
    expect(result.pastTurns.length).toBe(1);
    expect(result.pastTurns[0].word).toBe('FirstWord');
    expect(result.pastTurns[0].impostors).toContain('Bob');
  });

  it('should return hidden word for impostor', async () => {
    const gameId = uuidv4();
    const p1 = { id: 'p1', name: 'Alice' };
    const p2 = { id: 'p2', name: 'Bob' };
    
    const game: Game = {
        gameId,
        adminPwd: 'pwd',
        ageOfYoungestPlayer: 10,
        language: 'de-DE',
        status: 'STARTED',
        players: [p1, p2],
        turns: [
          { word: 'Secret', impostors: ['p1'], civilians: ['p2'] }
        ],
        createdAt: Date.now()
      };
  
      mockRepo.findById.mockResolvedValue(game);
  
      // Act: Check for p1 (Impostor)
      const result = await useCase.execute(gameId, 'p1');
  
      // Assert
      expect(result.actualTurn?.role).toBe('IMPOSTOR');
      expect(result.actualTurn?.word).toBeNull();
  });
});
