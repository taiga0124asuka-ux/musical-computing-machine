const COLS = 10, ROWS = 20, BS = 30;
const ctx = document.getElementById('game-board').getContext('2d');
const hCtx = document.getElementById('hold-canvas').getContext('2d');
const nCtxs = Array.from({length:5}, (_, i) => document.getElementById(`next-canvas-${i+1}`).getContext('2d'));
const timeDisp = document.getElementById('time'), lineDisp = document.getElementById('remaining');

const COLORS = ['#000', '#0FF', '#00F', '#F80', '#FF0', '#0F0', '#808', '#F00', '#888'];
const SHAPES = [[], [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], [[2,0,0],[2,2,2],[0,0,0]], [[0,0,3],[3,3,3],[0,0,0]], [[4,4],[4,4]], [[0,5,5],[5,5,0],[0,0,0]], [[0,6,0],[6,6,6],[0,0,0]], [[7,7,0],[0,7,7],[0,0,0]]];

const WK = {"0-1":[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]], "1-0":[[0,0],[1,0],[1,-1],[0,2],[1,2]], "1-2":[[0,0],[1,0],[1,-1],[0,2],[1,2]], "2-1":[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]], "2-3":[[0,0],[1,0],[1,1],[0,-2],[1,-2]], "3-2":[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]], "3-0":[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]], "0-3":[[0,0],[1,0],[1,1],[0,-2],[1,-2]]};
const WKI = {"0-1":[[0,0],[-2,0],[1,0],[-2,-1],[1,2]], "1-0":[[0,0],[2,0],[-1,0],[2,1],[-1,-2]], "1-2":[[0,0],[-1,0],[2,0],[-1,2],[2,-1]], "2-1":[[0,0],[1,0],[-2,0],[1,-2],[-2,1]], "2-3":[[0,0],[2,0],[-1,0],[2,1],[-1,-2]], "3-2":[[0,0],[-2,0],[1,0],[-2,-1],[1,2]], "3-0":[[0,0],[1,0],[-2,0],[1,-2],[-2,1]], "0-3":[[0,0],[-1,0],[2,0],[-1,2],[2,-1]]};

let board, cp, next = [], holdP, canH, lines, startTime, lastDrop, over, gamepadIdx = null, lastGP = 0;

const isValid = (x, y, s = cp.shape) => s.every((r, i) => r.every((v, j) => {
    if (!v) return true;
    let nx = x + j, ny = y + i;
    return nx >= 0 && nx < COLS && ny < ROWS && (ny < 0 || board[ny][nx] === 0);
}));

const dR = (c, x, y, s, x0=0, y0=0, sz=25) => {
    c.fillStyle = COLORS[s]; c.fillRect(x0+x*sz, y0+y*sz, sz-1, sz-1);
    c.strokeStyle = 'rgba(255,255,255,0.2)'; c.strokeRect(x0+x*sz, y0+y*sz, sz-1, sz-1);
};

function draw() {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, COLS*BS, ROWS*BS);
    board.forEach((r, y) => r.forEach((v, x) => v && dR(ctx, x, y, v, 0, 0, BS)));
    if (cp) {
        let gy = cp.y; while (isValid(cp.x, gy+1)) gy++;
        cp.shape.forEach((r, i) => r.forEach((v, j) => v && (dR(ctx, cp.x+j, gy+i, 8, 0, 0, BS), dR(ctx, cp.x+j, cp.y+i, cp.color, 0, 0, BS))));
    }
    drawPrv(holdP, hCtx); 
    next.slice(0, 5).forEach((p, i) => drawPrv(p, nCtxs[i]));
}

function drawPrv(id, c) {
    if (!c) return;
    c.setTransform(1,0,0,1,0,0); c.fillStyle = '#000'; c.fillRect(0, 0, c.canvas.width, c.canvas.height);
    if (!id) return;
    const s = SHAPES[id], maxD = Math.max(s.length, s[0].length), sz = (c.canvas.width*0.75)/maxD;
    const x0 = (c.canvas.width - s[0].length*sz)/2, y0 = (c.canvas.height - s.length*sz)/2;
    s.forEach((r, i) => r.forEach((v, j) => v && dR(c, j, i, id, x0, y0, sz)));
}

function gen() {
    if (next.length < 10) {
        let b=[1,2,3,4,5,6,7]; for(let i=6;i>0;i--){const j=~~(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]} 
        next.push(...b); 
    }
    const id = next.shift(); 
    cp = { x:~~((COLS-SHAPES[id][0].length)/2), y:0, shape:SHAPES[id], color:id, rot:0 };
    if (!isValid(cp.x, cp.y)) { cp.y = -1; if (!isValid(cp.x, cp.y)) stopGame("GAME OVER"); }
}

