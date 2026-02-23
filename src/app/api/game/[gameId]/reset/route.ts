import { NextResponse } from 'next/server';
import { ResetGameUseCase } from '@/application/use-cases/resetGame';
import { RedisGameRepository } from '@/infrastructure/adapters/redis/RedisGameRepository';

const gameRepo = new RedisGameRepository();
const resetGameUseCase = new ResetGameUseCase(gameRepo);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const playerSecret = request.headers.get('x-player-secret');
  const { gameId } = await params;

  try {
    if (!playerSecret) {
      return NextResponse.json({ error: 'Player secret is required' }, { status: 401 });
    }

    const body = await request.json();
    const { language, ageOfYoungestPlayer } = body;

    const result = await resetGameUseCase.execute({
      gameId,
      playerSecret,
      language,
      ageOfYoungestPlayer,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    if (error.message === "Game not found") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.message === "Game is not finished") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
