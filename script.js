/* ══════════════════════════════
 LANDING & MUSIC
══════════════════════════════ */
let musicOn = false;
const bgMusic = document.getElementById('bg-music');
bgMusic.volume = 0.45;

function toggleMusic() {
    const btn = document.getElementById('music-btn');
    if (musicOn) {
        bgMusic.pause();
        musicOn = false;
        btn.classList.add('muted');
        btn.querySelector('i').className = 'fa-solid fa-volume-xmark';
    } else {
        bgMusic.play().catch(() => { });
        musicOn = true;
        btn.classList.remove('muted');
        btn.querySelector('i').className = 'fa-solid fa-music';
    }
}

function startGame() {
    document.getElementById('landing').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    // auto-play music on first interaction
    if (!musicOn) {
        bgMusic.play().then(() => { musicOn = true; document.getElementById('music-btn').querySelector('i').className = 'fa-solid fa-music'; }).catch(() => { });
    }
    startRound();
}

function goToMenu() {
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('score-overlay').classList.add('hide');
    document.getElementById('win-overlay').classList.add('hide');
    document.getElementById('landing').style.display = 'flex';
    scores = { p1: 0, p2: 0 }; turnN = 1; roundN = 1; isBonusRound = false;
}

function openTutorial() {
    document.getElementById('tutorial-overlay').classList.remove('hide');
}
function closeTutorial() {
    document.getElementById('tutorial-overlay').classList.add('hide');
}

/* Landing animated tiki preview */
(function buildPreview() {
    const colors = ['#c0392b', '#27ae60', '#d4ac0d', '#8e44ad', '#e67e22', '#1abc9c', '#2980b9'];
    const faces = ['😤', '😊', '😁', '🤔', '😮', '😎', '😴'];
    const heights = [56, 68, 80, 96, 80, 68, 56];
    const preview = document.getElementById('land-preview');
    colors.forEach((c, i) => {
        const b = document.createElement('div');
        b.className = 'preview-block';
        b.style.cssText = `background:${c};width:${heights[i] * 0.75}px;height:${heights[i]}px;animation-duration:${1.6 + i * 0.18}s;animation-delay:${i * 0.1}s`;
        b.textContent = faces[i];
        preview.appendChild(b);
    });
})();

/* Floating particles on landing */
(function spawnParticles() {
    const cont = document.getElementById('particles');
    const tikiFaces = ['😤', '😊', '😁', '🤔', '😮', '😎', '😴'];
    setInterval(() => {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.cssText = `
      left:${Math.random() * 100}vw;
      bottom:0;
      font-size:${14 + Math.random() * 18}px;
      animation-duration:${6 + Math.random() * 8}s;
      animation-delay:0s;
    `;
        p.textContent = tikiFaces[Math.floor(Math.random() * tikiFaces.length)];
        cont.appendChild(p);
        setTimeout(() => p.remove(), 14000);
    }, 800);
})();

/* Mouse glow */
document.addEventListener('mousemove', e => {
    document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
    document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
});

/* ══════════════════════════════
   GAME LOGIC
══════════════════════════════ */
const TIKIS = [
    { id: 'red', lbl: 'Red', face: '😤', cls: 't-red' },
    { id: 'green', lbl: 'Green', face: '😊', cls: 't-green' },
    { id: 'yellow', lbl: 'Yellow', face: '😁', cls: 't-yellow' },
    { id: 'purple', lbl: 'Purple', face: '🤔', cls: 't-purple' },
    { id: 'orange', lbl: 'Orange', face: '😮', cls: 't-orange' },
    { id: 'cyan', lbl: 'Cyan', face: '😎', cls: 't-cyan' },
    { id: 'blue', lbl: 'Blue', face: '😴', cls: 't-blue' }
];
const CARD_DEFS = [
    { id: 'up3', ico: '⬆️', nm: 'Up 3', desc: 'Move tiki up 3', needsTiki: true },
    { id: 'up2', ico: '⬆️', nm: 'Up 2', desc: 'Move tiki up 2', needsTiki: true },
    { id: 'up1a', ico: '⬆️', nm: 'Up 1', desc: 'Move tiki up 1', needsTiki: true },
    { id: 'down1', ico: '⬇️', nm: 'Down 1', desc: 'Move tiki down 1', needsTiki: true },
    { id: 'topple', ico: '💥', nm: 'Topple', desc: 'Send tiki to bottom', needsTiki: true },
    { id: 'toast', ico: '🔥', nm: 'Toast', desc: 'Eliminate bottom tiki', needsTiki: false }
];
const WIN_SCORE = 21, TRACK_MAX = 21;
let pole = [], graveyard = [], selCard = null, selTiki = null;
let scores = { p1: 0, p2: 0 }, turnN = 1, roundN = 1, activePl = 'p1';
let objectives = { p1: [], p2: [] };
let usedCards = { p1: new Set(), p2: new Set() };
let isBonusRound = false, latestEarned = { p1: 0, p2: 0 }, pendingAction = null;

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]] } return a }

