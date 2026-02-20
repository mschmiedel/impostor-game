import { Game } from '@/domain/entities/Game';

export interface GameRepository {
  save(game: Game): Promise<void>;
  findById(gameId: string): Promise<Game | null>;
  findByJoinCode(joinCode: string): Promise<Game | null>;
  deleteJoinCode(joinCode: string): Promise<void>;
}
