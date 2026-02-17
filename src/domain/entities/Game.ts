
export type GameStatus = 'JOINING' | 'STARTED' | 'FINISHED';

export interface Player {
  id: string;
  name: string;
}

export type Role = 'CIVILIAN' | 'IMPOSTOR';

export interface Turn {
  word: string;
  impostors: string[]; // playerIds
  civilians: string[]; // playerIds
}

export interface Game {
  gameId: string;
  adminPwd: string;
  ageOfYoungestPlayer: number;
  language: string; // New field
  status: GameStatus;
  players: Player[];
  turns: Turn[];
  createdAt: number;
}
