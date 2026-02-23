
import { NextResponse } from 'next/server';
import { CreateGameUseCase } from '@/application/use-cases/createGame';
import { RedisGameRepository } from '@/infrastructure/adapters/redis/RedisGameRepository';
import { CreateGameSchema } from '@/shared/validators/gameValidators';
import { limitCreateGame, getClientIp, hashIp } from '@/infrastructure/adapters/redis/RateLimiter';

const gameRepo = new RedisGameRepository();
const createGameUseCase = new CreateGameUseCase(gameRepo);

export async function POST(request: Request) {
  // Rate limiting
  const ip = getClientIp(request);
  const hashedIp = hashIp(ip);
  const { allowed } = await limitCreateGame(hashedIp);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many game-creation requests. Please wait a moment.' },
      { status: 429 },
    );
  }

  try {
    const body = await request.json();

    // Input validation
    const parsed = CreateGameSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.issues.map(i => i.message) },
        { status: 400 },
      );
    }

    const { creatorName, ageOfYoungestPlayer, language } = parsed.data;

    const result = await createGameUseCase.execute({
      ageOfYoungestPlayer,
      creatorName,
      language,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
