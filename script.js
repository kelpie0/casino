let balance = localStorage.getItem('simpleCasinoBal') ? parseFloat(localStorage.getItem('simpleCasinoBal')) : 1000.00;

// audio engine
let audioCtx;
function initAudio() {
    if (!audioCtx) { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    if (audioCtx.state === 'suspended') audioCtx.resume();
}
document.addEventListener('click', initAudio, { once: true });

function playTone(freq, type, duration, vol=0.1) {
    if(!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    osc.stop(audioCtx.currentTime + duration);
}

const sfx = {
    tick: (base = 1, mod = 0) => playTone(400 * (base + Math.sin(mod)*0.15), 'sine', 0.05, 0.1),
    thud: () => playTone(150, 'square', 0.1, 0.1),
    wheelTick: (base = 1, mod = 0) => playTone(600 * (base + Math.sin(mod)*0.2), 'triangle', 0.05, 0.05),
    win: () => { playTone(400, 'square', 0.2, 0.1); setTimeout(() => playTone(600, 'square', 0.3, 0.1), 150); },
    lose: () => playTone(150, 'sawtooth', 0.4, 0.1),
    cardDeal: () => playTone(300, 'square', 0.05, 0.05),
    crashEngine: (freq) => playTone(freq, 'sawtooth', 0.1, 0.05),
    crashExplode: () => { playTone(100, 'sawtooth', 0.5, 0.2); playTone(50, 'square', 0.8, 0.2); }
};

// confetti
const confCanvas = document.getElementById('confettiCanvas');
const cctx = confCanvas.getContext('2d');
let confParticles = [];

function fireConfetti() {
    confCanvas.width = window.innerWidth; confCanvas.height = window.innerHeight;
    for(let i=0; i<150; i++) {
        confParticles.push({
            x: Math.random() * confCanvas.width, y: -20 - Math.random() * 200,
            vx: (Math.random() - 0.5) * 4, vy: Math.random() * 5 + 4,
            color: `hsl(${Math.random()*360}, 100%, 60%)`,
            size: Math.random() * 8 + 4, rot: Math.random() * 360, rs: (Math.random() - 0.5) * 10
        });
    }
    drawConfetti();
}
function drawConfetti() {
    if(confParticles.length === 0) { cctx.clearRect(0,0,confCanvas.width, confCanvas.height); return; }
    cctx.clearRect(0,0,confCanvas.width, confCanvas.height);
    for(let i=0; i<confParticles.length; i++) {
        let p = confParticles[i];
        p.x += p.vx; p.y += p.vy; p.rot += p.rs;
        cctx.save(); cctx.translate(p.x, p.y); cctx.rotate(p.rot * Math.PI/180);
        cctx.fillStyle = p.color; cctx.fillRect(-p.size/2, -p.size/2, p.size, p.size); cctx.restore();
        if(p.y > confCanvas.height) { confParticles.splice(i, 1); i--; }
    }
    requestAnimationFrame(drawConfetti);
}

// core balance
function updateBalance(amount) {
    balance += amount;
    localStorage.setItem('simpleCasinoBal', balance.toFixed(2));
    document.getElementById('balanceDisplay').innerText = balance.toFixed(2);
    const el = document.querySelector('.balance-container');
    el.style.color = amount > 0 ? 'var(--win-color)' : (amount < 0 ? 'var(--lose-color)' : 'inherit');
    setTimeout(() => el.style.color = 'inherit', 400);
}
updateBalance(0);

// menu & navigation
function toggleMenu() { initAudio(); document.getElementById('gameMenu').classList.toggle('show'); }
function openGame(id) {
    document.querySelectorAll('.game-view').forEach(el => el.classList.remove('active-view'));
    document.getElementById(id).classList.add('active-view');
}
function getBet(id) {
    let val = parseFloat(document.getElementById(id).value);
    if (isNaN(val) || val <= 0) return false;
    if (val > balance) { alert("insufficient funds."); return false; }
    return val;
}
function status(id, msg, isWin) {
    const el = document.getElementById(id);
    el.innerHTML = msg; el.className = 'game-status ' + (isWin ? 'win-text' : 'lose-text');
    if(isWin) fireConfetti();
}

window.onclick = function(event) {
    if (!event.target.matches('.hamburger-btn')) document.getElementById('gameMenu').classList.remove('show');
    if (!event.target.closest('.custom-dropdown-container')) document.getElementById('horseOptions').classList.remove('show');
}

// --- 1. SLOTS (Downward Roll Animation) ---
const slotSymbols = ['🍒', '🍋', '🍉', '🍇', '🔔', '💎', '7️⃣', '🍀', '🍎', '💰', '⭐', '🎱'];
function playSlots() {
    let bet = getBet('slotsBet'); if (!bet) return;
    updateBalance(-bet);

    const reels = [document.getElementById('reel1'), document.getElementById('reel2'), document.getElementById('reel3')];
    document.getElementById('btnSlots').disabled = true;
    document.getElementById('slotsStatus').innerHTML = 'spinning...'; document.getElementById('slotsStatus').className = 'game-status';

    let results = [
        slotSymbols[Math.floor(Math.random()*slotSymbols.length)],
        slotSymbols[Math.floor(Math.random()*slotSymbols.length)],
        slotSymbols[Math.floor(Math.random()*slotSymbols.length)]
    ];

    // Build internal reels for sliding
    reels.forEach((r, i) => {
        let html = '';
        for(let j=0; j<29; j++) html += `<div class="slot-sym">${slotSymbols[Math.floor(Math.random()*slotSymbols.length)]}</div>`;
        html += `<div class="slot-sym">${results[i]}</div>`; // Final symbol
        r.innerHTML = `<div class="reel-inner" id="innerReel${i}">${html}</div>`;
        
        let inner = document.getElementById(`innerReel${i}`);
        inner.style.transition = 'none';
        inner.style.transform = 'translateY(0px)';
    });

    // Audio ticking loop
    let ticks = 0; let tickInterval = setInterval(() => { sfx.tick(1, ticks++); }, 100);

    // Trigger animation frame so transition takes effect
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            reels.forEach((r, i) => {
                let inner = document.getElementById(`innerReel${i}`);
                // staggered stopping times
                inner.style.transition = `transform ${2 + i*0.8}s cubic-bezier(0.1, 0.7, 0.1, 1)`;
                inner.style.transform = `translateY(-${29 * 240}px)`; // 240px is symbol height
            });
        });
    });

    // Check result after longest animation finishes (approx 3.6s)
    setTimeout(() => {
        clearInterval(tickInterval);
        document.getElementById('btnSlots').disabled = false;
        sfx.thud();
        
        if (results[0] === results[1] && results[1] === results[2]) {
            let mult = results[0] === '7️⃣' ? 100 : (results[0] === '💎' ? 50 : 10);
            updateBalance(bet * mult); sfx.win(); status('slotsStatus', `jackpot! won $${(bet * mult).toFixed(2)} (${mult}x)`, true);
        } else if (results[0] === results[1] || results[1] === results[2] || results[0] === results[2]) {
            let pairSym = (results[0] === results[1]) ? results[0] : results[2];
            let mult = pairSym === '7️⃣' ? 5 : (pairSym === '💎' ? 3 : 1.5);
            updateBalance(bet * mult); sfx.win(); status('slotsStatus', `pair of ${pairSym}! won $${(bet * mult).toFixed(2)} (${mult}x)`, true);
        } else {
            sfx.lose(); status('slotsStatus', `loss. try again.`, false);
        }
    }, 3800);
}

