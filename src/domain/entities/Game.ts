
export type GameStatus = 'JOINING' | 'STARTED' | 'FINISHED';

export type LobbyRole = 'HOST' | 'PLAYER';

export interface Player {
  id: string;
  name: string;
  secret: string; // Authentication secret
  role: LobbyRole;
}

export type GameRole = 'CIVILIAN' | 'IMPOSTOR';

export interface Turn {
  word: string;
  impostors: string[]; // playerIds
  civilians: string[]; // playerIds
}

export interface Game {
  gameId: string;
  // adminPwd removed
  ageOfYoungestPlayer: number;
  language: string;
  status: GameStatus;
  players: Player[];
  turns: Turn[];
  createdAt: number;
}
