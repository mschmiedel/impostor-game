import { GameRepository } from '@/domain/ports/GameRepository';

export interface ReadyPlayerInput {
  gameId: string;
  playerSecret: string;
}

export interface ReadyPlayerOutput {
  playerId: string;
}

export class ReadyPlayerUseCase {
  constructor(private gameRepo: GameRepository) {}

  async execute(input: ReadyPlayerInput): Promise<ReadyPlayerOutput> {
    const game = await this.gameRepo.findById(input.gameId);

    if (!game) {
      throw new Error("Game not found");
    }

    const player = game.players.find(p => p.secret === input.playerSecret);

    if (!player) {
      throw new Error("Unauthorized");
    }

    player.isReady = true;

    await this.gameRepo.save(game);

    return { playerId: player.id };
  }
}
