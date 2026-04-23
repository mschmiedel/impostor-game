import { CreateGameUseCase } from '../createGame.ts';
import { GameRepository } from '@/domain/ports/GameRepository';
import { GameStatus } from '@/domain/entities/Game';

// Mock the GameRepository
const mockGameRepository = () => ({
  findByJoinCode: jest.fn(),
  save: jest.fn(),
});

describe('CreateGameUseCase', () => {
  let useCase: CreateGameUseCase;
  let gameRepository: jest.Mocked<GameRepository>;

  beforeEach(() => {
    gameRepository = mockGameRepository();
    useCase = new CreateGameUseCase(gameRepository);
  });

  describe('execute', () => {
    const input = {
      ageOfYoungestPlayer: 10,
      creatorName: 'Alice',
      language: 'en-US',
    };

    it('should create a game successfully', async () => {
      // Mock the repository to return no existing game for the join code (unique on first attempt)
      gameRepository.findByJoinCode.mockResolvedValueOnce(null);
      gameRepository.save.mockResolvedValue(undefined);

      const result = await useCase.execute(input);

      expect(result).toMatchObject({
        language: input.language,
        status: 'JOINING',
      });
      expect(result.gameId).toBeTruthy();
      expect(result.joinCode).toBeTruthy();
      expect(result.playerId).toBeTruthy();
      expect(result.playerSecret).toBeTruthy();

      // Verify that the repository methods were called
      expect(gameRepository.findByJoinCode).toHaveBeenCalled();
      expect(gameRepository.save).toHaveBeenCalled();
    });

    it('should throw an error if creator name is empty', async () => {
      const invalidInput = { ...input, creatorName: '' };

      await expect(useCase.execute(invalidInput)).rejects.toThrow(
        'Creator name is required'
      );

      // Ensure no repository calls were made
      expect(gameRepository.findByJoinCode).not.toHaveBeenCalled();
      expect(gameRepository.save).not.toHaveBeenCalled();
    });

    it('should throw an error if unable to generate unique join code after 10 attempts', async () => {
      // Mock the repository to always return an existing game (so join code is never unique)
      gameRepository.findByJoinCode.mockResolvedValue({} as any); // mock an existing game

      await expect(useCase.execute(input)).rejects.toThrow(
        'Could not generate unique join code'
      );

      // Verify that findByJoinCode was called 10 times (the max attempts)
      expect(gameRepository.findByJoinCode).toHaveBeenCalledTimes(10);
      expect(gameRepository.save).not.toHaveBeenCalled();
    });
  });
});
