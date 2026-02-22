import { NextResponse } from 'next/server';
import { RenamePlayerUseCase } from '@/application/use-cases/renamePlayer';
import { RemovePlayerUseCase } from '@/application/use-cases/removePlayer';
import { RedisGameRepository } from '@/infrastructure/adapters/redis/RedisGameRepository';

const gameRepo = new RedisGameRepository();
const renamePlayerUseCase = new RenamePlayerUseCase(gameRepo);
const removePlayerUseCase = new RemovePlayerUseCase(gameRepo);

function mapError(error: Error): NextResponse {
  const { message } = error;
  if (message === "Game not found" || message === "Player not found") {
    return NextResponse.json({ error: message }, { status: 404 });
  }
  if (message === "Unauthorized") {
    return NextResponse.json({ error: message }, { status: 403 });
  }
  if (
    message === "Game not in JOINING state" ||
    message === "Player name is required" ||
    message === "Cannot remove host"
  ) {
    return NextResponse.json({ error: message }, { status: 400 });
  }
  console.error(error);
  return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
}

// PATCH — rename self
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ gameId: string; playerId: string }> }
) {
  try {
    const { gameId, playerId } = await params;
    const playerSecret = request.headers.get('x-player-secret') ?? '';
    const body = await request.json();
    const newName: string = body.newName ?? '';

    const result = await renamePlayerUseCase.execute({ gameId, playerId, playerSecret, newName });
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return mapError(error);
  }
}

// DELETE — host removes player
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ gameId: string; playerId: string }> }
) {
  try {
    const { gameId, playerId } = await params;
    const playerSecret = request.headers.get('x-player-secret') ?? '';

    const result = await removePlayerUseCase.execute({ gameId, playerId, playerSecret });
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return mapError(error);
  }
}
