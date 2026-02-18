import { GameRepository } from '@/domain/ports/GameRepository';
import { Game } from '@/domain/entities/Game';
import redis from './client'; // Assuming client is in the same directory

export class RedisGameRepository implements GameRepository {
  async save(game: Game): Promise<void> {
    // Save the game object
    await redis.set(game.gameId, JSON.stringify(game));
    
    // Set expiry for the game object (e.g., 24 hours)
    // This refreshes the expiry on every save, which is reasonable for active games
    await redis.expire(game.gameId, 86400);

    // Handle Join Code Logic
    if (game.joinCode && game.status === 'JOINING') {
      const joinKey = `join:${game.joinCode}`;
      
      // Check if the join code key already exists to avoid resetting the 30-minute TTL
      const exists = await redis.exists(joinKey);
      
      if (!exists) {
        // If it doesn't exist, set it and set the TTL to 30 minutes (1800 seconds)
        await redis.set(joinKey, game.gameId);
        await redis.expire(joinKey, 1800);
      }
      // If it exists, we do NOT refresh the TTL, so it expires 30 mins after creation.
      // Unless we want to extend it on activity? Requirement says "30 Minuten gültig (oder bis Spiel gestartet wurde)".
      // Usually "30 mins valid" implies strict 30 mins from creation.
    } else if (game.joinCode && game.status !== 'JOINING') {
       // If game is started/finished, ensure join code is removed
       // This covers the case where status changed but code wasn't manually deleted
       await this.deleteJoinCode(game.joinCode);
    }
  }

  async findById(gameId: string): Promise<Game | null> {
    const data = await redis.get(gameId);
    if (!data) return null;
    return JSON.parse(data) as Game;
  }

  async findByJoinCode(joinCode: string): Promise<Game | null> {
    const gameId = await redis.get(`join:${joinCode}`);
    if (!gameId) return null;
    return this.findById(gameId);
  }

  async deleteJoinCode(joinCode: string): Promise<void> {
    await redis.del(`join:${joinCode}`);
  }
}
