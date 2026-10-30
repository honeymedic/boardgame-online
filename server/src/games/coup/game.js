// 쿠(Coup) 규칙 엔진.
// 네트워크를 전혀 모르는 순수 로직. 상태(state)를 받아서 바꾸고, 잘못된 요청이면 throw 한다.
// 서버(index.js)가 이 모듈을 호출하고, viewFor()로 각 플레이어에게 보여줄 것만 걸러서 보낸다.

export const CHARACTERS = ["duke", "assassin", "captain", "ambassador", "contessa"];

export const CHARACTER_NAMES = {
  duke: "공작",
  assassin: "암살자",
  captain: "사령관",
  ambassador: "대사",
  contessa: "귀부인",
};

// 행동 정의.
//  claim: 이 행동을 하려면 주장해야 하는 캐릭터 (null이면 누구나 가능, 도전 불가)
//  blockedBy: 막을 수 있는 캐릭터들 (비어 있으면 막기 불가)
//  target: 대상 지정 필요 여부
export const ACTIONS = {
  income: { name: "수입", claim: null, blockedBy: [], target: false, cost: 0, desc: "동전 1개를 받습니다." },
  foreign_aid: { name: "해외 원조", claim: null, blockedBy: ["duke"], target: false, cost: 0, desc: "동전 2개. 공작이 막을 수 있습니다." },
  coup: { name: "쿠", claim: null, blockedBy: [], target: true, cost: 7, desc: "동전 7개를 내고 상대 카드 1장을 제거합니다. 막을 수 없습니다." },
  tax: { name: "세금", claim: "duke", blockedBy: [], target: false, cost: 0, desc: "공작: 동전 3개를 받습니다." },
  assassinate: { name: "암살", claim: "assassin", blockedBy: ["contessa"], target: true, cost: 3, desc: "암살자: 동전 3개를 내고 상대 카드 1장을 제거. 귀부인이 막습니다." },
  steal: { name: "갈취", claim: "captain", blockedBy: ["captain", "ambassador"], target: true, cost: 0, desc: "사령관: 상대에게서 동전 2개를 뺏습니다. 사령관/대사가 막습니다." },
  exchange: { name: "교환", claim: "ambassador", blockedBy: [], target: false, cost: 0, desc: "대사: 덱에서 2장을 보고 카드를 바꿉니다." },
};

const MUST_COUP_COINS = 10;

// ───────────────────────── 유틸 ─────────────────────────

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function fail(msg) {
  throw new Error(msg);
}

function player(state, id) {
  return state.players.find((p) => p.id === id) || fail("플레이어를 찾을 수 없습니다.");
}

function isAlive(p) {
  return p.cards.some((c) => !c.revealed);
}

function aliveCards(p) {
  return p.cards.filter((c) => !c.revealed);
}

function alivePlayers(state) {
  return state.players.filter(isAlive);
}

function log(state, text) {
  state.log.push(text);
  if (state.log.length > 100) state.log.shift();
}

function name(state, id) {
  return player(state, id).nickname;
}

function charName(c) {
  return CHARACTER_NAMES[c];
}

// ───────────────────────── 게임 생성 ─────────────────────────

export function createGame(players) {
  const deck = shuffle(CHARACTERS.flatMap((c) => [c, c, c]));
  const state = {
    players: players.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      coins: 2,
      cards: [
        { character: deck.pop(), revealed: false },
        { character: deck.pop(), revealed: false },
      ],
    })),
    deck,
    turn: 0, // state.players 인덱스
    phase: "action", // action | reaction | block_reaction | lose_influence | exchange | game_over
    pending: null,
    log: [],
    winnerId: null,
  };
  shuffle(state.players);
  log(state, `게임 시작! 첫 차례: ${state.players[0].nickname}`);
  return state;
}

// ───────────────────────── 요청 처리 진입점 ─────────────────────────

/** 클라이언트가 보낸 요청 하나를 처리한다. */
export function handle(state, playerId, msg) {
  if (state.phase === "game_over") fail("게임이 끝났습니다.");
  switch (msg.type) {
    case "action":
      return declareAction(state, playerId, msg.action, msg.targetId);
    case "pass":
      return pass(state, playerId);
    case "challenge":
      return challenge(state, playerId);
    case "block":
      return block(state, playerId, msg.character);
    case "lose":
      return loseCard(state, playerId, msg.cardIndex);
    case "exchange":
      return exchangeKeep(state, playerId, msg.keep);
    default:
      fail("알 수 없는 요청입니다.");
  }
}