// --- 2. WHEEL ---
const wheelMultipliers = [0, 0.5, 1.5, 0, 2, 0.1, 3, 0.5, 1, 0, 5, 0.5, 2.5, 0, 1.2, 0.2, 4, 0.5, 0, 10];
const wheelEl = document.getElementById('spinWheel');
let gradStr = 'conic-gradient(';
wheelMultipliers.forEach((m, i) => {
    let color = m === 10 ? '#fff' : (m === 0 ? '#111' : (i % 2 === 0 ? '#dc2626' : '#222'));
    let st = i * 18; // 360 / 20 = 18 degrees per segment
    let en = (i + 1) * 18;
    gradStr += `${color} ${st}deg ${en}deg${i < 19 ? ',' : ''}`;
    
    let lbl = document.createElement('div'); lbl.className = 'wheel-label'; lbl.innerText = m + 'x';
    // Math logic: transformOrigin is 0 50%. A rotate of 0deg points at 3 o'clock. 
    // The conic-gradient starts at 12 o'clock. 12 o'clock relative to 3 o'clock is -90deg.
    // The center of the segment is at its start + half its width (9 degrees).
    lbl.style.transform = `translateY(-50%) rotate(${st + 9 - 90}deg)`;
    if(m===10) lbl.style.color = '#000';
    wheelEl.appendChild(lbl);
});
wheelEl.style.background = gradStr + ')';

