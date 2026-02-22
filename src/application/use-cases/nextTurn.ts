
import { GameRepository } from '@/domain/ports/GameRepository';
import { WordGenerator } from '@/domain/ports/WordGenerator';
import { Turn } from '@/domain/entities/Game';

export interface NextTurnInput {
  gameId: string;
  playerSecret: string;
}

export interface NextTurnOutput {
  success: boolean;
}

export class NextTurnUseCase {
  constructor(
    private gameRepo: GameRepository,
    private wordGenerator: WordGenerator
  ) {}

  async execute(input: NextTurnInput): Promise<NextTurnOutput> {
    const game = await this.gameRepo.findById(input.gameId);
    if (!game) throw new Error("Game not found");
    
    const player = game.players.find(p => p.secret === input.playerSecret);
    if (!player || player.role !== 'HOST') {
      throw new Error("Unauthorized");
    }

    if (!game.turns) {
      game.turns = [];
    }

    const players = game.players;
    const count = players.length;

    // floor(players / 3), minimum 1: 2-5 players → 1, 6-8 → 2, 9-11 → 3
    const impostorCount = Math.max(1, Math.floor(count / 3));
    
    const shuffled = [...players].sort(() => 0.5 - Math.random());
    const impostors = shuffled.slice(0, impostorCount).map(p => p.id);
    const civilians = shuffled.slice(impostorCount).map(p => p.id);
    const previousWords = game.turns.map(t => t.word);

    const result = await this.wordGenerator.generateWord(game.ageOfYoungestPlayer, game.language, previousWords);

    const turn: Turn = {
      word: result.word,
      category: result.category,
      impostors,
      civilians
    };

    game.turns.push(turn);
    await this.gameRepo.save(game);

    return { success: true };
  }
}
