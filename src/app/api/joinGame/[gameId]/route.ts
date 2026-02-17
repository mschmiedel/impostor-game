
import { NextResponse } from 'next/server';
import { JoinGameUseCase } from '@/application/use-cases/joinGame';
import { RedisGameRepository } from '@/infrastructure/adapters/redis/RedisGameRepository';

const gameRepo = new RedisGameRepository();
const joinGameUseCase = new JoinGameUseCase(gameRepo);

export async function POST(
  request: Request,
  { params }: { params: { gameId: string } }
) {
  try {
    const body = await request.json();
    const gameId = params.gameId;

    if (!gameId) {
       return NextResponse.json({ error: 'Game ID required' }, { status: 400 });
    }

    if (!body.playerName) {
      return NextResponse.json({ error: 'Player name is required' }, { status: 400 });
    }

    const result = await joinGameUseCase.execute({
      gameId: gameId,
      playerName: body.playerName,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    if (error.message === "Game not found") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error.message === "Game is not in JOINING state" || error.message === "Player name is required") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