function startRound() {
    pole = TIKIS.map(t => t.id); shuffle(pole);
    graveyard = []; selCard = null; selTiki = null;
    usedCards = { p1: new Set(), p2: new Set() };
    activePl = 'p1';
    objectives.p1 = buildObjective();
    objectives.p2 = buildObjective();
    while (objectives.p1.map(o => o.id).sort().join() === objectives.p2.map(o => o.id).sort().join()) objectives.p2 = buildObjective();
    renderAll();
}

function buildObjective() {
    const pool = shuffle([...TIKIS]);
    return pool.slice(0, 3).map((t, i) => ({ id: t.id, pts: [3, 2, 1][i] }));
}

function renderAll() {
    renderTotem(); renderHand('p1'); renderHand('p2');
    renderObjective('p1'); renderObjective('p2');
    renderGraveyard(); renderScoreTrack();
    updatePanelHighlight(); updateHint();
    document.getElementById('turn-disp').textContent = turnN;
    const rd = document.getElementById('round-disp');
    if (isBonusRound) { rd.innerHTML = 'BONUS<br>ROUND'; rd.style.fontSize = '9px'; }
    else { rd.innerHTML = roundN; rd.style.fontSize = '17px'; }
    document.getElementById('p1-score-disp').textContent = 'Total Points: ' + scores.p1;
    document.getElementById('p2-score-disp').textContent = 'Total Points: ' + scores.p2;
}

function renderScoreTrack() {
    const cont = document.getElementById('sct-shared');
    let html = '';
    for (let i = 0; i <= TRACK_MAX; i++) html += `<div class="sc-cell${i === TRACK_MAX ? ' win-mark' : ''}" id="sc-${i}">${i}</div>`;
    cont.innerHTML = html;
    const cap1 = Math.min(scores.p1, TRACK_MAX), cap2 = Math.min(scores.p2, TRACK_MAX);
    const overlap = cap1 === cap2;
    const c1 = document.getElementById('sc-' + cap1); if (c1) { const p = document.createElement('div'); p.className = 'pawn pawn1'; c1.appendChild(p); }
    const c2 = document.getElementById('sc-' + cap2); if (c2) { const p = document.createElement('div'); p.className = 'pawn pawn2'; c2.appendChild(p); }
}

function renderTotem() {
    const tp = document.getElementById('totem-pole'); tp.innerHTML = '';
    const labels = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th'];
    for (let s = 0; s < pole.length; s++) {
        const id = pole[s]; const td = TIKIS.find(t => t.id === id);
        const row = document.createElement('div'); row.className = 'slot-row';
        row.innerHTML = `<div class="rnk-l">${labels[s]}</div><div class="t-slot" id="slot-${s}"><div class="tiki ${td.cls}" id="tiki-${id}" onclick="pickTiki('${id}')"><div class="t-face">${td.face}</div><div class="t-nm">${td.lbl}</div></div></div>`;
        tp.appendChild(row);
    }
    if (selTiki) { const el = document.getElementById('tiki-' + selTiki); if (el) el.classList.add('sel-t'); }
}

function renderHand(pl) {
    const cont = document.getElementById(pl + 'hand'); cont.innerHTML = '';
    CARD_DEFS.forEach(c => {
        const used = usedCards[pl].has(c.id);
        const isSel = selCard && selCard.pl === pl && selCard.id === c.id;
        const div = document.createElement('div');
        div.className = 'acard' + (used ? ' used' : '') + (isSel ? ' sel' : '');
        div.innerHTML = `<div class="card-ico">${c.ico}</div><div class="card-nm">${c.nm}</div><div class="card-desc">${c.desc}</div>`;
        if (!used && activePl === pl) div.onclick = () => clickCard(pl, c.id, c.needsTiki);
        cont.appendChild(div);
    });
}

function renderObjective(pl) {
    const cont = document.getElementById(pl + '-goal-card');
    const ranks = ['①', '②', '③'];
    cont.innerHTML = objectives[pl].map((o, i) => {
        const td = TIKIS.find(t => t.id === o.id);
        return `<div class="obj-row"><div class="obj-rank">${ranks[i]}</div><div class="obj-dot ${td.cls}"></div><span class="obj-lbl">${td.lbl}</span><span class="obj-pts">${o.pts}pt</span></div>`;
    }).join('');
}

function renderGraveyard() {
    document.getElementById('graveyard').innerHTML = graveyard.map(id => {
        const td = TIKIS.find(t => t.id === id);
        return `<div class="grave-tiki ${td.cls}" title="${td.lbl}">${td.face}</div>`;
    }).join('');
}

