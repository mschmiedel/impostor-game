import { v4 as uuidv4 } from 'uuid';
import { GameRepository } from '@/domain/ports/GameRepository';
import { Game } from '@/domain/entities/Game';

export interface JoinGameInput {
  gameId?: string; // Optional if joinCode is provided
  joinCode?: string; // Optional if gameId is provided
  playerName: string;
}

export interface JoinGameOutput {
  gameId: string;
  playerId: string;
  playerSecret: string;
}

export class JoinGameUseCase {
  constructor(private gameRepo: GameRepository) {}

  async execute(input: JoinGameInput): Promise<JoinGameOutput> {
    if (!input.playerName || input.playerName.length < 1) throw new Error("Player name is required");

    let game: Game | null = null;

    if (input.gameId) {
      game = await this.gameRepo.findById(input.gameId);
    } else if (input.joinCode) {
      game = await this.gameRepo.findByJoinCode(input.joinCode);
    } else {
      throw new Error("Game ID or Join Code is required");
    }

    if (!game) {
      throw new Error("Game not found");
    }

    if (game.status !== 'JOINING') {
      throw new Error("Game is not in JOINING state");
    }

    const playerId = uuidv4();
    const playerSecret = uuidv4();
    
    // Check for duplicate names? Not strictly required by prompt but good practice.
    // Prompt says: "Es muss auch auf Duplizierung geachtet werden und vermieden werden." 
    // This likely refers to the join code duplication (which I handled in CreateGame).
    // But duplicate player names could be confusing. Let's not over-engineer unless asked.
    
    game.players.push({ id: playerId, name: input.playerName, secret: playerSecret, role: 'PLAYER' });

    await this.gameRepo.save(game);

    return {
      gameId: game.gameId,
      playerId,
      playerSecret
    };
  }
}