let cWheelAng = 0, isWheelSp=false;
function playWheel() {
    if(isWheelSp) return;
    let bet = getBet('wheelBet'); if (!bet) return;
    updateBalance(-bet);
    isWheelSp = true; document.getElementById('btnWheel').disabled = true;
    document.getElementById('wheelStatus').innerHTML = 'spinning...'; document.getElementById('wheelStatus').className = 'game-status';

    let tAng = cWheelAng + (Math.floor(Math.random()*5)+5)*360 + Math.floor(Math.random()*360);
    let sTime = performance.now(), lSeg = -1;

    function animW(time) {
        let prog = Math.min((time - sTime) / 6000, 1);
        let eo = 1 - Math.pow(1 - prog, 3);
        let ang = cWheelAng + (tAng - cWheelAng) * eo;
        wheelEl.style.transform = `rotate(${ang}deg)`;
        
        let cSeg = Math.floor(((360 - (ang % 360)) % 360) / 18);
        if (cSeg !== lSeg && prog > 0) { lSeg = cSeg; sfx.wheelTick(1.5 - prog, ang); } 

        if (prog < 1) requestAnimationFrame(animW);
        else {
            cWheelAng = ang; isWheelSp = false; document.getElementById('btnWheel').disabled = false;
            let mult = wheelMultipliers[Math.floor(((360 - (cWheelAng % 360)) % 360) / 18)];
            if (mult > 0) { updateBalance(bet * mult); sfx.win(); status('wheelStatus', `won $${(bet * mult).toFixed(2)} (${mult}x)`, true); } 
            else { sfx.lose(); status('wheelStatus', 'missed.', false); }
        }
    }
    requestAnimationFrame(animW);
}

// --- 3. BLACKJACK ---
let plrHand=[], dlrHand=[], bjCurBet=0;
function getCardObj() {
    const s = ['♥', '♦', '♣', '♠'], v = ['2','3','4','5','6','7','8','9','10','j','q','k','a'];
    let c = v[Math.floor(Math.random() * v.length)];
    return { val: c, suit: s[Math.floor(Math.random() * s.length)], num: ['j','q','k'].includes(c) ? 10 : (c === 'a' ? 11 : parseInt(c)) };
}
function renderCard(c, hid = false) { return `<div class="playing-card ${c.suit==='♥'||c.suit==='♦' && !hid ? 'card-red' : 'card-black'}">${hid ? '?' : c.val + c.suit}</div>`; }
function calcScore(h) {
    let s = 0, a = 0; h.forEach(c => { s += c.num; if(c.val==='a') a++; });
    while(s > 21 && a > 0) { s -= 10; a--; } return s;
}
function startBlackjack() {
    bjCurBet = getBet('bjBet'); if(!bjCurBet) return;
    updateBalance(-bjCurBet);
    plrHand = [getCardObj(), getCardObj()]; dlrHand = [getCardObj(), getCardObj()];
    document.getElementById('bjBetPhase').style.display = 'none'; document.getElementById('bjActionPhase').style.display = 'flex';
    document.getElementById('bjStatus').innerHTML = ''; document.getElementById('bjStatus').className = 'game-status';
    sfx.cardDeal(); setTimeout(() => sfx.cardDeal(), 200); updateBjUI();
    if(calcScore(plrHand) === 21) handleBjEnd(true);
}
function updateBjUI(shDlr = false) {
    document.getElementById('plrCards').innerHTML = plrHand.map(c => renderCard(c)).join('');
    document.getElementById('plrScore').innerText = calcScore(plrHand);
    let dH = renderCard(dlrHand[0]);
    if(shDlr) { dH += dlrHand.slice(1).map(c => renderCard(c)).join(''); document.getElementById('dlrScore').innerText = calcScore(dlrHand); } 
    else { dH += renderCard(dlrHand[1], true); document.getElementById('dlrScore').innerText = '?'; }
    document.getElementById('dlrCards').innerHTML = dH;
}
function bjHit() { sfx.cardDeal(); plrHand.push(getCardObj()); updateBjUI(); if(calcScore(plrHand) > 21) handleBjEnd(); }
function bjStand() { let dt = setInterval(() => { if(calcScore(dlrHand)<17) { sfx.cardDeal(); dlrHand.push(getCardObj()); updateBjUI(true); } else { clearInterval(dt); handleBjEnd(); } }, 500); }
function handleBjEnd(isNat = false) {
    updateBjUI(true); document.getElementById('bjBetPhase').style.display = 'flex'; document.getElementById('bjActionPhase').style.display = 'none';
    let p = calcScore(plrHand), d = calcScore(dlrHand);
    if(p > 21) { sfx.lose(); status('bjStatus', 'bust. you lose.', false); } 
    else if (isNat) { updateBalance(bjCurBet * 2.5); sfx.win(); status('bjStatus', `blackjack! won $${(bjCurBet * 2.5).toFixed(2)}`, true); } 
    else if (d > 21 || p > d) { updateBalance(bjCurBet * 2); sfx.win(); status('bjStatus', `you win $${(bjCurBet * 2).toFixed(2)}`, true); } 
    else if (p === d) { updateBalance(bjCurBet); sfx.tick(); status('bjStatus', 'push. bet returned.', false); document.getElementById('bjStatus').style.color='#aaa'; } 
    else { sfx.lose(); status('bjStatus', 'dealer wins.', false); }
}

