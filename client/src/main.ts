import { io, Socket } from 'socket.io-client';
import type { RoomSummary, PlayerState, JoinedRoomPayload } from '@shared/types';

// Determine the WebSocket endpoint.  In development you can set
// VITE_WS_URL to override.  Otherwise it falls back to the same
// origin, using ws:// for http:// and wss:// for https://.
const defaultWsUrl = (() => {
  const { protocol, host } = window.location;
  const wsProto = protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProto}//${host}`;
})();
const socket: Socket = io((import.meta as any).env.VITE_WS_URL || defaultWsUrl);

const app = document.getElementById('app') as HTMLElement;

function clearApp() {
  app.innerHTML = '';
}

function button(text: string, onClick: () => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.textContent = text;
  btn.addEventListener('click', onClick);
  return btn;
}

// Main menu: choose Practice or Multiplayer
function showMainMenu() {
  clearApp();
  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.alignItems = 'center';
  container.style.justifyContent = 'center';
  const title = document.createElement('h1');
  title.textContent = 'Breachline Prototype';
  title.style.marginBottom = '12px';
  container.appendChild(title);
  const practiceBtn = button('Practice', showPractice);
  const mpBtn = button('Multiplayer', showMultiplayerMenu);
  container.appendChild(practiceBtn);
  container.appendChild(mpBtn);
  app.appendChild(container);
}

// Practice mode placeholder
function showPractice() {
  clearApp();
  const backBtn = button('Back to Menu', showMainMenu);
  backBtn.style.position = 'absolute';
  backBtn.style.top = '20px';
  backBtn.style.left = '20px';
  app.appendChild(backBtn);
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  canvas.style.border = '1px solid rgba(255,255,255,0.2)';
  app.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;
  // Simple draw loop that displays a message
  function draw() {
    ctx.fillStyle = '#10151c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#dff3ff';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Practice mode coming soon…', canvas.width / 2, canvas.height / 2);
    requestAnimationFrame(draw);
  }
  draw();
}

// Multiplayer menu: server browser and create/join actions
function showMultiplayerMenu() {
  clearApp();
  const backBtn = button('Back to Menu', showMainMenu);
  backBtn.style.position = 'absolute';
  backBtn.style.top = '20px';
  backBtn.style.left = '20px';
  app.appendChild(backBtn);

  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.alignItems = 'center';
  container.style.justifyContent = 'flex-start';
  container.style.marginTop = '60px';
  const title = document.createElement('h2');
  title.textContent = 'Server Browser';
  container.appendChild(title);

  const refreshBtn = button('Refresh', () => {
    socket.emit('listRooms');
  });
  container.appendChild(refreshBtn);

  const createBtn = button('Create Room', () => {
    const name = prompt('Room name?', 'My Room');
    if (!name) return;
    const playerName = prompt('Your display name?', `Player${Math.floor(Math.random() * 1000)}`) || 'Player';
    socket.emit('createRoom', { name, playerName });
  });
  container.appendChild(createBtn);

  const listDiv = document.createElement('div');
  listDiv.style.marginTop = '20px';
  listDiv.style.width = '400px';
  container.appendChild(listDiv);
  app.appendChild(container);

  // Listen for room list updates
  socket.off('roomList').on('roomList', (rooms: RoomSummary[]) => {
    renderServerList(listDiv, rooms);
  });
  // Immediately request the current list
  socket.emit('listRooms');
}

function renderServerList(container: HTMLElement, rooms: RoomSummary[]) {
  container.innerHTML = '';
  if (rooms.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'No rooms available.';
    container.appendChild(empty);
    return;
  }
  rooms.forEach((room) => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.justifyContent = 'space-between';
    row.style.padding = '8px';
    row.style.border = '1px solid rgba(255,255,255,0.12)';
    row.style.borderRadius = '8px';
    row.style.marginBottom = '6px';
    const info = document.createElement('div');
    info.textContent = `${room.name} (${room.playerCount}/16)`;
    row.appendChild(info);
    const joinButton = button('Join', () => {
      let password: string | undefined;
      if (room.locked) {
        password = prompt('Password?') || undefined;
      }
      const playerName = prompt('Your display name?', `Player${Math.floor(Math.random() * 1000)}`) || 'Player';
      socket.emit('joinRoom', { roomId: room.id, password, playerName });
    });
    row.appendChild(joinButton);
    container.appendChild(row);
  });
}

// Game loop for multiplayer session
function showGame(payload: JoinedRoomPayload) {
  clearApp();
  const backBtn = button('Leave Room', () => {
    socket.emit('leaveRoom');
    showMultiplayerMenu();
  });
  backBtn.style.position = 'absolute';
  backBtn.style.top = '20px';
  backBtn.style.left = '20px';
  app.appendChild(backBtn);
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  canvas.style.border = '1px solid rgba(255,255,255,0.2)';
  app.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;

  let players: Record<string, PlayerState> = payload.players;
  const myId = payload.playerId;

  // Assign a consistent colour to each player based on ID
  const colourMap: Record<string, string> = {};
  function getColour(id: string): string {
    if (!colourMap[id]) {
      // Generate a pastel colour based on hash of id
      let hash = 0;
      for (let i = 0; i < id.length; i++) hash = (hash << 5) - hash + id.charCodeAt(i);
      const hue = Math.abs(hash) % 360;
      colourMap[id] = `hsl(${hue}, 65%, 60%)`;
    }
    return colourMap[id];
  }

  // Movement state
  const keys: Record<string, boolean> = {};
  window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
  });
  window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
  });

  function sendInput() {
    const dx = (keys['d'] ? 1 : 0) - (keys['a'] ? 1 : 0);
    const dy = (keys['s'] ? 1 : 0) - (keys['w'] ? 1 : 0);
    socket.emit('playerInput', { dx, dy });
  }

  function update() {
    sendInput();
    draw();
    requestAnimationFrame(update);
  }

  function draw() {
    ctx.fillStyle = '#10151c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (const id in players) {
      const p = players[id];
      ctx.beginPath();
      ctx.fillStyle = getColour(id);
      ctx.arc(p.x, p.y, id === myId ? 12 : 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '10px Arial';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(p.name, p.x, p.y - 14);
    }
  }

  // Listen for state updates from the server
  socket.off('state').on('state', (data: { players: Record<string, PlayerState> }) => {
    players = data.players;
  });

  socket.off('playerJoined').on('playerJoined', ({ player }: { player: PlayerState }) => {
    players[player.id] = player;
  });
  socket.off('playerLeft').on('playerLeft', ({ playerId }: { playerId: string }) => {
    delete players[playerId];
  });

  update();
}

// Listen for join events from the server
socket.on('joinedRoom', (payload: JoinedRoomPayload) => {
  showGame(payload);
});
socket.on('joinError', (data: { message: string }) => {
  alert(data.message);
});

// Kick off the app
showMainMenu();