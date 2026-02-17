
import { v4 as uuidv4 } from 'uuid';
import { GameRepository } from '@/domain/ports/GameRepository';
import { Game, GameStatus } from '@/domain/entities/Game';

export interface CreateGameInput {
  ageOfYoungestPlayer: number;
  creatorName: string;
  language?: string; // Optional input, default to 'de-DE'
}

export interface CreateGameOutput {
  gameId: string;
  status: GameStatus;
  playerId: string;
  playerSecret: string;
  language: string;
}

export class CreateGameUseCase {
  constructor(private gameRepo: GameRepository) {}

  async execute(input: CreateGameInput): Promise<CreateGameOutput> {
    if (input.creatorName.length < 1) {
       throw new Error("Creator name is required");
    }

    const gameId = uuidv4();
    const playerId = uuidv4();
    const playerSecret = uuidv4();
    const language = input.language || 'de-DE';

    const newGame: Game = {
      gameId,
      ageOfYoungestPlayer: input.ageOfYoungestPlayer,
      language,
      status: 'JOINING',
      players: [{ id: playerId, name: input.creatorName, secret: playerSecret, role: 'HOST' }],
      turns: [], 
      createdAt: Date.now(),
    };

    await this.gameRepo.save(newGame);

    return {
      gameId: newGame.gameId,
      status: newGame.status,
      playerId,
      playerSecret,
      language
    };
  }
}