function updatePanelHighlight() {
    document.getElementById('p1').style.opacity = activePl === 'p1' ? '1' : '0.55';
    document.getElementById('p2').style.opacity = activePl === 'p2' ? '1' : '0.55';
    document.getElementById('active-badge').textContent = activePl === 'p1' ? "ARKON'S TURN" : "ZEPHYRA'S TURN";
}

function clickCard(pl, cardId, needsTiki) {
    if (activePl !== pl) return;
    selCard = { pl, id: cardId }; selTiki = null;
    document.querySelectorAll('.tiki').forEach(t => t.classList.remove('sel-t'));
    renderHand(pl);
    if (!needsTiki) execToast();
    else { updateHint(); showToast((pl === 'p1' ? 'Arkon' : 'Zephyra') + ': pick a tiki on the pole'); }
}

function pickTiki(id) {
    if (!selCard) {
        showToast('Pick a card first!');
        return;
    }
    const cdef = CARD_DEFS.find(c => c.id === selCard.id);
    if (!cdef || !cdef.needsTiki) return;

    selTiki = id;
    // Visually select
    document.querySelectorAll('.tiki').forEach(t => t.classList.remove('sel-t'));
    const el = document.getElementById('tiki-' + id);
    if (el) el.classList.add('sel-t');

    // Execute the move immediately after picking
    execMove();
}

function execToast() {
    if (pole.length <= 3) { showToast('Cannot toast — only 3 tikis remain!'); clearSel(); return; }
    graveyard.push(pole.splice(pole.length - 1, 1)[0]);
    finishTurn('toast');
}

function execMove() {
    if (!selCard || !selTiki) return;

    const idx = pole.indexOf(selTiki);
    if (idx === -1) return;

    const cardId = selCard.id;

    if (cardId === 'topple') {
        // Remove from current spot and push to the very end (bottom)
        pole.splice(idx, 1);
        pole.push(selTiki);
    }
    else if (cardId === 'up3') {
        moveTiki(idx, 3);
    }
    else if (cardId === 'up2') {
        moveTiki(idx, 2);
    }
    else if (cardId === 'up1a') {
        moveTiki(idx, 1);
    }
    else if (cardId === 'down1') {
        moveTiki(idx, -1); // Negative moves it down the list
    }

    finishTurn(cardId);
}

function moveTiki(fromIndex, steps) {
    // In our array, index 0 is TOP. To move UP, we subtract from the index.
    let toIndex = fromIndex - steps;

    // Keep it within the bounds of the current pole
    if (toIndex < 0) toIndex = 0;
    if (toIndex >= pole.length) toIndex = pole.length - 1;

    const element = pole.splice(fromIndex, 1)[0];
    pole.splice(toIndex, 0, element);
}

function finishTurn(cardId) {
    usedCards[activePl].add(selCard.id);
    showToast((activePl === 'p1' ? 'Arkon' : 'Zephyra') + ' played ' + (CARD_DEFS.find(c => c.id === selCard.id)?.nm || cardId) + '!');
    turnN++; selCard = null; selTiki = null;
    if ((usedCards.p1.size >= 6 && usedCards.p2.size >= 6) || pole.length <= 3) setTimeout(() => endRound(), 600);
    else { activePl = activePl === 'p1' ? 'p2' : 'p1'; renderAll(); }
}

function clearSel() { selCard = null; selTiki = null; renderHand('p1'); renderHand('p2'); updateHint(); }

function handleNextAction() { if (pendingAction) pendingAction(); }