// --- 4. CRASH ---
let crMult=1.00, crTarg=0, isCr=false, crBet=0, crHist=[], crAF;
const cv=document.getElementById('crashCanvas'), cx=cv.getContext('2d');
function drCrLine() {
    cx.clearRect(0, 0, cv.width, cv.height); if(crHist.length===0) return;
    let mX = Math.max(crHist[crHist.length-1].t, 5000), mY = Math.max(crMult, 2.0);
    cx.beginPath(); cx.moveTo(0, cv.height);
    for(let pt of crHist) { cx.lineTo((pt.t/mX)*cv.width, cv.height - ((pt.m-1)/(mY-1))*(cv.height-40)); }
    cx.lineWidth = 3; cx.strokeStyle = isCr ? '#fff' : '#f87171'; cx.stroke();
    cx.lineTo(cv.width, cv.height); cx.lineTo(0, cv.height);
    cx.fillStyle = isCr ? 'rgba(255, 255, 255, 0.05)' : 'rgba(248, 113, 113, 0.1)'; cx.fill();
}
function startCrash() {
    if(isCr) return; crBet=getBet('crashBet'); if(!crBet) return;
    updateBalance(-crBet); isCr=true; crMult=1.00; crHist=[];
    crTarg=Math.max(1.00, (100/(100-Math.random()*100))*0.99); if(Math.random()<0.05) crTarg=1.00; 
    document.getElementById('btnCrash').style.display='none'; document.getElementById('btnCashout').style.display='block';
    document.getElementById('crashGraphContainer').classList.remove('crashing'); document.getElementById('crashStatus').innerHTML='';
    let st=performance.now(), lt=st;
    function runCr(tm) {
        if(!isCr) return; let el = tm - st; crMult = Math.pow(1.00005, el); 
        crHist.push({t:el, m:crMult}); document.getElementById('crashMult').innerText = crMult.toFixed(2)+'x'; drCrLine();
        if(tm-lt>100) { sfx.crashEngine(100+(crMult*10)); lt=tm; }
        if(crMult>=crTarg) endCrash(false); else crAF=requestAnimationFrame(runCr);
    }
    crAF=requestAnimationFrame(runCr);
}
function cashoutCrash() { if(!isCr) return; cancelAnimationFrame(crAF); updateBalance(crBet*crMult); sfx.win(); endCrash(true); }
function endCrash(won) {
    isCr=false; document.getElementById('btnCrash').style.display='block'; document.getElementById('btnCashout').style.display='none';
    if(!won) {
        sfx.crashExplode(); document.getElementById('crashGraphContainer').classList.add('crashing');
        document.getElementById('crashMult').innerText=crTarg.toFixed(2)+'x'; drCrLine(); status('crashStatus', `crashed at ${crTarg.toFixed(2)}x`, false);
    } else { drCrLine(); status('crashStatus', `cashed out! won $${(crBet*crMult).toFixed(2)}`, true); }
}

