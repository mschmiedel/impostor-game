
import { GameRepository } from '@/domain/ports/GameRepository';
import { Game } from '@/domain/entities/Game';
import redis from './client';

export class RedisGameRepository implements GameRepository {
  async save(game: Game): Promise<void> {
    await redis.set(game.gameId, JSON.stringify(game));
    // Set expiry if needed, e.g., 24 hours
    await redis.expire(game.gameId, 86400); 
  }

  async findById(gameId: string): Promise<Game | null> {
    const data = await redis.get(gameId);
    if (!data) return null;
    return JSON.parse(data) as Game;
  }
}