function endRound() {
    const top3 = pole.slice(0, 3);
    let earned = { p1: 0, p2: 0 };
    ['p1', 'p2'].forEach(pl => objectives[pl].forEach(obj => { if (top3.includes(obj.id)) earned[pl] += obj.pts; }));
    latestEarned.p1 = earned.p1; latestEarned.p2 = earned.p2;
    scores.p1 += earned.p1; scores.p2 += earned.p2;

    const labels = ['🥇 1st', '🥈 2nd', '🥉 3rd'];
    document.getElementById('ov-totem-list').innerHTML = top3.map((id, i) => {
        const td = TIKIS.find(t => t.id === id);
        return `<div class="ov-slot"><span style="color:var(--sc)">${labels[i]}</span><div class="ov-dot ${td.cls}"></div><span style="color:var(--ss);font-weight:bold">${td.lbl}</span></div>`;
    }).join('');

    document.getElementById('ov-cols').innerHTML = ['p1', 'p2'].map(pl => {
        const pname = pl === 'p1' ? 'Arkon the Bold' : 'Zephyra the Wise';
        const color = pl === 'p1' ? '#e74c3c' : '#3498db';
        const rows = objectives[pl].map(obj => {
            const td = TIKIS.find(t => t.id === obj.id);
            const pos = top3.indexOf(obj.id); const scored = pos !== -1;
            return `<div class="ov-row-clean"><div class="ov-item-info"><div class="ov-dot ${td.cls}"></div><span style="color:var(--ss)">${td.lbl}</span><span style="color:var(--sp);font-size:11px">(${scored ? ['1st', '2nd', '3rd'][pos] : 'Unplaced'})</span></div><span class="${scored ? 'ov-pt-earned' : 'ov-pt-missed'}">${scored ? '+' + obj.pts : '0 pt'}</span></div>`;
        }).join('');
        return `<div class="ov-card"><div class="ov-pname-clean" style="color:${color}">${pname}</div>${rows}<div class="ov-divider"></div><div class="ov-summary-row"><span>Points this round:</span><span class="ov-pt-earned">+${earned[pl]}</span></div><div class="ov-summary-total"><span>Total Score:</span><span>${scores[pl]}</span></div></div>`;
    }).join('');

    document.getElementById('ov-title').textContent = isBonusRound ? 'Bonus Round Complete!' : 'Round ' + roundN + ' Complete!';
    const btn = document.getElementById('next-action-btn');
    let gameOver = false, startBonus = false;
    if (isBonusRound) { gameOver = true; }
    else if (scores.p1 >= WIN_SCORE && scores.p2 >= WIN_SCORE) { startBonus = true; }
    else if (scores.p1 >= WIN_SCORE || scores.p2 >= WIN_SCORE) { gameOver = true; }

    if (gameOver) { btn.textContent = 'View Final Results 🏆'; pendingAction = () => { document.getElementById('score-overlay').classList.add('hide'); showWin(); }; }
    else if (startBonus) { btn.textContent = 'Start Bonus Round 🔥'; pendingAction = () => { isBonusRound = true; document.getElementById('score-overlay').classList.add('hide'); roundN++; startRound() }; }
    else { btn.textContent = 'Next Round ▶'; pendingAction = () => { document.getElementById('score-overlay').classList.add('hide'); roundN++; startRound(); }; }
    document.getElementById('score-overlay').classList.remove('hide');
}

function showWin() {
    let p1wins = scores.p1 > scores.p2, tie = scores.p1 === scores.p2;
    if (isBonusRound) { if (latestEarned.p1 > latestEarned.p2) p1wins = true; else if (latestEarned.p2 > latestEarned.p1) p1wins = false; else tie = true; }
    const winnerName = tie ? "It's a Tie!" : (p1wins ? 'Arkon the Bold' : 'Zephyra the Wise');
    const winnerColor = tie ? '#f5c842' : (p1wins ? '#e74c3c' : '#3498db');
    document.getElementById('win-title').innerHTML = `<span style="color:${winnerColor}">🏆 ${winnerName} ${tie ? '' : 'Wins!'} 🏆</span>`;
    document.getElementById('win-subtitle').textContent = isBonusRound ? 'Bonus Round Decided the Champion!' : 'First to 21 Points!';
    document.getElementById('win-cols').innerHTML = ['p1', 'p2'].map(pl => {
        const pname = pl === 'p1' ? 'Arkon the Bold' : 'Zephyra the Wise';
        const pcolor = pl === 'p1' ? '#e74c3c' : '#3498db';
        const isWinner = tie || (pl === 'p1' && p1wins) || (pl === 'p2' && !p1wins);
        return `<div class="ov-card" style="border-color:${isWinner ? 'var(--rg)' : 'rgba(245,200,66,0.15)'};box-shadow:${isWinner ? '0 0 20px rgba(245,200,66,0.3)' : 'none'}"><div class="ov-pname-clean" style="color:${pcolor};font-size:18px;border-bottom:none;margin-bottom:0;padding-bottom:0">${pname}</div><div style="text-align:center;font-size:54px;font-weight:900;color:var(--rt);margin:10px 0">${scores[pl]}</div><div style="text-align:center;color:var(--sc);font-size:12px;text-transform:uppercase;letter-spacing:2px">Final Score</div>${isBonusRound ? `<div style="text-align:center;font-size:11px;color:var(--sp);margin-top:6px">Bonus Round Points: +${latestEarned[pl]}</div>` : ''}</div>`;
    }).join('');
    document.getElementById('win-overlay').classList.remove('hide');
}

function resetGame() {
    document.getElementById('win-overlay').classList.add('hide');
    scores = { p1: 0, p2: 0 }; turnN = 1; roundN = 1; isBonusRound = false;
    startRound();
}

let toastT = null;
function showToast(msg) {
    const el = document.getElementById('toast'); el.textContent = msg; el.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2000);
}