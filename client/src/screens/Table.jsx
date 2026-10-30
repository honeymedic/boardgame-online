import TableScene from "../three/TableScene.jsx";

/** 3D 테이블 화면 (시제품). 게임 연결은 아직 없고 자리/아바타/시선만 보여준다. */
export default function Table({ room, onBack }) {
  return (
    <div className="table-view">
      <TableScene players={room.players} />
      <div className="table-overlay top">
        <span className="muted">
          방 {room.code} · {room.players.length}명 · 마우스 드래그 또는 ← → 키로 고개 돌리기
        </span>
        <button className="small" onClick={onBack}>
          로비로
        </button>
      </div>
    </div>
  );
}
