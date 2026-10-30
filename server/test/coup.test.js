import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame, handle, viewFor } from "../src/games/coup/game.js";

// 테스트용: 플레이어 순서와 카드를 고정한다.
function setup(hands) {
  const players = Object.keys(hands).map((id) => ({ id, nickname: id.toUpperCase() }));
  const s = createGame(players);
  s.players.sort((a, b) => players.findIndex((p) => p.id === a.id) - players.findIndex((p) => p.id === b.id));
  s.turn = 0;
  for (const p of s.players) {
    p.cards = hands[p.id].map((c) => ({ character: c, revealed: false }));
  }
  return s;
}
const P = (s, id) => s.players.find((p) => p.id === id);

test("수입: 바로 해결되고 다음 턴", () => {
  const s = setup({ a: ["duke", "duke"], b: ["captain", "contessa"] });
  handle(s, "a", { type: "action", action: "income" });
  assert.equal(P(s, "a").coins, 3);
  assert.equal(s.phase, "action");
  assert.equal(s.players[s.turn].id, "b");
});

test("세금에 도전했는데 공작이 진짜 있으면 도전자가 카드를 잃고 세금은 성공", () => {
  const s = setup({ a: ["duke", "assassin"], b: ["captain", "contessa"] });
  handle(s, "a", { type: "action", action: "tax" });
  assert.equal(s.phase, "reaction");
  handle(s, "b", { type: "challenge" });
  // b는 카드 2장이라 뭘 잃을지 골라야 함
  assert.equal(s.phase, "lose_influence");
  handle(s, "b", { type: "lose", cardIndex: 0 });
  assert.equal(P(s, "b").cards[0].revealed, true);
  assert.equal(P(s, "a").coins, 5);
  // a의 공작은 덱에 섞여 들어가고 새 카드를 받았어야 함 (여전히 2장 생존)
  assert.equal(P(s, "a").cards.filter((c) => !c.revealed).length, 2);
  assert.equal(s.players[s.turn].id, "b");
});

test("세금에 도전했는데 공작이 없으면 행동자가 카드를 잃고 세금 실패", () => {
  const s = setup({ a: ["captain", "assassin"], b: ["captain", "contessa"] });
  handle(s, "a", { type: "action", action: "tax" });
  handle(s, "b", { type: "challenge" });
  assert.equal(s.phase, "lose_influence");
  handle(s, "a", { type: "lose", cardIndex: 1 });
  assert.equal(P(s, "a").coins, 2);
  assert.equal(s.players[s.turn].id, "b");
});

test("해외 원조는 도전 불가, 공작으로 막기 가능, 막기에 도전 성공 시 원조 성공", () => {
  const s = setup({ a: ["captain", "assassin"], b: ["captain", "contessa"] });
  handle(s, "a", { type: "action", action: "foreign_aid" });
  assert.throws(() => handle(s, "b", { type: "challenge" }), /도전할 수 없습니다/);
  handle(s, "b", { type: "block", character: "duke" }); // 공작 없는데 블러핑
  assert.equal(s.phase, "block_reaction");
  handle(s, "a", { type: "challenge" });
  handle(s, "b", { type: "lose", cardIndex: 0 });
  assert.equal(P(s, "a").coins, 4); // 원조 성공
});

test("암살: 동전 3개 지불, 귀부인으로 막으면 동전은 돌려받지 못함", () => {
  const s = setup({ a: ["assassin", "duke"], b: ["contessa", "captain"] });
  P(s, "a").coins = 3;
  handle(s, "a", { type: "action", action: "assassinate", targetId: "b" });
  assert.equal(P(s, "a").coins, 0);
  handle(s, "b", { type: "block", character: "contessa" });
  handle(s, "a", { type: "pass" });
  assert.equal(P(s, "b").cards.every((c) => !c.revealed), true);
  assert.equal(s.players[s.turn].id, "b");
});

