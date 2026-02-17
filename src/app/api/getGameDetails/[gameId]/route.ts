
import { NextResponse } from 'next/server';
import { GetGameDetailsUseCase } from '@/application/use-cases/getGameDetails';
import { RedisGameRepository } from '@/infrastructure/adapters/redis/RedisGameRepository';

// Dependency Injection
const gameRepo = new RedisGameRepository();
const getGameDetailsUseCase = new GetGameDetailsUseCase(gameRepo);

export async function GET(
  request: Request,
  { params }: { params: { gameId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const adminPwd = searchParams.get('adminPwd');

    if (!adminPwd) {
      return NextResponse.json({ error: 'Missing adminPwd' }, { status: 400 });
    }

    const game = await getGameDetailsUseCase.execute({
      gameId: params.gameId,
      adminPwd,
    });

    return NextResponse.json(game, { status: 200 });
  } catch (error: any) {
    if (error.message === "Game not found") {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
