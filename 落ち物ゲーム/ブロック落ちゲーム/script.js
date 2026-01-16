/**
 * Tetris Normal Mode - Mobile & Controller Optimized Final Script
 */
const COLS = 10, ROWS = 20, BS = 30;
const ctx = document.getElementById('game-board').getContext('2d');
const hCtx = document.getElementById('hold-canvas').getContext('2d');
const nCtxs = Array.from({length:5}, (_, i) => document.getElementById(`next-canvas-${i+1}`).getContext('2d'));

const COLORS = ['#000', '#0FF', '#00F', '#F80', '#FF0', '#0F0', '#808', '#F00', '#888'];
const SHAPES = [[], [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], [[2,0,0],[2,2,2],[0,0,0]], [[0,0,3],[3,3,3],[0,0,0]], [[4,4],[4,4]], [[0,5,5],[5,5,0],[0,0,0]], [[0,6,0],[6,6,6],[0,0,0]], [[7,7,0],[0,7,7],[0,0,0]]];

const WK = {"0-1":[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]], "1-0":[[0,0],[1,0],[1,-1],[0,2],[1,2]], "1-2":[[0,0],[1,0],[1,-1],[0,2],[1,2]], "2-1":[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]], "2-3":[[0,0],[1,0],[1,1],[0,-2],[1,-2]], "3-2":[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]], "3-0":[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]], "0-3":[[0,0],[1,0],[1,1],[0,-2],[1,-2]]};
const WKI = {"0-1":[[0,0],[-2,0],[1,0],[-2,-1],[1,2]], "1-0":[[0,0],[2,0],[-1,0],[2,1],[-1,-2]], "1-2":[[0,0],[-1,0],[2,0],[-1,2],[2,-1]], "2-1":[[0,0],[1,0],[-2,0],[1,-2],[-2,1]], "2-3":[[0,0],[2,0],[-1,0],[2,1],[-1,-2]], "3-2":[[0,0],[-2,0],[1,0],[-2,-1],[1,2]], "3-0":[[0,0],[1,0],[-2,0],[1,-2],[-2,1]], "0-3":[[0,0],[-1,0],[2,0],[-1,2],[2,-1]]};

let board, cp, next = [], holdP, canH, lines, score, level, lastDrop, over, isRot, gamepadIdx = null, lastGP = 0;
const lineDisp = document.getElementById('lines'), scoreDisp = document.getElementById('score'), lvlDisp = document.getElementById('level');

// --- 判定と描画 ---
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
    if (!cp) return;
    let gy = cp.y; while (isValid(cp.x, gy+1)) gy++;
    cp.shape.forEach((r, i) => r.forEach((v, j) => v && (dR(ctx, cp.x+j, gy+i, 8, 0, 0, BS), dR(ctx, cp.x+j, cp.y+i, cp.color, 0, 0, BS))));
    drawPrv(holdP, hCtx); 
    next.slice(0, 5).forEach((p, i) => drawPrv(p, nCtxs[i]));
}

function drawPrv(id, c) {
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
    if(cl > 0) {
        lines += cl; score += [0, 100, 300, 500, 800][cl] * level;
        level = Math.floor(lines / 10) + 1;
        if(lineDisp) lineDisp.innerText = lines; 
        if(scoreDisp) scoreDisp.innerText = score; 
        if(lvlDisp) lvlDisp.innerText = level;
    }
    canH = true; isRot = false; gen(); draw();
}

function stopGame(t) { 
    over = true; 
    const os = document.getElementById('game-over-screen');
    if(os) { os.querySelector('h1').innerText = t; document.getElementById('final-score').innerText = score; os.classList.remove('hidden'); os.style.display = 'flex'; }
}

const move = (dx, dy) => {
    if (isValid(cp.x+dx, cp.y+dy)) { cp.x += dx; cp.y += dy; isRot = false; return true; }
    return false;
};

function rotate(cw) {
    if (cp.color == 4) return;
    const old = cp.rot, nR = (old + (cw?1:3)) % 4, nS = cw ? cp.shape[0].map((_, i) => cp.shape.map(r => r[i]).reverse()) : cp.shape[0].map((_, i) => cp.shape.map(r => r[r.length-1-i]));
    const ks = (cp.color==1?WKI:WK)[`${old}-${nR}`];
    for (const [dx, dy] of ks) if (isValid(cp.x+dx, cp.y-dy, nS)) { cp.x += dx; cp.y -= dy; cp.shape = nS; cp.rot = nR; isRot = true; return true; }
}