// ───────────────────────── 행동 선언 ─────────────────────────

function currentPlayer(state) {
  return state.players[state.turn];
}

function declareAction(state, playerId, actionType, targetId) {
  if (state.phase !== "action") fail("지금은 행동을 선언할 수 없습니다.");
  const actor = currentPlayer(state);
  if (actor.id !== playerId) fail("당신의 차례가 아닙니다.");
  const def = ACTIONS[actionType] || fail("알 수 없는 행동입니다.");

  if (actor.coins >= MUST_COUP_COINS && actionType !== "coup") {
    fail(`동전이 ${MUST_COUP_COINS}개 이상이면 반드시 쿠를 해야 합니다.`);
  }
  if (actor.coins < def.cost) fail(`동전이 부족합니다. (${def.cost}개 필요)`);

  let target = null;
  if (def.target) {
    if (!targetId) fail("대상을 선택하세요.");
    target = player(state, targetId);
    if (target.id === actor.id) fail("자기 자신을 대상으로 할 수 없습니다.");
    if (!isAlive(target)) fail("이미 탈락한 플레이어입니다.");
  }

  actor.coins -= def.cost;

  const claimText = def.claim ? ` (${charName(def.claim)} 주장)` : "";
  const targetText = target ? ` → ${target.nickname}` : "";
  log(state, `${actor.nickname}: ${def.name}${claimText}${targetText}`);

  state.pending = {
    action: { type: actionType, actorId: actor.id, targetId: target?.id ?? null },
    challengeOpen: !!def.claim,
    blockOpen: def.blockedBy.length > 0,
    responded: [],
    block: null,
    loss: null,
    exchange: null,
  };

  if (requiredResponders(state).length === 0) {
    resolveAction(state);
  } else {
    state.phase = "reaction";
  }
}

// ───────────────────────── 반응(도전/막기) 단계 ─────────────────────────

/** 지금 반응이 필요한 사람 목록. 도전이 열려 있으면 행동자 빼고 전원, 막기만 남았으면 막을 수 있는 사람만. */
function requiredResponders(state) {
  const { action, challengeOpen, blockOpen } = state.pending;
  if (challengeOpen) {
    return alivePlayers(state).filter((p) => p.id !== action.actorId).map((p) => p.id);
  }
  if (blockOpen) {
    return eligibleBlockers(state);
  }
  return [];
}

function eligibleBlockers(state) {
  const { action } = state.pending;
  const def = ACTIONS[action.type];
  if (def.blockedBy.length === 0) return [];
  if (def.target) {
    const t = player(state, action.targetId);
    return isAlive(t) ? [t.id] : [];
  }
  return alivePlayers(state).filter((p) => p.id !== action.actorId).map((p) => p.id);
}

function blockResponders(state) {
  const blockerId = state.pending.block.blockerId;
  return alivePlayers(state).filter((p) => p.id !== blockerId).map((p) => p.id);
}

function pass(state, playerId) {
  if (state.phase === "reaction") {
    const need = requiredResponders(state);
    if (!need.includes(playerId)) fail("지금 당신의 반응이 필요하지 않습니다.");
    if (state.pending.responded.includes(playerId)) fail("이미 응답했습니다.");
    state.pending.responded.push(playerId);
    if (need.every((id) => state.pending.responded.includes(id))) {
      resolveAction(state);
    }
    return;
  }
  if (state.phase === "block_reaction") {
    const need = blockResponders(state);
    if (!need.includes(playerId)) fail("지금 당신의 반응이 필요하지 않습니다.");
    const b = state.pending.block;
    if (b.responded.includes(playerId)) fail("이미 응답했습니다.");
    b.responded.push(playerId);
    if (need.every((id) => b.responded.includes(id))) {
      blockSucceeds(state);
    }
    return;
  }
  fail("지금은 패스할 수 없습니다.");
}

