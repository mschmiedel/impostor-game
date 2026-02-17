
import { GameRepository } from '@/domain/ports/GameRepository';
import { GameStatus } from '@/domain/entities/Game';

export interface FinishGameInput {
  gameId: string;
  playerSecret: string;
}

export interface FinishGameOutput {
  status: GameStatus;
}

export class FinishGameUseCase {
  constructor(private gameRepo: GameRepository) {}

  async execute(input: FinishGameInput): Promise<FinishGameOutput> {
    const game = await this.gameRepo.findById(input.gameId);
    if (!game) {
      throw new Error("Game not found");
    }

    const player = game.players.find(p => p.secret === input.playerSecret);
    if (!player || player.role !== 'HOST') {
      throw new Error("Unauthorized");
    }

    game.status = 'FINISHED';
    await this.gameRepo.save(game);

    return {
      status: game.status
    };
  }
}
