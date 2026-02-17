
import { Game } from '../entities/Game';

export interface GameRepository {
  save(game: Game): Promise<void>;
  findById(gameId: string): Promise<Game | null>;
}