function challenge(state, challengerId) {
  const challenger = player(state, challengerId);
  if (!isAlive(challenger)) fail("탈락한 플레이어는 도전할 수 없습니다.");

  if (state.phase === "reaction") {
    const { action, challengeOpen } = state.pending;
    if (!challengeOpen) fail("이 행동은 도전할 수 없습니다.");
    if (challengerId === action.actorId) fail("자기 행동에 도전할 수 없습니다.");
    const actor = player(state, action.actorId);
    const claim = ACTIONS[action.type].claim;
    log(state, `${challenger.nickname}이(가) ${actor.nickname}의 ${charName(claim)} 주장에 도전!`);

    if (hasCharacter(actor, claim)) {
      log(state, `${actor.nickname}이(가) ${charName(claim)}을(를) 공개했습니다. 도전 실패!`);
      redraw(state, actor, claim);
      requestLoss(state, challenger.id, "continue_reaction");
    } else {
      log(state, `${actor.nickname}에게 ${charName(claim)}이(가) 없었습니다. 도전 성공!`);
      requestLoss(state, actor.id, "action_fails");
    }
    return;
  }

  if (state.phase === "block_reaction") {
    const b = state.pending.block;
    if (challengerId === b.blockerId) fail("자기 막기에 도전할 수 없습니다.");
    const blocker = player(state, b.blockerId);
    log(state, `${challenger.nickname}이(가) ${blocker.nickname}의 ${charName(b.character)} 주장에 도전!`);

    if (hasCharacter(blocker, b.character)) {
      log(state, `${blocker.nickname}이(가) ${charName(b.character)}을(를) 공개했습니다. 도전 실패!`);
      redraw(state, blocker, b.character);
      requestLoss(state, challenger.id, "blocked");
    } else {
      log(state, `${blocker.nickname}에게 ${charName(b.character)}이(가) 없었습니다. 도전 성공!`);
      requestLoss(state, blocker.id, "resolve_action");
    }
    return;
  }

  fail("지금은 도전할 수 없습니다.");
}

function block(state, blockerId, character) {
  if (state.phase !== "reaction") fail("지금은 막을 수 없습니다.");
  const { action, blockOpen } = state.pending;
  if (!blockOpen) fail("이 행동은 막을 수 없습니다.");
  if (!eligibleBlockers(state).includes(blockerId)) fail("당신은 이 행동을 막을 수 없습니다.");
  const def = ACTIONS[action.type];
  if (!def.blockedBy.includes(character)) fail("그 캐릭터로는 막을 수 없습니다.");

  const blocker = player(state, blockerId);
  log(state, `${blocker.nickname}이(가) ${charName(character)}(으)로 막기 선언!`);
  state.pending.block = { blockerId, character, responded: [] };

  if (blockResponders(state).length === 0) {
    blockSucceeds(state);
  } else {
    state.phase = "block_reaction";
  }
}

function blockSucceeds(state) {
  const def = ACTIONS[state.pending.action.type];
  log(state, `${def.name}이(가) 막혔습니다.`);
  nextTurn(state);
}

function hasCharacter(p, character) {
  return aliveCards(p).some((c) => c.character === character);
}

/** 도전에서 이긴 사람은 공개한 카드를 덱에 섞어 넣고 새로 뽑는다. */
function redraw(state, p, character) {
  const card = p.cards.find((c) => !c.revealed && c.character === character);
  state.deck.push(card.character);
  shuffle(state.deck);
  card.character = state.deck.pop();
}

// ───────────────────────── 영향력(카드) 잃기 ─────────────────────────

function requestLoss(state, playerId, after) {
  const p = player(state, playerId);
  const alive = aliveCards(p);
  if (alive.length === 0) {
    afterLoss(state, after);
    return;
  }
  if (alive.length === 1) {
    // 선택의 여지가 없으면 바로 공개
    revealCard(state, p, alive[0]);
    afterLoss(state, after);
    return;
  }
  state.pending.loss = { playerId, after };
  state.phase = "lose_influence";
}

function loseCard(state, playerId, cardIndex) {
  if (state.phase !== "lose_influence") fail("지금은 카드를 잃을 단계가 아닙니다.");
  const loss = state.pending.loss;
  if (loss.playerId !== playerId) fail("당신이 카드를 잃을 차례가 아닙니다.");
  const p = player(state, playerId);
  const card = p.cards[cardIndex];
  if (!card || card.revealed) fail("잘못된 카드입니다.");
  revealCard(state, p, card);
  state.pending.loss = null;
  afterLoss(state, loss.after);
}

