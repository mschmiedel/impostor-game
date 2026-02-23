
import { NextResponse } from 'next/server';
import { JoinGameUseCase } from '@/application/use-cases/joinGame';
import { RedisGameRepository } from '@/infrastructure/adapters/redis/RedisGameRepository';
import { JoinGameSchema } from '@/shared/validators/gameValidators';
import { limitGlobalAPI, getClientIp, hashIp } from '@/infrastructure/adapters/redis/RateLimiter';

const gameRepo = new RedisGameRepository();
const joinGameUseCase = new JoinGameUseCase(gameRepo);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  // Rate limiting
  const ip = getClientIp(request);
  const hashedIp = hashIp(ip);
  const { allowed } = await limitGlobalAPI(hashedIp);
  if (!allowed) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { gameId } = await params;

    if (!gameId) {
      return NextResponse.json({ error: 'Game ID required' }, { status: 400 });
    }

    // Input validation
    const parsed = JoinGameSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.issues.map(i => i.message) },
        { status: 400 },
      );
    }

    const result = await joinGameUseCase.execute({
      gameId,
      playerName: parsed.data.playerName,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    if (error.message === 'Game not found') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error.message === 'Game is not in JOINING state') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