function lock() {
    cp.shape.forEach((r, i) => r.forEach((v, j) => { if(v && cp.y+i >= 0) board[cp.y+i][cp.x+j] = cp.color; }));
    let cl = 0;
    for (let y = ROWS-1; y >= 0; y--) {
        if (board[y].every(v => v !== 0)) { board.splice(y, 1); board.unshift(Array(COLS).fill(0)); cl++; y++; }
    }
    if (cl > 0) {
        lines -= cl; if (lines <= 0) { lines = 0; stopGame("CLEAR!"); }
        if (lineDisp) lineDisp.innerText = lines;
    }
    canH = true; gen(); draw();
}

function stopGame(msg) { 
    over = true; 
    const os = document.getElementById('game-over-screen');
    if(os) { os.querySelector('h1').innerText = msg; document.getElementById('final-score').innerText = timeDisp.innerText; os.classList.remove('hidden'); os.style.display = 'flex'; }
}

const move = (dx, dy) => {
    if (isValid(cp.x+dx, cp.y+dy)) { cp.x += dx; cp.y += dy; return true; }
    return false;
};

function rotate(cw) {
    if (cp.color == 4) return;
    const old = cp.rot, nR = (old + (cw?1:3)) % 4, nS = cw ? cp.shape[0].map((_, i) => cp.shape.map(r => r[i]).reverse()) : cp.shape[0].map((_, i) => cp.shape.map(r => r[r.length-1-i]));
    const ks = (cp.color==1?WKI:WK)[`${old}-${nR}`];
    for (const [dx, dy] of ks) if (isValid(cp.x+dx, cp.y-dy, nS)) { cp.x += dx; cp.y -= dy; cp.shape = nS; cp.rot = nR; return true; }
}

const acts = { 
    moveLeft:()=>move(-1,0), moveRight:()=>move(1,0), softDrop:()=>move(0,1), 
    hardDrop:()=>{while(move(0,1));lock()}, rotateLeft:()=>rotate(0), rotateRight:()=>rotate(1), 
    hold:()=>{if(!canH)return; if(holdP){[holdP,cp.color]=[cp.color,holdP]; cp.shape=SHAPES[cp.color]; cp.y=0; cp.x=~~((COLS-cp.shape[0].length)/2)}else{holdP=cp.color;gen()} canH=false} 
};

const handleInput = (a) => { if(!over && acts[a]) { acts[a](); draw(); } };

document.addEventListener('keydown', e => {
    const k = {'a':'moveLeft','d':'moveRight','s':'softDrop','arrowleft':'moveLeft','arrowright':'moveRight','arrowdown':'softDrop','arrowup':'rotateRight',' ':'hardDrop','q':'rotateLeft','w':'rotateRight','x':'hold'}[e.key.toLowerCase()];
    if(k) { e.preventDefault(); handleInput(k); }
});

const setupControls = () => {
    const btnIds = { 'btn-left':'moveLeft', 'btn-right':'moveRight', 'btn-hold':'hold', 'btn-rotate-left':'rotateLeft', 'btn-rotate-right':'rotateRight', 'btn-hard-drop':'hardDrop' };
    Object.keys(btnIds).forEach(id => {
        const el = document.getElementById(id); if(!el) return;
        const trigger = (e) => { e.preventDefault(); handleInput(btnIds[id]); };
        el.addEventListener('touchstart', trigger, {passive: false});
        el.addEventListener('mousedown', (e) => { if(!('ontouchstart' in window)) trigger(e); });
    });
};

function loop(t) {
    if (over) return;
    const now = performance.now();
    const elapsed = now - startTime;
    const m = Math.floor(elapsed / 60000), s = Math.floor((elapsed % 60000) / 1000), ms = Math.floor((elapsed % 1000) / 10);
    if (timeDisp) timeDisp.innerText = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(ms).padStart(2,'0')}`;
    if (now - lastDrop > 1000) { if (!move(0, 1)) lock(); lastDrop = now; }
    draw();
    requestAnimationFrame(loop);
}

window.onload = () => {
    board = Array.from({length:ROWS},()=>Array(COLS).fill(0));
    lines = 40; over = false; holdP = null; next = [];
    setupControls(); gen();
    startTime = performance.now(); lastDrop = startTime;
    requestAnimationFrame(loop);
};