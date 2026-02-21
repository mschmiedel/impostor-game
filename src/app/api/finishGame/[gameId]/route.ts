
import { NextResponse } from 'next/server';
import { FinishGameUseCase } from '@/application/use-cases/finishGame';
import { RedisGameRepository } from '@/infrastructure/adapters/redis/RedisGameRepository';

const gameRepo = new RedisGameRepository();
const finishGameUseCase = new FinishGameUseCase(gameRepo);

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

    const result = await finishGameUseCase.execute({
      gameId: gameId,
      playerSecret: playerSecret,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    if (error.message === "Game not found") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
