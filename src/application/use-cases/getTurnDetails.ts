
import { GameRepository } from '../../domain/ports/GameRepository';
import { Game, GameStatus } from '../../domain/entities/Game';

export interface TurnDetailsResponse {
  gameId: string;
  status: GameStatus;
  players: { id: string; name: string }[];
  actualTurn: {
    role: 'CIVILIAN' | 'IMPOSTOR' | null;
    word: string | null;
  } | null;
  pastTurns: {
    word: string;
    impostors: string[]; // Names
    civilians: string[]; // Names
  }[];
}

export class GetTurnDetailsUseCase {
  constructor(private gameRepository: GameRepository) {}

  async execute(gameId: string, playerId: string): Promise<TurnDetailsResponse> {
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new Error("Game not found");
    }

    const player = game.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error("Player not found in game");
    }

    const response: TurnDetailsResponse = {
      gameId: game.gameId,
      status: game.status,
      players: game.players,
      actualTurn: null,
      pastTurns: []
    };

    // Process Turns
    if (game.turns && game.turns.length > 0) {
      // Logic:
      // If Game is FINISHED: All turns are past turns.
      // If Game is STARTED: Last turn is actualTurn, others are past.
      
      let pastTurnsSource = game.turns;
      
      if (game.status === 'STARTED') {
        const currentTurn = game.turns[game.turns.length - 1];
        pastTurnsSource = game.turns.slice(0, -1);
        
        const isImpostor = currentTurn.impostors.includes(playerId);
        const isCivilian = currentTurn.civilians.includes(playerId);
        
        let role: 'CIVILIAN' | 'IMPOSTOR' | null = null;
        if (isImpostor) role = 'IMPOSTOR';
        else if (isCivilian) role = 'CIVILIAN';
        
        response.actualTurn = {
          role,
          word: role === 'CIVILIAN' ? currentTurn.word : null
        };
      } else if (game.status === 'FINISHED') {
         // If finished, maybe we want to show the last turn as "actual" result?
         // Or just everything in pastTurns?
         // API Design says "actualTurn" has role/word.
         // Let's keep the last turn as actualTurn logic even if finished, so the UI can show "You were Impostor".
         // BUT if finished, the word should be revealed to impostor too?
         // Design doesn't specify. Let's stick to strict role visibility for actualTurn, 
         // and full visibility for pastTurns. 
         // Actually, if finished, the user probably wants to see everything.
         // Let's put everything in pastTurns if finished?
         // Or better: Logic for STARTED applies.
         
         // Let's assume strict "current turn is hidden" logic only applies to STARTED.
         // If FINISHED, we might return null for actualTurn and everything in past.
         // OR we just return the last state.
         // Let's stick to: actualTurn is NULL if finished? No, the player wants to see their last role.
         // Let's stick to the same logic as STARTED for actualTurn, but maybe reveal the word?
         // For now, simple implementation: Same as STARTED.
         // Wait, if finished, there is no "actual turn" in terms of "playing now".
         // Let's put all turns in pastTurns if finished.
         
         if (game.status === 'FINISHED') {
             pastTurnsSource = game.turns;
             response.actualTurn = null; 
         }
      }

      // Map past turns
      response.pastTurns = pastTurnsSource.map(t => {
        return {
          word: t.word,
          impostors: t.impostors.map(id => game.players.find(p => p.id === id)?.name || 'Unknown'),
          civilians: t.civilians.map(id => game.players.find(p => p.id === id)?.name || 'Unknown')
        };
      });
      
      // If finished, the last turn is now in pastTurns, so everyone sees everything. Correct.
    }

    return response;
  }
}
