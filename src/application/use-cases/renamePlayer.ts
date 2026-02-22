import { GameRepository } from '@/domain/ports/GameRepository';

export interface RenamePlayerInput {
  gameId: string;
  playerId: string;
  playerSecret: string;
  newName: string;
}

export interface RenamePlayerOutput {
  playerId: string;
  name: string;
}

export class RenamePlayerUseCase {
  constructor(private gameRepo: GameRepository) {}

  async execute(input: RenamePlayerInput): Promise<RenamePlayerOutput> {
    const game = await this.gameRepo.findById(input.gameId);
    if (!game) throw new Error("Game not found");

    if (game.status !== 'JOINING') throw new Error("Game not in JOINING state");

    const player = game.players.find(p => p.id === input.playerId);
    if (!player) throw new Error("Player not found");

    if (player.secret !== input.playerSecret) throw new Error("Unauthorized");

    const trimmed = input.newName.trim();
    if (trimmed === '') throw new Error("Player name is required");

    player.name = trimmed;
    await this.gameRepo.save(game);

    return { playerId: player.id, name: player.name };
  }
}