test("암살 도전 실패 후 대상은 여전히 귀부인으로 막을 수 있다", () => {
  const s = setup({ a: ["assassin", "duke"], b: ["contessa", "captain"], c: ["duke", "duke"] });
  P(s, "a").coins = 3;
  handle(s, "a", { type: "action", action: "assassinate", targetId: "b" });
  handle(s, "c", { type: "challenge" }); // a는 진짜 암살자
  handle(s, "c", { type: "lose", cardIndex: 0 });
  assert.equal(s.phase, "reaction"); // 도전은 끝났고 b의 막기 기회
  const v = viewFor(s, "b");
  assert.equal(v.options.kind, "reaction");
  assert.equal(v.options.canChallenge, false);
  assert.deepEqual(v.options.blockWith, ["contessa"]);
  handle(s, "b", { type: "block", character: "contessa" });
  handle(s, "a", { type: "pass" });
  handle(s, "c", { type: "pass" });
  assert.equal(s.players[s.turn].id, "b");
});

test("쿠: 10개 이상이면 쿠 강제, 막기 불가, 대상이 카드를 잃는다", () => {
  const s = setup({ a: ["duke", "duke"], b: ["captain", "contessa"] });
  P(s, "a").coins = 10;
  assert.throws(() => handle(s, "a", { type: "action", action: "income" }), /반드시 쿠/);
  handle(s, "a", { type: "action", action: "coup", targetId: "b" });
  assert.equal(P(s, "a").coins, 3);
  assert.equal(s.phase, "lose_influence");
  handle(s, "b", { type: "lose", cardIndex: 1 });
  assert.equal(P(s, "b").cards[1].revealed, true);
});

test("갈취: 모두 패스하면 동전 2개 이동, 상대가 1개뿐이면 1개만", () => {
  const s = setup({ a: ["captain", "duke"], b: ["duke", "contessa"], c: ["duke", "duke"] });
  P(s, "b").coins = 1;
  handle(s, "a", { type: "action", action: "steal", targetId: "b" });
  handle(s, "b", { type: "pass" });
  handle(s, "c", { type: "pass" });
  assert.equal(P(s, "a").coins, 3);
  assert.equal(P(s, "b").coins, 0);
});

test("교환: 2장을 뽑아 보고 원래 장수만큼 고른다", () => {
  const s = setup({ a: ["ambassador", "duke"], b: ["duke", "contessa"] });
  s.deck = ["captain", "assassin", "contessa"];
  handle(s, "a", { type: "action", action: "exchange" });
  handle(s, "b", { type: "pass" });
  assert.equal(s.phase, "exchange");
  const v = viewFor(s, "a");
  assert.deepEqual(v.exchangeDrawn, ["contessa", "assassin"]); // deck.pop() 순서
  assert.equal(viewFor(s, "b").exchangeDrawn, null);
  // pool = [ambassador, duke, contessa, assassin] → 2,3 선택
  handle(s, "a", { type: "exchange", keep: [2, 3] });
  assert.deepEqual(P(s, "a").cards.map((c) => c.character), ["contessa", "assassin"]);
  assert.equal(s.deck.length, 3);
});

test("마지막 카드를 잃으면 탈락, 한 명 남으면 게임 종료", () => {
  const s = setup({ a: ["duke", "duke"], b: ["captain", "contessa"] });
  P(s, "b").cards[0].revealed = true; // b는 1장만 남음
  P(s, "a").coins = 7;
  handle(s, "a", { type: "action", action: "coup", targetId: "b" });
  // b는 1장뿐이라 자동으로 잃음
  assert.equal(s.phase, "game_over");
  assert.equal(s.winnerId, "a");
});

test("뷰: 남의 뒷면 카드는 숨겨지고 내 카드와 공개된 카드만 보인다", () => {
  const s = setup({ a: ["duke", "assassin"], b: ["captain", "contessa"] });
  P(s, "b").cards[1].revealed = true;
  const v = viewFor(s, "a");
  const a = v.players.find((p) => p.id === "a");
  const b = v.players.find((p) => p.id === "b");
  assert.deepEqual(a.cards.map((c) => c.character), ["duke", "assassin"]);
  assert.deepEqual(b.cards.map((c) => c.character), [null, "contessa"]);
  assert.equal(v.options.kind, "action");
  assert.equal(viewFor(s, "b").options, null);
});

test("차례가 아닌 사람은 행동 불가, 탈락자는 턴을 건너뛴다", () => {
  const s = setup({ a: ["duke", "duke"], b: ["captain", "contessa"], c: ["duke", "duke"] });
  assert.throws(() => handle(s, "b", { type: "action", action: "income" }), /차례가 아닙니다/);
  P(s, "b").cards.forEach((c) => (c.revealed = true));
  handle(s, "a", { type: "action", action: "income" });
  assert.equal(s.players[s.turn].id, "c");
});
