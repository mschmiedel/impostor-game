
import { GameRepository } from '@/domain/ports/GameRepository';
import { WordGenerator } from '@/domain/ports/WordGenerator';
import { Role, Turn } from '@/domain/entities/Game';

export interface NextTurnInput {
  gameId: string;
  adminPwd: string;
}

export interface NextTurnOutput {
  role: Role;
  word: string | null;
}

export class NextTurnUseCase {
  constructor(
    private gameRepo: GameRepository,
    private wordGenerator: WordGenerator
  ) {}

  async execute(input: NextTurnInput): Promise<NextTurnOutput> {
    const game = await this.gameRepo.findById(input.gameId);
    if (!game) throw new Error("Game not found");
    if (game.adminPwd !== input.adminPwd) throw new Error("Unauthorized");

    if (!game.turns) {
      game.turns = [];
    }

    const players = game.players;
    const count = players.length;
    let impostorCount = 1;

    if (count >= 2) {
       impostorCount = Math.max(1, Math.floor(count / 3));
    }
    
    const shuffled = [...players].sort(() => 0.5 - Math.random());
    const impostors = shuffled.slice(0, impostorCount).map(p => p.id);
    const civilians = shuffled.slice(impostorCount).map(p => p.id);
    const previousWords = game.turns.map(t => t.word);

    // Pass the game language here
    const word = await this.wordGenerator.generateWord(game.ageOfYoungestPlayer, game.language, previousWords);

    const turn: Turn = {
      word,
      impostors,
      civilians
    };

    game.turns.push(turn);
    await this.gameRepo.save(game);

    const creatorId = game.players[0].id;
    const isImpostor = impostors.includes(creatorId);
    
    return {
      role: isImpostor ? 'IMPOSTOR' : 'CIVILIAN',
      word: isImpostor ? null : word
    };
  }
}