// --- 5. ROULETTE ---
const redNum=[1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
function playRoulette() {
    let bet=getBet('rouletteBet'); if(!bet) return;
    const sBet = document.querySelector('input[name="r_bet"]:checked').value;
    updateBalance(-bet);
    const btn=document.getElementById('btnRoulette'), rd=document.getElementById('rouletteResult');
    btn.disabled=true; document.getElementById('rouletteStatus').innerHTML='spinning...'; document.getElementById('rouletteStatus').className='game-status';
    let t=0, cyc=setInterval(() => { rd.innerText=Math.floor(Math.random()*37); rd.style.borderColor='#333'; sfx.tick(1, t++); }, 60);
    setTimeout(() => {
        clearInterval(cyc); btn.disabled=false;
        let wN=Math.floor(Math.random()*37), wC='green', dC='#059669'; 
        if(wN!==0) { if(redNum.includes(wN)) {wC='red';dC='#dc2626';} else {wC='black';dC='#fff';} }
        rd.innerText=wN; rd.style.borderColor=dC;
        if(sBet===wC) { let m=wC==='green'?36:2; updateBalance(bet*m); sfx.win(); status('rouletteStatus', `landed on ${wN} ${wC}! won $${(bet*m).toFixed(2)}`, true);
        } else { sfx.lose(); status('rouletteStatus', `landed on ${wN} ${wC}. lost.`, false); }
    }, 2500);
}

// --- 6. HORSE RACING ---
const horses = [
    { id: 0, name: "bullet'n board", hex: "#dc2626" }, { id: 1, name: "lightning strikes thrice", hex: "#facc15" },
    { id: 2, name: "superstitional realism", hex: "#22c55e" }, { id: 3, name: "door knob", hex: "#3b82f6" },
    { id: 4, name: "jovial merryment", hex: "#f97316" }, { id: 5, name: "downtown skybox", hex: "#a855f7" },
    { id: 6, name: "cyan", hex: "#06b6d4" }, { id: 7, name: "resolute mind afternoon", hex: "#ec4899" },
    { id: 8, name: "comely material morning", hex: "#84cc16" }, { id: 9, name: "a mysterious figure", hex: "#333333" }, 
    { id: 10, name: "garbage bin", hex: "#78350f" }, { id: 11, name: "nighttime knifemare", hex: "#1e3a8a" },
    { id: 12, name: "00b", hex: "#ffffff" }, { id: 13, name: "00e", hex: "#6b7280" },
    { id: 14, name: "006", hex: "#d946ef" }, { id: 15, name: "009", hex: "#14b8a6" }
];
let selectedHorseId = null; let isRacing = false;
const opts = document.getElementById('horseOptions');
horses.forEach((h, i) => {
    let o = document.createElement('div'); o.className = 'custom-option';
    o.innerHTML = `<span class="horse-preview" style="text-shadow: 0 0 10px ${h.hex}">🐴</span> ${h.name}`;
    o.onclick = () => selectHorse(i);
    opts.appendChild(o);
});
function toggleHorseDropdown(e) { e.stopPropagation(); if(!isRacing) document.getElementById('horseOptions').classList.toggle('show'); }
function selectHorse(id) {
    selectedHorseId = id;
    document.getElementById('selectedHorseText').innerHTML = `<span style="text-shadow: 0 0 10px ${horses[id].hex}">🐴</span> ${horses[id].name}`;
    document.getElementById('horseOptions').classList.remove('show');
}
function startDerby() {
    if(isRacing) return;
    if(selectedHorseId === null) { alert("please select a horse."); return; }
    let bet = getBet('derbyBet'); if(!bet) return;
    
    updateBalance(-bet); isRacing = true; document.getElementById('btnDerby').disabled = true;
    document.getElementById('derbyStatus').innerHTML = 'they\'re off!'; document.getElementById('derbyStatus').className = 'game-status';

    // select 6 horses for this race (including selected)
    let raceGroup = [horses[selectedHorseId]];
    let pool = horses.filter(h => h.id !== selectedHorseId).sort(() => Math.random() - 0.5);
    raceGroup.push(...pool.slice(0, 5));
    raceGroup.sort(() => Math.random() - 0.5); // shuffle lane order

    let trk = document.getElementById('raceTrack');
    trk.innerHTML = ''; let hEls = [], positions = [];
    
    raceGroup.forEach((h, i) => {
        let l = document.createElement('div'); l.className = 'lane';
        let e = document.createElement('div'); e.className = 'horse-emoji'; 
        e.innerText = '🐴'; e.setAttribute('data-name', h.name); e.style.textShadow = `0 0 10px ${h.hex}, 0 0 20px ${h.hex}`;
        e.style.left = '0%';
        l.appendChild(e); trk.appendChild(l);
        hEls.push(e); positions.push(0);
    });

    let raceAnim, ticks = 0, finishedOrder = [];
    
    function runRace() {
        for(let i=0; i<6; i++) {
            if(positions[i] >= 100) continue;
            positions[i] += Math.random() * 0.8;
            hEls[i].style.left = Math.min(positions[i], 100) + '%';
            if(positions[i] >= 100 && !finishedOrder.includes(raceGroup[i])) {
                finishedOrder.push(raceGroup[i]);
            }
        }
        
        if (ticks++ % 4 === 0) sfx.tick(1, ticks);
        
        if(finishedOrder.length >= 2) {
            cancelAnimationFrame(raceAnim);
            isRacing = false; document.getElementById('btnDerby').disabled = false;
            
            let first = finishedOrder[0]; let second = finishedOrder[1];
            
            if(first.id === selectedHorseId) {
                updateBalance(bet * 5); sfx.win();
                status('derbyStatus', `${first.name} wins 1st! you won $${(bet*5).toFixed(2)} (5x)`, true);
            } else if (second.id === selectedHorseId) {
                updateBalance(bet * 2); sfx.win();
                status('derbyStatus', `${second.name} took 2nd! you won $${(bet*2).toFixed(2)} (2x)`, true);
            } else {
                sfx.lose();
                status('derbyStatus', `${first.name} won. your horse lost.`, false);
            }
        } else { raceAnim = requestAnimationFrame(runRace); }
    }
    raceAnim = requestAnimationFrame(runRace);
}

// --- 7. UNO ---
let unoDeck = [], unoPlayers = [], unoDiscard = null, unoColor = '', unoDir = 1, unoCurr = 0, unoBetAmt = 0;
const unoColors = ['red', 'blue', 'green', 'yellow'];
const unoVals = ['0','1','2','3','4','5','6','7','8','9','skip','rev','+2'];

function buildUnoDeck() {
    let d = [];
    unoColors.forEach(c => {
        d.push({c: c, v: '0'});
        for(let i=1; i<=9; i++) { d.push({c: c, v: i.toString()}); d.push({c: c, v: i.toString()}); }
        ['skip','rev','+2'].forEach(v => { d.push({c: c, v: v}); d.push({c: c, v: v}); });
    });
    for(let i=0; i<4; i++) { d.push({c: 'wild', v: 'wild'}); d.push({c: 'wild', v: '+4'}); }
    return d.sort(() => Math.random() - 0.5);
}

function startUno() {
    let bots = parseInt(document.getElementById('unoBots').value);
    if(bots < 1 || bots > 10) return alert('choose 1-10 bots.');
    unoBetAmt = getBet('unoBet'); if(!unoBetAmt) return;
    updateBalance(-unoBetAmt);

    document.getElementById('unoSetup').style.display = 'none';
    document.getElementById('unoGame').style.display = 'block';
    
    unoDeck = buildUnoDeck();
    unoPlayers = Array.from({length: bots + 1}, () => []); // 0 is player
    for(let i=0; i<7; i++) { unoPlayers.forEach(p => p.push(unoDeck.pop())); }
    
    do { unoDiscard = unoDeck.pop(); } while(unoDiscard.c === 'wild');
    unoColor = unoDiscard.c; unoDir = 1; unoCurr = 0;
    
    sfx.cardDeal(); updateUnoUI();
    document.getElementById('unoStatus').innerText = 'game started! your turn.';
    document.getElementById('unoStatus').className = 'game-status';
}

function updateUnoUI() {
    // top bot status
    let bHtml = '';
    for(let i=1; i<unoPlayers.length; i++) {
        bHtml += `<div class="bot-tag ${unoCurr === i ? 'active' : ''}">bot ${i}: ${unoPlayers[i].length} cards</div>`;
    }
    document.getElementById('unoBotsStatus').innerHTML = bHtml;
    
    // center area
    let dCard = document.getElementById('unoDiscardCard');
    dCard.className = `uno-card ${unoDiscard.c}`; dCard.innerText = unoDiscard.v;
    let cInd = document.getElementById('unoCurrentColor');
    cInd.innerText = `color: ${unoColor}`; cInd.style.color = unoColor === 'yellow' ? '#eab308' : unoColor;

    // player hand
    let hHtml = '';
    unoPlayers[0].forEach((c, idx) => {
        let valid = isUnoValid(c) && unoCurr === 0;
        hHtml += `<div class="uno-card uno-hand-card ${c.c} ${valid ? '' : 'disabled'}" onclick="unoPlayerPlay(${idx})">${c.v}</div>`;
    });
    document.getElementById('unoPlayerHand').innerHTML = hHtml;
    document.getElementById('unoTurnIndicator').innerText = unoCurr === 0 ? 'your turn' : `bot ${unoCurr}'s turn`;
}

function isUnoValid(c) { return c.c === 'wild' || c.c === unoColor || c.v === unoDiscard.v; }

function unoPlayerPlay(idx) {
    if(unoCurr !== 0) return;
    let c = unoPlayers[0][idx]; if(!isUnoValid(c)) return;
    sfx.cardDeal();
    unoPlayers[0].splice(idx, 1);
    unoDiscard = c;
    if(c.c === 'wild') {
        document.getElementById('unoWildPicker').style.display = 'block';
        updateUnoUI(); return; // wait for color pick
    }
    unoColor = c.c;
    processUnoEffect(c);
}

function unoDrawCard() {
    if(unoCurr !== 0) return;
    if(unoDeck.length === 0) unoDeck = buildUnoDeck();
    unoPlayers[0].push(unoDeck.pop());
    sfx.cardDeal();
    unoNextTurn();
}

function unoResolveWild(color) {
    document.getElementById('unoWildPicker').style.display = 'none';
    unoColor = color;
    processUnoEffect(unoDiscard);
}

function processUnoEffect(c) {
    if(c.v === 'rev') unoDir *= -1;
    if(c.v === 'skip') unoCurr = (unoCurr + unoDir + unoPlayers.length) % unoPlayers.length;
    if(c.v === '+2') {
        let target = (unoCurr + unoDir + unoPlayers.length) % unoPlayers.length;
        unoPlayers[target].push(unoDeck.pop(), unoDeck.pop());
        unoCurr = target; // skips them
    }
    if(c.v === '+4') {
        let target = (unoCurr + unoDir + unoPlayers.length) % unoPlayers.length;
        unoPlayers[target].push(unoDeck.pop(), unoDeck.pop(), unoDeck.pop(), unoDeck.pop());
        unoCurr = target; // skips them
    }
    checkUnoWin();
}

function checkUnoWin() {
    if(unoPlayers[0].length === 0) {
        let winAmt = unoBetAmt * (unoPlayers.length - 1);
        updateBalance(winAmt); sfx.win();
        status('unoStatus', `you won! payout $${winAmt.toFixed(2)}`, true);
        endUno(); return;
    }
    for(let i=1; i<unoPlayers.length; i++) {
        if(unoPlayers[i].length === 0) {
            sfx.lose();
            status('unoStatus', `bot ${i} won. you lost.`, false);
            endUno(); return;
        }
    }
    unoNextTurn();
}

function unoNextTurn() {
    unoCurr = (unoCurr + unoDir + unoPlayers.length) % unoPlayers.length;
    updateUnoUI();
    if(unoCurr !== 0) setTimeout(unoBotPlay, 800);
}

function unoBotPlay() {
    let hand = unoPlayers[unoCurr];
    let validIdx = hand.findIndex(c => isUnoValid(c));
    if(validIdx !== -1) {
        let c = hand[validIdx];
        hand.splice(validIdx, 1);
        unoDiscard = c;
        if(c.c === 'wild') {
            let counts = {red:0, blue:0, green:0, yellow:0};
            hand.forEach(hc => { if(hc.c !== 'wild') counts[hc.c]++; });
            unoColor = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
        } else { unoColor = c.c; }
        sfx.cardDeal(); processUnoEffect(c);
    } else {
        if(unoDeck.length === 0) unoDeck = buildUnoDeck();
        hand.push(unoDeck.pop());
        sfx.cardDeal(); unoNextTurn();
    }
}

function endUno() {
    document.getElementById('unoSetup').style.display = 'block';
    document.getElementById('unoGame').style.display = 'none';
}