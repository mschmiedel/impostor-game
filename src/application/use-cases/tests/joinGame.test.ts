import { JoinGameUseCase } from './joinGame.ts';
import { GameRepository } from '@/domain/ports/GameRepository';
import { GameStatus } from '@/domain/entities/Game';

// Mock the GameRepository
const mockGameRepository = () => ({
  findById: jest.fn(),
  findByJoinCode: jest.fn(),
  save: jest.fn(),
});

describe('JoinGameUseCase', () => {
  let useCase: JoinGameUseCase;
  let gameRepository: jest.Mocked<GameRepository>;

  beforeEach(() => {
    gameRepository = mockGameRepository();
    useCase = new JoinGameUseCase(gameRepository);
  });

  describe('execute', () => {
    const gameId = 'existing-game-id';
    const joinCode = '1234';
    const playerName = 'Bob';

    it('should allow a player to join a game with correct gameId', async () => {
      const existingGame = {
        gameId,
        joinCode,
        ageOfYoungestPlayer: 10,
        language: 'en-US',
        status: GameStatus.JOINING,
        players: [],
        turns: [],
        createdAt: Date.now(),
      };

      gameRepository.findById.mockResolvedValue(existingGame);
      gameRepository.save.mockResolvedValue(undefined);

      const result = await useCase.execute({ gameId, playerName });

      expect(result).toMatchObject({
        gameId,
        playerId: expect.any(String),
        playerSecret: expect.any(String),
      });
      expect(result.playerId).toBeTruthy();
      expect(result.playerSecret).toBeTruthy();

      // Verify that the repository methods were called
      expect(gameRepository.findById).toHaveBeenCalledWith(gameId);
      expect(gameRepository.save).toHaveBeenCalled();
    });

    it('should allow a player to join a game with correct joinCode', async () => {
      const existingGame = {
        gameId,
        joinCode,
        ageOfYoungestPlayer: 10,
        language: 'en-US',
        status: GameStatus.JOINING,
        players: [],
        turns: [],
        createdAt: Date.now(),
      };

      gameRepository.findByJoinCode.mockResolvedValue(existingGame);
      gameRepository.save.mockResolvedValue(undefined);

      const result = await useCase.execute({ joinCode, playerName });

      expect(result).toMatchObject({
        gameId,
        playerId: expect.any(String),
        playerSecret: expect.any(String),
      });
      expect(result.playerId).toBeTruthy();
      expect(result.playerSecret).toBeTruthy();

      // Verify that the repository methods were called
      expect(gameRepository.findByJoinCode).toHaveBeenCalledWith(joinCode);
      expect(gameRepository.save).toHaveBeenCalled();
    });

    it('should throw an error if game not found by id', async () => {
      gameRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute({ gameId, playerName })).rejects.toThrow(
        'Game not found'
      );

      // Ensure save was not called
      expect(gameRepository.findById).toHaveBeenCalledWith(gameId);
      expect(gameRepository.save).not.toHaveBeenCalled();
    });

    it('should throw an error if game not found by joinCode', async () => {
      gameRepository.findByJoinCode.mockResolvedValue(null);

      await expect(useCase.execute({ joinCode, playerName })).rejects.toThrow(
        'Game not found'
      );

      // Ensure save was not called
      expect(gameRepository.findByJoinCode).toHaveBeenCalledWith(joinCode);
      expect(gameRepository.save).not.toHaveBeenCalled();
    });

    it('should throw an error if join code is incorrect', async () => {
      const existingGame = {
        gameId,
        joinCode: '0000', // different join code
        ageOfYoungestPlayer: 10,
        language: 'en-US',
        status: GameStatus.JOINING,
        players: [],
        turns: [],
        createdAt: Date.now(),
      };

      gameRepository.findByJoinCode.mockResolvedValue(existingGame);

      await expect(useCase.execute({ joinCode: '9999', playerName })).rejects.toThrow(
        'Invalid join code'
      );

      // Ensure save was not called
      expect(gameRepository.findByJoinCode).toHaveBeenCalledWith(gameId); // Actually called with the input joinCode '9999'
      expect(gameRepository.save).not.toHaveBeenCalled();
    });

    it('should throw an error if game already started', async () => {
      const existingGame = {
        gameId,
        joinCode,
        ageOfYoungestPlayer: 10,
        language: 'en-US',
        status: GameStatus.STARTED, // already started
        players: [],
        turns: [],
        createdAt: Date.now(),
      };

      gameRepository.findById.mockResolvedValue(existingGame);

      await expect(useCase.execute({ gameId, playerName })).rejects.toThrow(
        'Game has already started'
      );

      // Ensure save was not called
      expect(gameRepository.findById).toHaveBeenCalledWith(gameId);
      expect(gameRepository.save).not.toHaveBeenCalled();
    });

    it('should throw an error if player name is empty', async () => {
      const existingGame = {
        gameId,
        joinCode,
        ageOfYoungestPlayer: 10,
        language: 'en-US',
        status: GameStatus.JOINING,
        players: [],
        turns: [],
        createdAt: Date.now(),
      };

      gameRepository.findById.mockResolvedValue(existingGame);

      await expect(useCase.execute({ gameId, playerName: '' })).rejects.toThrow(
        'Player name is required'
      );

      // Ensure save was not called
      expect(gameRepository.findById).toHaveBeenCalledWith(gameId);
      expect(gameRepository.save).not.toHaveBeenCalled();
    });
  });
});
