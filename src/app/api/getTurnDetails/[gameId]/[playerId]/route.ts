
import { NextResponse } from 'next/server';
import { GetTurnDetailsUseCase } from '@/application/use-cases/getTurnDetails';
import { RedisGameRepository } from '@/infrastructure/adapters/redis/RedisGameRepository';

const gameRepo = new RedisGameRepository();
const getTurnDetailsUseCase = new GetTurnDetailsUseCase(gameRepo);

export async function GET(
  request: Request,
  { params }: { params: { gameId: string; playerId: string } }
) {
  try {
    const { gameId, playerId } = params;

    if (!gameId || !playerId) {
      return NextResponse.json({ error: 'Missing gameId or playerId' }, { status: 400 });
    }

    const data = await getTurnDetailsUseCase.execute(gameId, playerId);
    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    if (error.message === "Game not found") {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }
    if (error.message === "Player not found in game") {
      return NextResponse.json({ error: 'Player not found in game' }, { status: 404 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
