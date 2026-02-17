
import { NextResponse } from 'next/server';
import { NextTurnUseCase } from '@/application/use-cases/nextTurn';
import { RedisGameRepository } from '@/infrastructure/adapters/redis/RedisGameRepository';
import { GeminiWordGenerator } from '@/infrastructure/adapters/gemini/GeminiWordGenerator';

const gameRepo = new RedisGameRepository();
const wordGen = new GeminiWordGenerator();
const nextTurnUseCase = new NextTurnUseCase(gameRepo, wordGen);

export async function POST(
  request: Request,
  { params }: { params: { gameId: string } }
) {
  const playerSecret = request.headers.get('x-player-secret');
  const gameId = params.gameId;

  try {
    if (!playerSecret) {
       return NextResponse.json({ error: 'Player secret is required' }, { status: 401 });
    }

    const result = await nextTurnUseCase.execute({
      gameId: gameId,
      playerSecret: playerSecret,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    if (error.message === "Game not found") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
