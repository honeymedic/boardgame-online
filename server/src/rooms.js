// 방(Room) 관리.
// 게임 종류와 무관한 부분만 다룬다: 방 만들기, 코드로 입장, 나가기, 시작.
// 실제 게임 규칙은 나중에 games/ 폴더에 게임별로 들어간다.

import { createGame } from "./games/coup/game.js";

const CODE_CHARS ="ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 헷갈리는 0/O, 1/I 제외
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 6;
const MAX_CHAT_LENGTH = 200;
const MAX_CHAT_HISTORY = 50;

// 빠른 반응으로 보낼 수 있는 이모지. 클라이언트 버튼과 같은 목록이어야 한다.
export const EMOTES = ["😂", "😮", "🤔", "😏", "😱", "👍", "👎", "❤️"];

// 아바타 설정. 지금은 색 두 가지뿐이지만 나중에 모자, 눈 모양 등을 여기에 추가한다.
const DEFAULT_AVATAR = { body: "#5b8def", head: "#f2d3b3" };
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function sanitizeAvatar(a) {
  // 클라이언트가 보낸 값은 믿지 않고 형식을 검사해서 받는다
  const out = { ...DEFAULT_AVATAR };
  if (a && typeof a === "object") {
    if (COLOR_RE.test(a.body)) out.body = a.body;
    if (COLOR_RE.test(a.head)) out.head = a.head;
  }
  return out;
}

export class RoomManager {
  constructor() {
    /** @type {Map<string, Room>} 코드 → 방 */
    this.rooms = new Map();
  }

  generateCode() {
    let code;
    do {
      code = "";
      for (let i = 0; i < 4; i++) {
        code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
      }
    } while (this.rooms.has(code));
    return code;
  }

  create({ playerId, nickname, avatar }) {
    const code = this.generateCode();
    const room = {
      code,
      hostId: playerId,
      status: "lobby", // "lobby" | "playing"
      players: [],
      game: null,
      chat: [], // 최근 채팅 (늦게 들어온 사람에게 보여주기 위해 보관)
      createdAt: Date.now(),
    };
    this.rooms.set(code, room);
    this.addPlayer(room, { playerId, nickname, avatar });
    return room;
  }

  join({ code, playerId, nickname, avatar }) {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) throw new Error("존재하지 않는 방 코드입니다.");

    // 이미 이 방에 있던 사람이 다시 들어오는 경우 (새로고침, 재접속)
    const existing = room.players.find((p) => p.id === playerId);
    if (existing) {
      existing.connected = true;
      if (nickname) existing.nickname = nickname;
      if (avatar) existing.avatar = sanitizeAvatar(avatar);
      return room;
    }

    if (room.status !== "lobby") throw new Error("이미 게임이 시작된 방입니다.");
    if (room.players.length >= MAX_PLAYERS) throw new Error("방이 가득 찼습니다.");

    this.addPlayer(room, { playerId, nickname, avatar });
    return room;
  }

  addPlayer(room, { playerId, nickname, avatar }) {
    room.players.push({
      id: playerId,
      nickname: nickname?.trim() || `플레이어${room.players.length + 1}`,
      connected: true,
      avatar: sanitizeAvatar(avatar),
    });
  }

  /** 연결이 끊긴 경우: 바로 제거하지 않고 표시만 한다 (재접속 허용). */
  markDisconnected(code, playerId) {
    const room = this.rooms.get(code);
    if (!room) return null;
    const player = room.players.find((p) => p.id === playerId);
    if (player) player.connected = false;
    return room;
  }

  /** 명시적으로 나가기를 누른 경우: 실제로 제거한다. */
  leave(code, playerId) {
    const room = this.rooms.get(code);
    if (!room) return null;

    room.players = room.players.filter((p) => p.id !== playerId);

    if (room.players.length === 0) {
      this.rooms.delete(code);
      return null;
    }
    // 방장이 나갔으면 남은 첫 번째 사람에게 방장을 넘긴다
    if (room.hostId === playerId) {
      room.hostId = room.players[0].id;
    }
    return room;
  }

  start(code, playerId) {
    const room = this.rooms.get(code);
    if (!room) throw new Error("방을 찾을 수 없습니다.");
    if (room.hostId !== playerId) throw new Error("방장만 시작할 수 있습니다.");
    if (room.status !== "lobby") throw new Error("이미 시작된 게임입니다.");
    if (room.players.length < MIN_PLAYERS) {
      throw new Error(`최소 ${MIN_PLAYERS}명이 필요합니다.`);
    }
    room.status = "playing";
    room.game = createGame(room.players);
    return room;
  }

  /** 채팅 한 줄을 저장하고 돌려준다. 내용은 여기서 다듬는다 (길이 제한, 공백 제거). */
  addChat(code, playerId, text) {
    const room = this.rooms.get(code);
    if (!room) throw new Error("방을 찾을 수 없습니다.");
    const player = room.players.find((p) => p.id === playerId);
    if (!player) throw new Error("방에 없는 플레이어입니다.");
    const clean = String(text ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_CHAT_LENGTH);
    if (!clean) throw new Error("빈 메시지입니다.");
    const msg = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, playerId, nickname: player.nickname, text: clean, ts: Date.now() };
    room.chat.push(msg);
    if (room.chat.length > MAX_CHAT_HISTORY) room.chat.shift();
    return msg;
  }

  /** 방장이 참가자를 내보낸다. 로비에서만 가능. 내보내진 뒤의 방을 돌려준다. */
  kick(code, hostId, targetId) {
    const room = this.rooms.get(code);
    if (!room) throw new Error("방을 찾을 수 없습니다.");
    if (room.hostId !== hostId) throw new Error("방장만 내보낼 수 있습니다.");
    if (room.status !== "lobby") throw new Error("게임 중에는 내보낼 수 없습니다.");
    if (targetId === hostId) throw new Error("자기 자신은 내보낼 수 없습니다.");
    if (!room.players.some((p) => p.id === targetId)) throw new Error("그 플레이어는 방에 없습니다.");
    return this.leave(code, targetId);
  }

  /** 게임을 끝내고 로비로 돌아간다. 방장만 가능. */
  reset(code, playerId) {
    const room = this.rooms.get(code);
    if (!room) throw new Error("방을 찾을 수 없습니다.");
    if (room.hostId !== playerId) throw new Error("방장만 로비로 돌아갈 수 있습니다.");
    room.status = "lobby";
    room.game = null;
    return room;
  }

  /** 클라이언트에 보내도 되는 공개 정보만 추린다. */
  toPublic(room) {
    return {
      code: room.code,
      hostId: room.hostId,
      status: room.status,
      players: room.players.map((p) => ({
        id: p.id,
        nickname: p.nickname,
        connected: p.connected,
        avatar: p.avatar,
      })),
      minPlayers: MIN_PLAYERS,
      maxPlayers: MAX_PLAYERS,
    };
  }
}
