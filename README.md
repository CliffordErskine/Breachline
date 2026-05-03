# Breachline Multiplayer Prototype

This repository contains a **minimal playable prototype** for _Breachline_, a top‑down tactical shooter designed to be played in modern web browsers.  The goal of this project is to move beyond the single‑file HTML prototype you provided and into a properly structured client–server architecture using TypeScript, WebSockets and a Node.js backend.  It can run locally for development and be deployed to a single host so your friends can join the same game session.

⚠️ **Note:** This is an early proof of concept.  Many of the features from the original specification—such as round‑based 8v8 matches, buy phases, grenades, fog‑of‑war and the full weapon economy—have been stubbed or omitted.  The main focus was to set up the plumbing: a Vite‑based client, a Node/Socket.IO server, a clean project layout and a basic multiplayer loop with a server browser.  Use this foundation to iteratively add the remaining gameplay mechanics.

## What’s Included

* **Client**: A Vite + TypeScript project that renders a simple menu, a practice mode and a rudimentary multiplayer mode.  The multiplayer mode talks to the Node server via Socket.IO.  Players are rendered as coloured circles on a canvas and can move around with the WASD keys.  The server maintains the authoritative game state.
* **Server**: A Node.js + TypeScript backend powered by Express and Socket.IO.  It holds an in‑memory list of rooms, handles room creation and joins, tracks players and broadcasts state updates.  The same server can also serve the client build in production.
* **Shared**: A tiny module for shared type definitions.  This ensures that both client and server agree on the shape of room and player objects.
* **README**: This document, which explains how to run, build and deploy the project, notes important environment variables and outlines limitations and future work.

## Running Locally

You can run the client and server together on your machine using Node and npm.  These steps assume you have recent versions of **Node.js** (16+) and **npm** installed.

1. **Install dependencies**: From the root of this repository run:

   ```sh
   cd server && npm install
   cd ../client && npm install
   ```

2. **Start the server**: In one terminal tab run:

   ```sh
   cd server
   npm run dev
   ```

   By default the server listens on port `3000`.  It will automatically compile TypeScript and restart on changes.

3. **Start the client**: In another terminal tab run:

   ```sh
   cd client
   npm run dev
   ```

   This will launch Vite’s dev server on `http://localhost:5173` (or the next available port).  Open that URL in a browser to see the Breachline menu.  You can open multiple browser windows or tabs to simulate multiple players.

4. **Connecting the client to the server**:  The client expects a WebSocket URL based on the current page’s origin.  In development you can set `VITE_WS_URL` to point at your dev server.  For example:

   ```sh
   VITE_WS_URL=http://localhost:3000 npm run dev
   ```

   Without this variable the client attempts to connect to the same origin.

5. **Practice Mode**: Click “Practice” in the menu to enter a simple single‑player environment.  A message is displayed on the canvas as a placeholder for future practice features.

6. **Multiplayer Mode**: Click “Multiplayer” to see the server browser.  Click “Refresh” to retrieve the current list of rooms from the server.  You can create a new room by clicking “Create Room”, entering a name and submitting.  Other players will see the room in their list.  Click “Join” to enter; you’ll control a circle that can move around the map.  The server broadcasts movement updates to all players in the same room.

## Building for Production

To produce a production build of the client and compile the server to JavaScript:

```sh
cd client
npm run build
cd ../server
npm run build
```

The compiled client will live in `client/dist/` and the compiled server in `server/dist/`.  You can then run the server with `node dist/index.js`.  The Express server is configured to serve the client’s build directory in production, so visiting the server’s URL in a browser will load the game.

## Deployment

The simplest deployment is to run a single Node process that serves both the client and hosts the WebSocket server.  Services like **Railway**, **Render**, **Fly.io** or any generic VPS can be used.

1. Set the environment variable `PORT` to the port your host provides (often `process.env.PORT` is automatically supplied).
2. Ensure the client build (from `client/dist`) is copied into `server/public`.  Our server is configured to serve static files from this folder when `NODE_ENV` is `production`.
3. Start the server with `node dist/index.js`.  In production the server will look for static files in `public` and serve them.  WebSocket connections will be available at the same origin using the `/socket.io` path.
4. Point your domain’s A record at the host’s IP address or follow your host’s custom domain instructions.  In most cases you will want to enable HTTPS so that WebSockets use `wss://`.  Services like Cloudflare or your hosting provider can supply SSL certificates.  When using HTTPS your game will connect using secure WebSockets automatically.

### Environment Variables

* `PORT` – the port on which the Node server should listen.
* `CLIENT_ORIGIN` – optional; if set, only this origin is allowed to connect via Socket.IO.
* `VITE_WS_URL` – optional; used by the client during development to override the default WebSocket endpoint.  In production the client uses the current page’s origin.

## Known Limitations & Future Work

This prototype lays the groundwork for a full‑fledged Breachline game, but there is still substantial work to do.  Some major missing pieces include:

* **Rounds & Economy** – There is no notion of buy phases, one‑life rounds, teams, money or a weapon shop.  You would need to build an authoritative match loop on the server and add shop UI and state on the client.
* **Fog of War & Vision** – The practice prototype’s visibility system has not been ported.  All players can see everything.
* **Weapons & Grenades** – The current multiplayer uses only movement.  Weapons, grenades and hit detection need to be implemented and validated server‑side.
* **Maps & Collision** – Movement is unrestricted in this prototype.  You must add map definitions, walls and collision checks to both client and server.
* **UI Polish** – The menus are intentionally minimal.  Adapting the full look and feel of the provided HTML prototype is an excellent follow‑up task.

Despite these omissions, the project demonstrates how to organise a multiplayer browser game with modern tooling.  Use it as a scaffold to build the remaining features step by step.