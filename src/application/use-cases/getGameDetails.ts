
import { GameRepository } from '@/domain/ports/GameRepository';
import { GameStatus } from '@/domain/entities/Game';

export interface GetGameDetailsInput {
  gameId: string;
  playerSecret: string;
}

export interface PlayerDTO {
  id: string;
  name: string;
  role: 'HOST' | 'PLAYER';
  isMe: boolean;
}

export interface TurnDTO {
  word: string | null;
  role: 'IMPOSTOR' | 'CIVILIAN' | 'UNKNOWN';
  impostors?: string[];
  civilians?: string[];
  isCurrent: boolean;
}

export interface GameDTO {
  gameId: string;
  status: GameStatus;
  players: PlayerDTO[];
  turns: TurnDTO[];
  language: string;
  ageOfYoungestPlayer: number;
  createdAt: number;
}

export class GetGameDetailsUseCase {
  constructor(private gameRepo: GameRepository) {}

  async execute(input: GetGameDetailsInput): Promise<GameDTO> {
    const game = await this.gameRepo.findById(input.gameId);

    if (!game) {
      throw new Error("Game not found");
    }

    const requestingPlayer = game.players.find(p => p.secret === input.playerSecret);
    if (!requestingPlayer) {
      throw new Error("Unauthorized");
    }

    const playersDTO: PlayerDTO[] = game.players.map(p => ({
      id: p.id,
      name: p.name,
      role: p.role,
      isMe: p.id === requestingPlayer.id
    }));

    const turnsDTO: TurnDTO[] = (game.turns || []).map((turn, index) => {
      const isLast = index === (game.turns || []).length - 1;
      const isFinished = game.status === 'FINISHED';
      
      // Reveal all details if the game is finished OR this is a past turn
      const revealAll = isFinished || !isLast;

      const myId = requestingPlayer.id;
      const isImpostor = turn.impostors.includes(myId);
      const isCivilian = turn.civilians.includes(myId);

      let role: 'IMPOSTOR' | 'CIVILIAN' | 'UNKNOWN' = 'UNKNOWN';
      if (isImpostor) role = 'IMPOSTOR';
      else if (isCivilian) role = 'CIVILIAN';

      // Logic for revealing the word
      let wordToReturn: string | null = null;
      
      if (revealAll) {
         // Everyone sees the word for past turns
         wordToReturn = turn.word;
      } else {
         // Current turn:
         if (role === 'CIVILIAN') {
            wordToReturn = turn.word;
         } else {
            // Impostors don't see the word
            wordToReturn = null;
         }
      }

      const dto: TurnDTO = {
        word: wordToReturn,
        role,
        isCurrent: isLast && !isFinished
      };

      if (revealAll) {
         dto.impostors = turn.impostors;
         dto.civilians = turn.civilians;
      }

      return dto;
    });

    return {
      gameId: game.gameId,
      status: game.status,
      players: playersDTO,
      turns: turnsDTO,
      language: game.language,
      ageOfYoungestPlayer: game.ageOfYoungestPlayer,
      createdAt: game.createdAt
    };
  }
}