function revealCard(state, p, card) {
  card.revealed = true;
  log(state, `${p.nickname}이(가) ${charName(card.character)}을(를) 잃었습니다.`);
  if (!isAlive(p)) log(state, `${p.nickname} 탈락!`);
}

function afterLoss(state, after) {
  if (checkGameOver(state)) return;
  switch (after) {
    case "continue_reaction": {
      // 행동에 대한 도전이 실패했다. 도전은 끝났고, 막기가 아직 가능하면 막기 기회를 준다.
      state.pending.challengeOpen = false;
      state.pending.responded = [];
      if (requiredResponders(state).length === 0) resolveAction(state);
      else state.phase = "reaction";
      return;
    }
    case "action_fails":
      log(state, `${ACTIONS[state.pending.action.type].name}이(가) 실패했습니다.`);
      nextTurn(state);
      return;
    case "blocked":
      blockSucceeds(state);
      return;
    case "resolve_action":
      resolveAction(state);
      return;
    case "next_turn":
      nextTurn(state);
      return;
    default:
      fail("내부 오류: 알 수 없는 후속 처리");
  }
}

// ───────────────────────── 행동 해결 ─────────────────────────

function resolveAction(state) {
  const { action } = state.pending;
  const actor = player(state, action.actorId);
  const def = ACTIONS[action.type];
  const target = action.targetId ? player(state, action.targetId) : null;

  if (target && !isAlive(target)) {
    log(state, `${target.nickname}이(가) 이미 탈락해 ${def.name}이(가) 무효가 되었습니다.`);
    nextTurn(state);
    return;
  }

  switch (action.type) {
    case "income":
      actor.coins += 1;
      log(state, `${actor.nickname}이(가) 동전 1개를 받았습니다.`);
      break;
    case "foreign_aid":
      actor.coins += 2;
      log(state, `${actor.nickname}이(가) 동전 2개를 받았습니다.`);
      break;
    case "tax":
      actor.coins += 3;
      log(state, `${actor.nickname}이(가) 동전 3개를 받았습니다.`);
      break;
    case "steal": {
      const amount = Math.min(2, target.coins);
      target.coins -= amount;
      actor.coins += amount;
      log(state, `${actor.nickname}이(가) ${target.nickname}에게서 동전 ${amount}개를 뺏었습니다.`);
      break;
    }
    case "coup":
    case "assassinate":
      log(state, `${def.name} 성공! ${target.nickname}은(는) 카드 1장을 잃습니다.`);
      requestLoss(state, target.id, "next_turn");
      return;
    case "exchange": {
      const drawn = [state.deck.pop(), state.deck.pop()].filter(Boolean);
      state.pending.exchange = { drawn };
      state.phase = "exchange";
      log(state, `${actor.nickname}이(가) 덱에서 카드 ${drawn.length}장을 봅니다.`);
      return;
    }
  }
  nextTurn(state);
}

function exchangeKeep(state, playerId, keep) {
  if (state.phase !== "exchange") fail("지금은 교환 단계가 아닙니다.");
  const { action, exchange } = state.pending;
  if (action.actorId !== playerId) fail("당신의 교환이 아닙니다.");
  const p = player(state, playerId);
  const mine = aliveCards(p);
  const pool = [...mine.map((c) => c.character), ...exchange.drawn];

  if (!Array.isArray(keep) || keep.length !== mine.length) fail(`${mine.length}장을 선택하세요.`);
  const uniq = new Set(keep);
  if (uniq.size !== keep.length || keep.some((i) => !Number.isInteger(i) || i < 0 || i >= pool.length)) {
    fail("잘못된 선택입니다.");
  }

  const kept = keep.map((i) => pool[i]);
  const returned = pool.filter((_, i) => !uniq.has(i));
  mine.forEach((c, idx) => (c.character = kept[idx]));
  state.deck.push(...returned);
  shuffle(state.deck);
  log(state, `${p.nickname}이(가) 교환을 마쳤습니다.`);
  nextTurn(state);
}

// ───────────────────────── 턴 진행 / 종료 ─────────────────────────

