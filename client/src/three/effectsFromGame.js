// 게임 뷰의 전후를 비교해서 연출 이벤트를 만든다. 순수 함수 (3D/React 의존 없음).
//
// 서버 로그 문장 형식(server/src/games/coup/game.js)에 의존한다:
//   행동:   "{닉}: {행동}" / "{닉}: {행동} ({캐릭터} 주장)" / "... → {대상닉}"
//   막기:   "{닉}이(가) {캐릭터}(으)로 막기 선언!"
//   도전:   "{닉}이(가) {닉}의 {캐릭터} 주장에 도전!"
//   도전 실패(진짜): "{닉}이(가) {캐릭터}을(를) 공개했습니다. 도전 실패!"
//   도전 성공(거짓): "{닉}에게 {캐릭터}이(가) 없었습니다. 도전 성공!"

const CHARACTER_BY_NAME = { 공작: "duke", 암살자: "assassin", 사령관: "captain", 대사: "ambassador", 귀부인: "contessa" };
const ACTION_BY_NAME = { 수입: "income", "해외 원조": "foreign_aid", 쿠: "coup", 세금: "tax", 암살: "assassinate", 갈취: "steal", 교환: "exchange" };

const RE_ACTION = /^(.+?): (수입|해외 원조|쿠|세금|암살|갈취|교환)(?: \((.+?) 주장\))?(?: → (.+))?$/;
const RE_BLOCK = /^(.+?)이\(가\) (.+?)\(으\)로 막기 선언!$/;
const RE_CHALLENGE = /^(.+?)이\(가\) (.+?)의 (.+?) 주장에 도전!$/;
const RE_VERDICT_TRUE = /^(.+?)이\(가\) (.+?)을\(를\) 공개했습니다\. 도전 실패!$/;
const RE_VERDICT_FALSE = /^(.+?)에게 (.+?)이\(가\) 없었습니다\. 도전 성공!$/;

/** 이전 뷰 이후 새로 추가된 로그 줄들. 로그는 최근 40줄만 오므로 마지막 줄 위치로 이어 붙인다. */
export function newLogLines(prevLog, nextLog) {
  if (!prevLog || prevLog.length === 0) return [];
  const last = prevLog[prevLog.length - 1];
  const idx = nextLog.lastIndexOf(last);
  if (idx < 0) return nextLog;
  return nextLog.slice(idx + 1);
}

/**
 * @param prev 이전 게임 뷰 (없으면 null)
 * @param next 새 게임 뷰
 * @param players [{id, nickname}] 닉네임 → id 변환용
 * @returns 이벤트 배열
 *   { type: "claim", playerId, action, character|null, targetId|null }
 *   { type: "block", playerId, character }
 *   { type: "challenge", playerId, targetId }        // 도전자, 주장자
 *   { type: "verdict", playerId, character, success } // 주장자, 주장이 진짜였는지
 */
export function effectsFromGame(prev, next, players) {
  if (!prev || !next) return [];
  const idOf = (nick) => players.find((p) => p.nickname === nick)?.id ?? null;
  const events = [];
  for (const line of newLogLines(prev.log, next.log)) {
    let m;
    if ((m = RE_ACTION.exec(line))) {
      const playerId = idOf(m[1]);
      if (!playerId) continue;
      events.push({
        type: "claim",
        playerId,
        action: ACTION_BY_NAME[m[2]],
        character: m[3] ? CHARACTER_BY_NAME[m[3]] ?? null : null,
        targetId: m[4] ? idOf(m[4]) : null,
      });
    } else if ((m = RE_BLOCK.exec(line))) {
      const playerId = idOf(m[1]);
      if (playerId) events.push({ type: "block", playerId, character: CHARACTER_BY_NAME[m[2]] ?? null });
    } else if ((m = RE_CHALLENGE.exec(line))) {
      const playerId = idOf(m[1]);
      const targetId = idOf(m[2]);
      if (playerId) events.push({ type: "challenge", playerId, targetId });
    } else if ((m = RE_VERDICT_TRUE.exec(line))) {
      const playerId = idOf(m[1]);
      if (playerId) events.push({ type: "verdict", playerId, character: CHARACTER_BY_NAME[m[2]] ?? null, success: true });
    } else if ((m = RE_VERDICT_FALSE.exec(line))) {
      const playerId = idOf(m[1]);
      if (playerId) events.push({ type: "verdict", playerId, character: CHARACTER_BY_NAME[m[2]] ?? null, success: false });
    }
  }
  return events;
}
