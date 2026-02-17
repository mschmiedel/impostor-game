
import { GameRepository } from '@/domain/ports/GameRepository';
import { Game } from '@/domain/entities/Game';

export interface StartGameInput {
  gameId: string;
  playerSecret: string;
}

export interface StartGameOutput {
  status: string;
}

export class StartGameUseCase {
  constructor(private gameRepo: GameRepository) {}

  async execute(input: StartGameInput): Promise<StartGameOutput> {
    const game = await this.gameRepo.findById(input.gameId);
    
    if (!game) {
      throw new Error("Game not found");
    }

    const player = game.players.find(p => p.secret === input.playerSecret);
    if (!player || player.role !== 'HOST') {
      throw new Error("Unauthorized");
    }

    // Spec says: "Set game status to STARTED in redis"
    game.status = 'STARTED';
    await this.gameRepo.save(game);

    return { status: 'STARTED' };
  }
}