function nextTurn(state) {
  if (checkGameOver(state)) return;
  state.pending = null;
  do {
    state.turn = (state.turn + 1) % state.players.length;
  } while (!isAlive(state.players[state.turn]));
  state.phase = "action";
  log(state, `── ${currentPlayer(state).nickname}의 차례 ──`);
}

function checkGameOver(state) {
  const alive = alivePlayers(state);
  if (alive.length <= 1) {
    state.phase = "game_over";
    state.winnerId = alive[0]?.id ?? null;
    state.pending = null;
    if (alive[0]) log(state, `🏆 ${alive[0].nickname} 승리!`);
    return true;
  }
  return false;
}

// ───────────────────────── 플레이어별 뷰 ─────────────────────────

/** 이 플레이어에게 보여줘도 되는 정보만 추린다. 남의 뒷면 카드는 절대 포함하지 않는다. */
export function viewFor(state, viewerId) {
  const pending = state.pending;
  return {
    phase: state.phase,
    turnPlayerId: currentPlayer(state).id,
    winnerId: state.winnerId,
    deckCount: state.deck.length,
    log: state.log.slice(-40),
    players: state.players.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      coins: p.coins,
      alive: isAlive(p),
      cards: p.cards.map((c) =>
        c.revealed || p.id === viewerId
          ? { character: c.character, revealed: c.revealed }
          : { character: null, revealed: false }
      ),
    })),
    pending: pending
      ? {
          action: {
            type: pending.action.type,
            name: ACTIONS[pending.action.type].name,
            claim: ACTIONS[pending.action.type].claim,
            actorId: pending.action.actorId,
            targetId: pending.action.targetId,
          },
          block: pending.block ? { blockerId: pending.block.blockerId, character: pending.block.character } : null,
          lossPlayerId: pending.loss?.playerId ?? null,
          waitingOn: waitingOn(state),
        }
      : null,
    exchangeDrawn:
      state.phase === "exchange" && pending.action.actorId === viewerId ? pending.exchange.drawn : null,
    options: optionsFor(state, viewerId),
  };
}

function waitingOn(state) {
  switch (state.phase) {
    case "action":
      return [currentPlayer(state).id];
    case "reaction":
      return requiredResponders(state).filter((id) => !state.pending.responded.includes(id));
    case "block_reaction":
      return blockResponders(state).filter((id) => !state.pending.block.responded.includes(id));
    case "lose_influence":
      return [state.pending.loss.playerId];
    case "exchange":
      return [state.pending.action.actorId];
    default:
      return [];
  }
}

/** 지금 이 플레이어가 누를 수 있는 버튼들. 클라이언트는 이걸 그대로 그리기만 하면 된다. */
function optionsFor(state, viewerId) {
  const me = state.players.find((p) => p.id === viewerId);
  if (!me || !isAlive(me)) return null;

  switch (state.phase) {
    case "action": {
      if (currentPlayer(state).id !== viewerId) return null;
      const mustCoup = me.coins >= MUST_COUP_COINS;
      return {
        kind: "action",
        mustCoup,
        actions: Object.entries(ACTIONS).map(([type, def]) => ({
          type,
          name: def.name,
          desc: def.desc,
          claim: def.claim,
          cost: def.cost,
          needsTarget: def.target,
          enabled: me.coins >= def.cost && (!mustCoup || type === "coup"),
        })),
        targets: alivePlayers(state).filter((p) => p.id !== viewerId).map((p) => p.id),
      };
    }
    case "reaction": {
      if (!waitingOn(state).includes(viewerId)) return null;
      return {
        kind: "reaction",
        canChallenge: state.pending.challengeOpen,
        blockWith: eligibleBlockers(state).includes(viewerId) ? ACTIONS[state.pending.action.type].blockedBy : [],
      };
    }
    case "block_reaction":
      if (!waitingOn(state).includes(viewerId)) return null;
      return { kind: "block_reaction" };
    case "lose_influence":
      if (state.pending.loss.playerId !== viewerId) return null;
      return {
        kind: "lose",
        cardIndices: me.cards.map((c, i) => (c.revealed ? null : i)).filter((i) => i !== null),
      };
    case "exchange":
      if (state.pending.action.actorId !== viewerId) return null;
      return { kind: "exchange", keepCount: aliveCards(me).length };
    default:
      return null;
  }
}
