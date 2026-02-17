
import { NextResponse } from 'next/server';
import { FinishGameUseCase } from '@/application/use-cases/finishGame';
import { RedisGameRepository } from '@/infrastructure/adapters/redis/RedisGameRepository';

const gameRepo = new RedisGameRepository();
const finishGameUseCase = new FinishGameUseCase(gameRepo);

export async function POST(
  request: Request,
  { params }: { params: { gameId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const adminPwd = searchParams.get('adminPwd');
    const gameId = params.gameId;

    if (!adminPwd) {
      return NextResponse.json({ error: 'Admin password is required' }, { status: 401 });
    }

    const result = await finishGameUseCase.execute({
      gameId: gameId,
      adminPwd: adminPwd,
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
