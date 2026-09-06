import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(x => x[1]);
const context = vm.createContext({}); vm.runInContext(scripts[0], context);
const g = context.Othello;
test('opening moves and immutable legal/illegal placement', () => {
  const b = g.initialBoard();
  assert.deepEqual(Array.from(g.legalMoves(b, 1)), [19,26,37,44]);
  const next = g.play(b, 19, 1);
  assert.equal(next[27], 1); assert.equal(g.counts(next).black, 4); assert.equal(g.counts(next).white, 1);
  assert.equal(b[27], -1); assert.equal(g.play(b, 0, 1), null); assert.equal(g.play(b, 27, 1), null);
});
test('captures all eight directions, never wraps around an edge', () => {
  const b = Array(64).fill(0);
  for (const dr of [-1,0,1]) for (const dc of [-1,0,1]) if (dr || dc) {
    b[(3+dr)*8+3+dc] = -1; b[(3+2*dr)*8+3+2*dc] = 1;
  }
  assert.equal(g.flips(b, 27, 1).length, 8);
  const edge = Array(64).fill(0); edge[7] = -1; edge[8] = 1;
  assert.equal(g.flips(edge, 6, 1).length, 0);
});
test('single pass and game ending before the board is full', () => {
  const b = Array(64).fill(1); b[0] = 0; b[1] = -1;
  assert.equal(g.turnState(b, -1).passed, true); assert.equal(g.turnState(b, -1).player, 1);
  assert.equal(g.turnState(g.play(b, 0, 1), -1).over, true);
  b[1] = 1; assert.equal(g.turnState(b, 1).over, true);
  const tie = Array.from({length:64}, (_,i) => i%2 ? 1 : -1);
  assert.equal(g.turnState(tie, 1).over, true); assert.equal(g.counts(tie).black, g.counts(tie).white);
});
// Independent two-dimensional ray walker checks complete games against the engine.
function referenceFlips(board, index, player) {
  if (board[index]) return [];
  const found = [];
  for (let dr=-1; dr<=1; dr++) for (let dc=-1; dc<=1; dc++) {
    if (!dr && !dc) continue;
    const line=[];
    for (let step=1; step<8; step++) {
      const r=Math.floor(index/8)+dr*step, c=index%8+dc*step;
      if (r<0 || r>7 || c<0 || c>7) break;
      const i=r*8+c;
      if (board[i]===-player) { line.push(i); continue; }
      if (board[i]===player) found.push(...line);
      break;
    }
  }
  return found.sort((a,b)=>a-b);
}
test('30 complete matches agree with an independent rules implementation; CPU always moves legally', () => {
  let seed=12345;
  const random = () => { seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; };
  for (let match=0; match<30; match++) {
    let board=g.initialBoard(), player=1, movesMade=0;
    while (true) {
      for (let i=0; i<64; i++) assert.deepEqual(Array.from(g.flips(board,i,player)).sort((a,b)=>a-b),referenceFlips(board,i,player));
      const state=g.turnState(board,player); if (state.over) break; player=state.player;
      const legal=g.legalMoves(board,player);
      const move=match<4 && player===-1 ? g.chooseMove(board,player) : legal[Math.floor(random()*legal.length)];
      assert.ok(legal.includes(move));
      board=g.play(board,move,player); player=-player; movesMade++;
      assert.ok(movesMade<=60); assert.equal(board.filter(Boolean).length,4+movesMade);
    }
    assert.equal(g.legalMoves(board,1).length,0); assert.equal(g.legalMoves(board,-1).length,0);
  }
});
function uiHarness() {
  class Element {
    constructor() { this.children=[]; this.events={}; this.attributes={}; this.textContent=''; this.classList={toggle(){}}; }
    append(child) { this.children.push(child); }
    addEventListener(name,cb) { this.events[name]=cb; }
    setAttribute(key,value) { this.attributes[key]=value; }
  }
  const elements = Object.fromEntries(['board','status','hint','black-count','white-count','human-score','cpu-score','restart'].map(id=>[id,new Element()]));
  const timers=new Map(); let id=0;
  const ctx=vm.createContext({document:{getElementById:key=>elements[key],createElement:()=>new Element()},setTimeout:cb=>{timers.set(++id,cb);return id;},clearTimeout:id=>timers.delete(id)});
  scripts.forEach(script=>vm.runInContext(script,ctx));
  return {elements,timers,flush(){const [key,cb]=timers.entries().next().value;timers.delete(key);cb();}};
}
test('UI accepts a human move, rejects extra input, runs CPU and safely resets pending CPU work', () => {
  const h=uiHarness(), e=h.elements, cells=e.board.children;
  assert.equal(cells.length,64); assert.equal(e['black-count'].textContent,2);
  cells[0].events.click(); assert.equal(h.timers.size,0);
  cells[19].events.click(); assert.equal(e['black-count'].textContent,4); assert.equal(h.timers.size,1);
  cells[26].events.click(); assert.equal(e['black-count'].textContent,4); assert.equal(h.timers.size,1);
  h.flush(); assert.equal(Number(e['black-count'].textContent)+Number(e['white-count'].textContent),6);
  assert.equal(e.status.textContent,'あなたの番です');
  e.restart.events.click(); cells[19].events.click(); const oldCallback=[...h.timers.values()][0];
  e.restart.events.click(); assert.equal(h.timers.size,0); oldCallback();
  assert.equal(e['black-count'].textContent,2); assert.equal(e['white-count'].textContent,2);
});
test('UI plays a full human/CPU game to the result without stalled turns', () => {
  const h=uiHarness(), e=h.elements;
  for (let step=0; step<120; step++) {
    if (h.timers.size) h.flush();
    else {
      const cell=e.board.children.find(c=>c.attributes['aria-disabled']==='false');
      if (!cell) break; cell.events.click();
    }
  }
  assert.match(e.status.textContent,/勝ち|引き分け/); assert.equal(h.timers.size,0);
  assert.ok(Number(e['black-count'].textContent)+Number(e['white-count'].textContent)<=64);
});
