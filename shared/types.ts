// Shared type definitions between the client and server.
// In a more complex game there would be many more fields and
// interfaces.  These definitions allow both sides to agree on
// the structure of rooms and player state.

export interface RoomSummary {
  id: string;
  name: string;
  playerCount: number;
  locked: boolean;
}

export interface PlayerState {
  id: string;
  name: string;
  x: number;
  y: number;
}

export interface JoinedRoomPayload {
  roomId: string;
  playerId: string;
  players: Record<string, PlayerState>;
}