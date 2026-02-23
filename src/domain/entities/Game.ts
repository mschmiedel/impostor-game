export type GameStatus = 'JOINING' | 'STARTED' | 'FINISHED';

export interface Player {
  id: string;
  name: string;
  secret: string; // Private ID for authentication
  role: 'HOST' | 'PLAYER';
  isReady: boolean;
}

export interface Turn {
    word: string;
    category: string;
    impostors: string[];
    civilians: string[];
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
