
import { GameRepository } from '@/domain/ports/GameRepository';
import { Game } from '@/domain/entities/Game';

export interface GetGameDetailsInput {
  gameId: string;
  adminPwd: string;
}

export class GetGameDetailsUseCase {
  constructor(private gameRepo: GameRepository) {}

  async execute(input: GetGameDetailsInput): Promise<Game> {
    const game = await this.gameRepo.findById(input.gameId);

    if (!game) {
      throw new Error("Game not found");
    }

    if (game.adminPwd !== input.adminPwd) {
      throw new Error("Unauthorized");
    }

    return game;
  }
}
