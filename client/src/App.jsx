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
      setRoom(r);
      if (r.status === "lobby") setGame(null);
    };
    const onGameUpdate = (g) => setGame(g);
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
    if (socket.connected) onConnect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("room:update", onRoomUpdate);
      socket.off("game:update", onGameUpdate);
      socket.off("room:kicked", onKicked);
    };
  }, []);

  const enterRoom = (r) => {
    sessionStorage.setItem("roomCode", r.code);
    setRoom(r);
    setNotice("");
  };

  const leaveRoom = async () => {
    await request("room:leave");
    sessionStorage.removeItem("roomCode");
    setRoom(null);
    setGame(null);
    setPreview(false);
  };

  let screen;
  if (!room) screen = <Home onEnter={enterRoom} notice={notice} />;
  else if (room.status === "lobby" && preview) screen = <Table room={room} onBack={() => setPreview(false)} />;
  else if (room.status === "lobby") screen = <Lobby room={room} onLeave={leaveRoom} onPreview={() => setPreview(true)} />;
  else screen = <Game room={room} game={game} onLeave={leaveRoom} />;

  const fullscreen = room?.status === "lobby" && preview;
  return (
    <div className={`app ${fullscreen ? "fullscreen" : ""}`}>
      {!connected && <div className="banner">서버에 연결 중...</div>}
      {screen}
    </div>
  );
}
