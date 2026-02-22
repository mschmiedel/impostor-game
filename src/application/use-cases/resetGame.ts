import { GameRepository } from '@/domain/ports/GameRepository';
import { GameStatus } from '@/domain/entities/Game';

export interface ResetGameInput {
  gameId: string;
  playerSecret: string;
  language: string;
  ageOfYoungestPlayer: number;
}

export interface ResetGameOutput {
  status: GameStatus;
}

export class ResetGameUseCase {
  constructor(private gameRepo: GameRepository) {}

  async execute(input: ResetGameInput): Promise<ResetGameOutput> {
    const game = await this.gameRepo.findById(input.gameId);

    if (!game) {
      throw new Error("Game not found");
    }

    const player = game.players.find(p => p.secret === input.playerSecret);

    if (!player) {
      throw new Error("Unauthorized");
    }

    if (player.role !== 'HOST') {
      throw new Error("Forbidden");
    }

    if (game.status !== 'FINISHED') {
      throw new Error("Game is not finished");
    }

    game.language = input.language;
    game.ageOfYoungestPlayer = input.ageOfYoungestPlayer;
    game.status = 'JOINING';
    game.turns = [];
    game.players = game.players.map(p => ({
      ...p,
      isReady: p.role === 'HOST',
    }));

    await this.gameRepo.save(game);

    return { status: game.status };
  }
}
