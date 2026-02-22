import { GameRepository } from '@/domain/ports/GameRepository';

export interface RemovePlayerInput {
  gameId: string;
  playerId: string;
  playerSecret: string;
}

export interface RemovePlayerOutput {
  removedPlayerId: string;
}

export class RemovePlayerUseCase {
  constructor(private gameRepo: GameRepository) {}

  async execute(input: RemovePlayerInput): Promise<RemovePlayerOutput> {
    const game = await this.gameRepo.findById(input.gameId);
    if (!game) throw new Error("Game not found");

    const requestingPlayer = game.players.find(p => p.secret === input.playerSecret);
    if (!requestingPlayer || requestingPlayer.role !== 'HOST') throw new Error("Unauthorized");

    const target = game.players.find(p => p.id === input.playerId);
    if (!target) throw new Error("Player not found");

    if (target.role === 'HOST') throw new Error("Cannot remove host");

    game.players = game.players.filter(p => p.id !== input.playerId);
    await this.gameRepo.save(game);

    return { removedPlayerId: input.playerId };
  }
}
