import { GameRepository } from '@/domain/ports/GameRepository';

export interface StartGameInput {
  gameId: string;
  playerSecret: string; // Changed from playerId to secret for security/consistency with route
}

export interface StartGameOutput {
  gameId: string;
  status: string;
}

export class StartGameUseCase {
  constructor(private gameRepo: GameRepository) {}

  async execute(input: StartGameInput): Promise<StartGameOutput> {
    const game = await this.gameRepo.findById(input.gameId);

    if (!game) {
      throw new Error("Game not found");
    }

    if (game.status !== 'JOINING') {
      throw new Error("Game is not in JOINING state");
    }

    // Verify player is HOST using secret
    const player = game.players.find(p => p.secret === input.playerSecret);
    
    if (!player) {
      throw new Error("Unauthorized"); // Invalid secret
    }
    
    if (player.role !== 'HOST') {
      throw new Error("Only the HOST can start the game");
    }

    // Change status
    game.status = 'STARTED';
    
    // Remove join code from Game entity
    const codeToDelete = game.joinCode;
    delete game.joinCode;

    // Save game (updates status in Redis)
    await this.gameRepo.save(game);

    // Explicitly delete join code from Redis if it existed
    if (codeToDelete) {
      await this.gameRepo.deleteJoinCode(codeToDelete);
    }

    return {
      gameId: game.gameId,
      status: game.status
    };
  }
}
