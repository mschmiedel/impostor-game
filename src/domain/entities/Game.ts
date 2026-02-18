export type GameStatus = 'JOINING' | 'STARTED' | 'FINISHED';

export interface Player {
  id: string;
  name: string;
  secret: string; // Private ID for authentication
  role: 'HOST' | 'PLAYER';
}

export interface Turn {
    playerId: string;
    action: string;
    timestamp: number;
}

export interface Game {
  gameId: string;
  joinCode?: string; // Optional 4-digit code for joining
  ageOfYoungestPlayer: number;
  language: string;
  status: GameStatus;
  players: Player[];
  turns: Turn[];
  createdAt: number;
}