const acts = { 
    moveLeft:()=>move(-1,0), moveRight:()=>move(1,0), softDrop:()=>move(0,1), 
    hardDrop:()=>{while(move(0,1));lock()}, rotateLeft:()=>rotate(0), rotateRight:()=>rotate(1), 
    hold:()=>{if(!canH)return; if(holdP){[holdP,cp.color]=[cp.color,holdP]; cp.shape=SHAPES[cp.color]; cp.y=0; cp.x=~~((COLS-cp.shape[0].length)/2)}else{holdP=cp.color;gen()} canH=false} 
};

// --- 入力制御 (Mobile & PC & Gamepad) ---

const handleInput = (action) => { if(!over && acts[action]) { acts[action](); draw(); } };

// 1. キーボード
document.addEventListener('keydown', e => {
    const k = {'a':'moveLeft','d':'moveRight','s':'softDrop','arrowleft':'moveLeft','arrowright':'moveRight','arrowdown':'softDrop','arrowup':'rotateRight',' ':'hardDrop','q':'rotateLeft','w':'rotateRight','x':'hold'}[e.key.toLowerCase()];
    if(k) { e.preventDefault(); handleInput(k); }
});

// 2. モバイル/タブレット (タッチイベント)
const setupTouchButtons = () => {
    const btnIds = { 'btn-hold':'hold', 'btn-rotate-left':'rotateLeft', 'btn-rotate-right':'rotateRight', 'btn-hard-drop':'hardDrop' };
    Object.keys(btnIds).forEach(id => {
        const el = document.getElementById(id);
        if(!el) return;
        const trigger = (e) => { e.preventDefault(); handleInput(btnIds[id]); };
        el.addEventListener('touchstart', trigger, {passive: false});
        el.addEventListener('mousedown', (e) => { if(!('ontouchstart' in window)) trigger(e); });
    });
};

// 3. ゲームパッド
window.addEventListener("gamepadconnected", (e) => gamepadIdx = e.gamepad.index);
function updateGamepad() {
    if (gamepadIdx === null || over) return;
    const gp = navigator.getGamepads()[gamepadIdx]; if (!gp) return;
    const now = performance.now(); if (now - lastGP < 110) return;
    if (gp.axes[0] < -0.5 || gp.buttons[14].pressed) { handleInput('moveLeft'); lastGP = now; }
    else if (gp.axes[0] > 0.5 || gp.buttons[15].pressed) { handleInput('moveRight'); lastGP = now; }
    if (gp.axes[1] > 0.5 || gp.buttons[13].pressed) { handleInput('softDrop'); lastGP = now; }
    if (gp.buttons[0].pressed) { handleInput('rotateRight'); lastGP = now; }
    if (gp.buttons[1].pressed) { handleInput('rotateLeft'); lastGP = now; }
    if (gp.buttons[2].pressed) { handleInput('hardDrop'); lastGP = now; }
    if (gp.buttons[3].pressed) { handleInput('hold'); lastGP = now; }
}

// --- メインループ ---
function loop(t) {
    if(over) return;
    updateGamepad();
    let speed = Math.max(100, 1000 - (level - 1) * 100);
    if(t - lastDrop > speed) { if(!move(0,1)) lock(); lastDrop = t; }
    draw();
    requestAnimationFrame(loop);
}

window.startGame = () => {
    board = Array.from({length:ROWS},()=>Array(COLS).fill(0));
    lines=0; score=0; level=1; holdP=null; next=[]; canH=true; over=false;
    const os = document.getElementById('game-over-screen');
    if(os) { os.classList.add('hidden'); os.style.display = 'none'; }
    if(lineDisp) lineDisp.innerText = "0"; if(scoreDisp) scoreDisp.innerText = "0"; if(lvlDisp) lvlDisp.innerText = "1";
    gen(); lastDrop = performance.now(); requestAnimationFrame(loop);
};

setupTouchButtons();
startGame();
// --- これを script.js の一番最後に貼り付けてください ---

const setupSwipeControls = () => {
    let touchStartX = 0;
    let touchStartY = 0;
    const canvas = document.getElementById('game-board');

    if (!canvas) return; // キャンバスがない場合は何もしない

    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (typeof over !== 'undefined' && over) return;

        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;
        const diffX = touchX - touchStartX;
        const diffY = touchY - touchStartY;

        // 横移動：30px（ブロック1個分）動いたら移動
        if (Math.abs(diffX) > 30) {
            if (diffX > 0) handleInput('moveRight');
            else handleInput('moveLeft');
            touchStartX = touchX; 
        }

        // 下移動：ソフトドロップ
        if (diffY > 30) {
            handleInput('softDrop');
            touchStartY = touchY;
        }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const dist = Math.sqrt(Math.pow(touchEndX - touchStartX, 2) + Math.pow(touchEndY - touchStartY, 2));
        
        // ほとんど動かさずタップしただけなら回転
        if (dist < 10) {
            handleInput('rotateRight');
        }
    }, { passive: false });
};

// 実行命令
setupSwipeControls();