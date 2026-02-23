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
  joinCode: string;
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

    // Generate unique 4-digit join code
    let joinCode: string = "";
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
      joinCode = Math.floor(1000 + Math.random() * 9000).toString();
      const existing = await this.gameRepo.findByJoinCode(joinCode);
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw new Error("Could not generate unique join code");
    }

    const newGame: Game = {
      gameId,
      joinCode,
      ageOfYoungestPlayer: input.ageOfYoungestPlayer,
      language,
      status: 'JOINING',
      players: [{ id: playerId, name: input.creatorName, secret: playerSecret, role: 'HOST', isReady: true }],
      turns: [], 
      createdAt: Date.now(),
    };

    await this.gameRepo.save(newGame);

    return {
      gameId: newGame.gameId,
      joinCode: newGame.joinCode!,
      status: newGame.status,
      playerId,
      playerSecret,
      language
    };
  }
}
