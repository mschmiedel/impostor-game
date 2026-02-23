
import { NextResponse } from 'next/server';
import { StartGameUseCase } from '@/application/use-cases/startGame';
import { RedisGameRepository } from '@/infrastructure/adapters/redis/RedisGameRepository';
import { limitGlobalAPI, getClientIp, hashIp } from '@/infrastructure/adapters/redis/RateLimiter';

const gameRepo = new RedisGameRepository();
const startGameUseCase = new StartGameUseCase(gameRepo);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const playerSecret = request.headers.get('x-player-secret');
  const { gameId } = await params;

  // Rate limiting
  const { allowed } = await limitGlobalAPI(hashIp(getClientIp(request)));
  if (!allowed) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  }

  try {
    if (!playerSecret) {
       return NextResponse.json({ error: 'Player secret is required' }, { status: 401 });
    }

    const result = await startGameUseCase.execute({
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
    if (error.message === "Not enough ready players" || error.message === "Game is not in JOINING state" || error.message === "Only the HOST can start the game") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
