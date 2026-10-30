import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RoomManager } from "./rooms.js";
import { handle as handleCoup, viewFor as coupViewFor } from "./games/coup/game.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  // 개발 중에는 Vite(5173)에서 오는 요청을 허용. 배포 시에는 같은 서버에서 클라이언트를 서빙하므로 불필요.
  cors: { origin: process.env.NODE_ENV === "production" ? false : "*" },
});

const rooms = new RoomManager();

// 배포용: 빌드된 클라이언트(client/dist)를 같은 서버에서 제공
const clientDist = path.join(__dirname, "../../client/dist");
app.use(express.static(clientDist));
app.get("/healthz", (_req, res) => res.send("ok"));
app.get("*", (_req, res, next) => {
  res.sendFile(path.join(clientDist, "index.html"), (err) => err && next());
});

/** 방의 모든 참가자에게 최신 방 상태를 보낸다. */
function broadcastRoom(room) {
  io.to(room.code).emit("room:update", rooms.toPublic(room));
}

/** 게임 상태를 각 플레이어에게 "그 사람이 봐도 되는 것만" 걸러서 보낸다. */
async function broadcastGame(room) {
  if (!room.game) return;
  const sockets = await io.in(room.code).fetchSockets();
  for (const s of sockets) {
    const pid = s.handshake.auth?.playerId;
    s.emit("game:update", coupViewFor(room.game, pid));
  }
}

io.on("connection", (socket) => {
  // 클라이언트가 localStorage에 저장해둔 고정 ID. 새로고침해도 같은 사람으로 인식한다.
  const playerId = socket.handshake.auth?.playerId;
  if (!playerId) {
    socket.disconnect(true);
    return;
  }
  let currentCode = null;

  console.log(`[연결] ${playerId.slice(0, 8)}`);

  socket.on("room:create", ({ nickname }, cb) => {
    try {
      const room = rooms.create({ playerId, nickname });
      currentCode = room.code;
      socket.join(room.code);
      cb?.({ ok: true, room: rooms.toPublic(room) });
      console.log(`[방 생성] ${room.code} by ${nickname}`);
    } catch (e) {
      cb?.({ ok: false, error: e.message });
    }
  });

  socket.on("room:join", ({ code, nickname }, cb) => {
    try {
      const room = rooms.join({ code, playerId, nickname });
      currentCode = room.code;
      socket.join(room.code);
      cb?.({ ok: true, room: rooms.toPublic(room) });
      broadcastRoom(room);
      // 진행 중인 게임에 재접속한 경우 게임 화면도 바로 보내준다
      if (room.game) socket.emit("game:update", coupViewFor(room.game, playerId));
      console.log(`[입장] ${room.code} ← ${nickname}`);
    } catch (e) {
      cb?.({ ok: false, error: e.message });
    }
  });

  socket.on("room:leave", (_data, cb) => {
    if (!currentCode) return cb?.({ ok: true });
    const room = rooms.leave(currentCode, playerId);
    socket.leave(currentCode);
    currentCode = null;
    if (room) broadcastRoom(room);
    cb?.({ ok: true });
  });

  socket.on("room:start", (_data, cb) => {
    try {
      const room = rooms.start(currentCode, playerId);
      broadcastRoom(room);
      broadcastGame(room);
      cb?.({ ok: true });
      console.log(`[시작] ${room.code}`);
    } catch (e) {
      cb?.({ ok: false, error: e.message });
    }
  });

  // 게임 중 행동: { type: "action"|"pass"|"challenge"|"block"|"lose"|"exchange", ... }
  socket.on("game:action", (msg, cb) => {
    try {
      const room = rooms.rooms.get(currentCode);
      if (!room?.game) throw new Error("진행 중인 게임이 없습니다.");
      handleCoup(room.game, playerId, msg);
      broadcastGame(room);
      cb?.({ ok: true });
    } catch (e) {
      cb?.({ ok: false, error: e.message });
    }
  });

  socket.on("room:reset", (_data, cb) => {
    try {
      const room = rooms.reset(currentCode, playerId);
      broadcastRoom(room);
      cb?.({ ok: true });
    } catch (e) {
      cb?.({ ok: false, error: e.message });
    }
  });

  socket.on("disconnect", () => {
    console.log(`[끊김] ${playerId.slice(0, 8)}`);
    if (!currentCode) return;
    const room = rooms.markDisconnected(currentCode, playerId);
    if (room) broadcastRoom(room);
  });
});

httpServer.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
