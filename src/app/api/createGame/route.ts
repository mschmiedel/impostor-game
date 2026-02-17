
import { NextResponse } from 'next/server';
import { CreateGameUseCase } from '@/application/use-cases/createGame';
import { RedisGameRepository } from '@/infrastructure/adapters/redis/RedisGameRepository';

const gameRepo = new RedisGameRepository();
const createGameUseCase = new CreateGameUseCase(gameRepo);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const result = await createGameUseCase.execute({
      ageOfYoungestPlayer: body.ageOfYoungestPlayer,
      creatorName: body.creatorName,
      language: body.language // Pass language from body
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    if (error.message === "Creator name is required") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
