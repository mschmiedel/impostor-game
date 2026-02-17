
import { v4 as uuidv4 } from 'uuid';
import { GameRepository } from '@/domain/ports/GameRepository';
import { Game } from '@/domain/entities/Game';

export interface JoinGameInput {
  gameId: string;
  playerName: string;
}

export interface JoinGameOutput {
  gameId: string;
  playerId: string;
}

export class JoinGameUseCase {
  constructor(private gameRepo: GameRepository) {}

  async execute(input: JoinGameInput): Promise<JoinGameOutput> {
    if (!input.gameId) throw new Error("Game ID is required");
    if (!input.playerName || input.playerName.length < 1) throw new Error("Player name is required");

    const game = await this.gameRepo.findById(input.gameId);
    if (!game) {
      throw new Error("Game not found");
    }

    if (game.status !== 'JOINING') {
      throw new Error("Game is not in JOINING state");
    }

    const playerId = uuidv4();
    game.players.push({ id: playerId, name: input.playerName });

    await this.gameRepo.save(game);

    return {
      gameId: game.gameId,
      playerId
    };
  }
}
