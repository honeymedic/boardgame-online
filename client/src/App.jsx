import { useEffect, useState } from "react";
import { socket, request } from "./socket.js";
import Home from "./screens/Home.jsx";
import Lobby from "./screens/Lobby.jsx";
import Game from "./screens/Game.jsx";
import Table from "./screens/Table.jsx";

export default function App() {
  const [room, setRoom] = useState(null);
  const [game, setGame] = useState(null);
  const [preview, setPreview] = useState(false); // 로비에서 3D 테이블 미리보기 중인지
  const [notice, setNotice] = useState(""); // 홈 화면에 띄울 안내 (예: 내보내짐)
  const [chat, setChat] = useState([]); // 방 채팅 (서버가 보낸 것)
  const [bubbles, setBubbles] = useState({}); // playerId → { text, ts }  아바타 머리 위 말풍선용 (최근 발언/이모지)
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    const onConnect = () => {
      setConnected(true);
      // 재접속 시 이전 방에 자동으로 다시 들어간다
      const saved = sessionStorage.getItem("roomCode");
      if (saved) {
        request("room:join", { code: saved })
          .then((res) => setRoom(res.room))
          .catch(() => {
            // 서버가 재시작됐거나 방이 사라진 경우: 홈으로
            sessionStorage.removeItem("roomCode");
            setRoom(null);
            setGame(null);
            setPreview(false);
          });
      }
    };
    const onDisconnect = () => setConnected(false);
    const onRoomUpdate = (r) => {
      setRoom((prev) => {
        // 게임이 시작되는 순간 3D 테이블을 기본 화면으로 연다
        if (prev?.status !== "playing" && r.status === "playing") setPreview(true);
        return r;
      });
      if (r.status === "lobby") setGame(null);
    };
    const onGameUpdate = (g) => setGame(g);
    const showBubble = (pid, text, ts) => setBubbles((b) => ({ ...b, [pid]: { text, ts } }));
    const onChatHistory = (list) => setChat(list);
    const onChatMessage = (m) => {
      setChat((c) => [...c.slice(-99), m]);
      showBubble(m.playerId, m.text, m.ts);
    };
    const onEmote = ({ playerId: pid, emoji, ts }) => showBubble(pid, emoji, ts);
    const onKicked = () => {
      sessionStorage.removeItem("roomCode");
      setRoom(null);
      setGame(null);
      setPreview(false);
      setNotice("방장이 당신을 내보냈습니다.");
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("room:update", onRoomUpdate);
    socket.on("game:update", onGameUpdate);
    socket.on("room:kicked", onKicked);
    socket.on("chat:history", onChatHistory);
    socket.on("chat:message", onChatMessage);
    socket.on("emote", onEmote);
    if (socket.connected) onConnect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("room:update", onRoomUpdate);
      socket.off("game:update", onGameUpdate);
      socket.off("room:kicked", onKicked);
      socket.off("chat:history", onChatHistory);
      socket.off("chat:message", onChatMessage);
      socket.off("emote", onEmote);
    };
  }, []);

  const enterRoom = (r) => {
    sessionStorage.setItem("roomCode", r.code);
    setRoom(r);
    setNotice("");
    setChat([]);
    setBubbles({});
  };

  const leaveRoom = async () => {
    await request("room:leave");
    sessionStorage.removeItem("roomCode");
    setRoom(null);
    setGame(null);
    setPreview(false);
    setChat([]);
    setBubbles({});
  };

  let screen;
  if (!room) screen = <Home onEnter={enterRoom} notice={notice} />;
  else if (preview)
    screen = <Table room={room} game={room.status === "playing" ? game : null} chat={chat} bubbles={bubbles} onBack={() => setPreview(false)} />;
  else if (room.status === "lobby")
    screen = <Lobby room={room} chat={chat} onLeave={leaveRoom} onPreview={() => setPreview(true)} />;
  else screen = <Game room={room} game={game} chat={chat} onLeave={leaveRoom} onTable={() => setPreview(true)} />;

  const fullscreen = !!room && preview;
  return (
    <div className={`app ${fullscreen ? "fullscreen" : ""}`}>
      {!connected && <div className="banner">서버에 연결 중...</div>}
      {screen}
    </div>
  );
}
