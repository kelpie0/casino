let balance = localStorage.getItem('simpleCasinoBal') ? parseFloat(localStorage.getItem('simpleCasinoBal')) : 1000.00;

// AUDIO ENGINE
let audioCtx;
function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}
document.addEventListener('click', initAudio, { once: true });

function playTone(freq, type, duration, vol=0.1) {
    if(!audioCtx) return;
    const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    osc.stop(audioCtx.currentTime + duration);
}

const sfx = {
    tick: (base = 1, mod = 0) => playTone(400 * (base + Math.sin(mod)*0.15), 'sine', 0.05, 0.1),
    thud: () => playTone(150, 'square', 0.1, 0.15),
    wheelTick: (base = 1, mod = 0) => playTone(600 * (base + Math.sin(mod)*0.2), 'triangle', 0.05, 0.05),
    win: () => { playTone(400, 'square', 0.2, 0.1); setTimeout(() => playTone(600, 'square', 0.3, 0.1), 150); },
    lose: () => playTone(150, 'sawtooth', 0.4, 0.1),
    cardDeal: () => playTone(300, 'square', 0.05, 0.05),
    crashEngine: (freq) => playTone(freq, 'sawtooth', 0.1, 0.05),
    crashExplode: () => { playTone(100, 'sawtooth', 0.5, 0.2); playTone(50, 'square', 0.8, 0.2); }
};

// CONFETTI
const confCanvas = document.getElementById('confettiCanvas'), cctx = confCanvas.getContext('2d');
let confParticles = [];
function fireConfetti() {
    confCanvas.width = window.innerWidth; confCanvas.height = window.innerHeight;
    for(let i=0; i<150; i++) confParticles.push({
        x: Math.random() * confCanvas.width, y: -20 - Math.random() * 200,
        vx: (Math.random() - 0.5) * 4, vy: Math.random() * 5 + 4,
        color: `hsl(${Math.random()*360}, 100%, 60%)`, size: Math.random() * 8 + 4, rot: Math.random() * 360, rs: (Math.random() - 0.5) * 10
    });
    drawConfetti();
}
function drawConfetti() {
    if(confParticles.length === 0) { cctx.clearRect(0,0,confCanvas.width, confCanvas.height); return; }
    cctx.clearRect(0,0,confCanvas.width, confCanvas.height);
    for(let i=0; i<confParticles.length; i++) {
        let p = confParticles[i]; p.x += p.vx; p.y += p.vy; p.rot += p.rs;
        cctx.save(); cctx.translate(p.x, p.y); cctx.rotate(p.rot * Math.PI/180);
        cctx.fillStyle = p.color; cctx.fillRect(-p.size/2, -p.size/2, p.size, p.size); cctx.restore();
        if(p.y > confCanvas.height) { confParticles.splice(i, 1); i--; }
    }
    requestAnimationFrame(drawConfetti);
}

// GLOBALS
function updateBalance(amount) {
    balance += amount; localStorage.setItem('simpleCasinoBal', balance.toFixed(2));
    document.getElementById('balanceDisplay').innerText = balance.toFixed(2);
    const el = document.querySelector('.balance-container');
    el.style.color = amount > 0 ? 'var(--win-color)' : (amount < 0 ? 'var(--lose-color)' : 'inherit');
    setTimeout(() => el.style.color = 'inherit', 400);
}
updateBalance(0);

function toggleMenu() { initAudio(); document.getElementById('gameMenu').classList.toggle('show'); }
function openGame(id) { document.querySelectorAll('.game-view').forEach(el => el.classList.remove('active-view')); document.getElementById(id).classList.add('active-view'); }
function getBet(id) {
    let val = parseFloat(document.getElementById(id).value);
    if (isNaN(val) || val <= 0) return false;
    if (val > balance) { alert("insufficient funds."); return false; }
    return val;
}
function status(id, msg, isWin) {
    const el = document.getElementById(id); el.innerHTML = msg; el.className = 'game-status ' + (isWin ? 'win-text' : 'lose-text');
    if(isWin) fireConfetti();
}
window.onclick = function(event) {
    if (!event.target.matches('.hamburger-btn')) document.getElementById('gameMenu').classList.remove('show');
    if (!event.target.closest('.custom-dropdown-container')) {
        const ho = document.getElementById('horseOptions'); if(ho) ho.classList.remove('show');
    }
}

// 1. SLOTS
const slotSymbols = ['🍒','🍋','🍉','🍇','🔔','💎','7️⃣','🍀','🍎','💰','⭐','🎱'];
function playSlots() {
    let bet = getBet('slotsBet'); if (!bet) return;
    updateBalance(-bet);
    const reels = [document.getElementById('reel1'), document.getElementById('reel2'), document.getElementById('reel3')];
    document.getElementById('btnSlots').disabled = true;
    document.getElementById('slotsStatus').innerHTML = 'spinning...'; document.getElementById('slotsStatus').className = 'game-status';

    let results = [slotSymbols[Math.floor(Math.random()*slotSymbols.length)], slotSymbols[Math.floor(Math.random()*slotSymbols.length)], slotSymbols[Math.floor(Math.random()*slotSymbols.length)]];
    const itemHeight = 240, totalItems = 29, targetY = totalItems * itemHeight;

    reels.forEach((r, i) => {
        let html = '';
        for(let j=0; j<totalItems; j++) html += `<div class="slot-sym">${slotSymbols[Math.floor(Math.random()*slotSymbols.length)]}</div>`;
        html += `<div class="slot-sym">${results[i]}</div>`; 
        r.innerHTML = `<div class="reel-inner" id="innerReel${i}">${html}</div>`;
        document.getElementById(`innerReel${i}`).style.transform = 'translateY(0px)';
    });

    let startTime = performance.now(), lastTickIndex = [-1,-1,-1], finished = [false,false,false], durations = [2000, 2800, 3600]; 

    function animateSlots(time) {
        let elapsed = time - startTime, allDone = true;
        reels.forEach((r, i) => {
            let inner = document.getElementById(`innerReel${i}`);
            let progress = Math.min(elapsed / durations[i], 1);
            let currentY = (1 - Math.pow(1 - progress, 4)) * targetY;
            inner.style.transform = `translateY(-${currentY}px)`;

            let currentIndex = Math.floor(currentY / itemHeight);
            if (currentIndex !== lastTickIndex[i] && progress < 1) { lastTickIndex[i] = currentIndex; sfx.tick(1, currentIndex); }
            if (progress >= 1 && !finished[i]) { finished[i] = true; sfx.thud(); }
            if (progress < 1) allDone = false;
        });

        if (!allDone) requestAnimationFrame(animateSlots);
        else {
            document.getElementById('btnSlots').disabled = false;
            if (results[0] === results[1] && results[1] === results[2]) {
                let m = results[0] === '7️⃣' ? 100 : (results[0] === '💎' ? 50 : 10);
                updateBalance(bet * m); sfx.win(); status('slotsStatus', `jackpot! won $${(bet * m).toFixed(2)} (${m}x)`, true);
            } else if (results[0] === results[1] || results[1] === results[2] || results[0] === results[2]) {
                let p = (results[0] === results[1]) ? results[0] : results[2];
                let m = p === '7️⃣' ? 5 : (p === '💎' ? 3 : 1.5);
                updateBalance(bet * m); sfx.win(); status('slotsStatus', `pair of ${p}! won $${(bet * m).toFixed(2)} (${m}x)`, true);
            } else { sfx.lose(); status('slotsStatus', `loss. try again.`, false); }
        }
    }
    requestAnimationFrame(animateSlots);
}

// 2. WHEEL
const wheelMultipliers = [0, 0.5, 1.5, 0, 2, 0.1, 3, 0.5, 1, 0, 5, 0.5, 2.5, 0, 1.2, 0.2, 4, 0.5, 0, 10];
const wheelEl = document.getElementById('spinWheel');
let gradStr = 'conic-gradient(';
wheelMultipliers.forEach((m, i) => {
    let c = m === 10 ? '#fff' : (m === 0 ? '#111' : (i % 2 === 0 ? '#dc2626' : '#222'));
    let st = i * 18, en = (i + 1) * 18;
    gradStr += `${c} ${st}deg ${en}deg${i < 19 ? ',' : ''}`;
    let lbl = document.createElement('div'); lbl.className = 'wheel-label'; lbl.innerText = m + 'x';
    lbl.style.transform = `translateY(-50%) rotate(${st + 9 - 90}deg)`;
    if(m===10) lbl.style.color = '#000'; wheelEl.appendChild(lbl);
});
wheelEl.style.background = gradStr + ')';

let cWheelAng = 0, isWheelSp=false;
function playWheel() {
    if(isWheelSp) return; let bet = getBet('wheelBet'); if (!bet) return;
    updateBalance(-bet); isWheelSp = true; document.getElementById('btnWheel').disabled = true;
    document.getElementById('wheelStatus').innerHTML = 'spinning...'; document.getElementById('wheelStatus').className = 'game-status';

    let tAng = cWheelAng + (Math.floor(Math.random()*5)+5)*360 + Math.floor(Math.random()*360);
    let sTime = performance.now(), lSeg = -1;

    function animW(time) {
        let prog = Math.min((time - sTime) / 6000, 1);
        let ang = cWheelAng + (tAng - cWheelAng) * (1 - Math.pow(1 - prog, 3));
        wheelEl.style.transform = `rotate(${ang}deg)`;
        
        let cSeg = Math.floor(((360 - (ang % 360)) % 360) / 18);
        if (cSeg !== lSeg && prog > 0) { lSeg = cSeg; sfx.wheelTick(1.5 - prog, ang); } 

        if (prog < 1) requestAnimationFrame(animW);
        else {
            cWheelAng = ang; isWheelSp = false; document.getElementById('btnWheel').disabled = false;
            let m = wheelMultipliers[Math.floor(((360 - (cWheelAng % 360)) % 360) / 18)];
            if (m > 0) { updateBalance(bet * m); sfx.win(); status('wheelStatus', `won $${(bet * m).toFixed(2)} (${m}x)`, true); } 
            else { sfx.lose(); status('wheelStatus', 'missed.', false); }
        }
    }
    requestAnimationFrame(animW);
}

// 3. BLACKJACK
let plrHand=[], dlrHand=[], bjCurBet=0;
function getCardObj() {
    const s = ['♥','♦','♣','♠'], v = ['2','3','4','5','6','7','8','9','10','j','q','k','a'];
    let c = v[Math.floor(Math.random()*v.length)]; return { val: c, suit: s[Math.floor(Math.random()*s.length)], num: ['j','q','k'].includes(c) ? 10 : (c === 'a' ? 11 : parseInt(c)) };
}
function renderCard(c, hid = false) { return `<div class="playing-card ${c.suit==='♥'||c.suit==='♦' && !hid ? 'card-red' : 'card-black'}">${hid ? '?' : c.val + c.suit}</div>`; }
function calcScore(h) { let s=0,a=0; h.forEach(c=>{s+=c.num; if(c.val==='a')a++;}); while(s>21 && a>0){s-=10;a--;} return s; }

function startBlackjack() {
    bjCurBet = getBet('bjBet'); if(!bjCurBet) return;
    updateBalance(-bjCurBet); plrHand = [getCardObj(), getCardObj()]; dlrHand = [getCardObj(), getCardObj()];
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
function bjHit() { 
    sfx.cardDeal(); plrHand.push(getCardObj()); updateBjUI(); 
    let score = calcScore(plrHand);
    if(score > 21) handleBjEnd(); 
    else if(plrHand.length === 5 && score <= 21) handleBjEnd(false, true); 
    else if(score === 21) handleBjEnd();
}
function bjStand() { let dt = setInterval(() => { if(calcScore(dlrHand)<17) { sfx.cardDeal(); dlrHand.push(getCardObj()); updateBjUI(true); } else { clearInterval(dt); handleBjEnd(); } }, 500); }
function handleBjEnd(isNat = false, fiveCard = false) {
    updateBjUI(true); document.getElementById('bjBetPhase').style.display = 'flex'; document.getElementById('bjActionPhase').style.display = 'none';
    let p = calcScore(plrHand), d = calcScore(dlrHand);
    if(p > 21) { sfx.lose(); status('bjStatus', 'bust. you lose.', false); } 
    else if (fiveCard) { updateBalance(bjCurBet * 2); sfx.win(); status('bjStatus', `5-card charlie! you win $${(bjCurBet * 2).toFixed(2)}`, true); }
    else if (isNat) { updateBalance(bjCurBet * 2.5); sfx.win(); status('bjStatus', `blackjack! won $${(bjCurBet * 2.5).toFixed(2)}`, true); } 
    else if (d > 21 || p > d) { updateBalance(bjCurBet * 2); sfx.win(); status('bjStatus', `you win $${(bjCurBet * 2).toFixed(2)}`, true); } 
    else if (p === d) { updateBalance(bjCurBet); sfx.tick(); status('bjStatus', 'push. bet returned.', false); document.getElementById('bjStatus').style.color='#aaa'; } 
    else { sfx.lose(); status('bjStatus', 'dealer wins.', false); }
}

// 4. CRASH
let crMult=1.00, crTarg=0, isCr=false, crBet=0, crHist=[], crAF;
const cv=document.getElementById('crashCanvas'), cx=cv.getContext('2d');
function drCrLine() {
    cx.clearRect(0, 0, cv.width, cv.height); if(crHist.length===0) return;
    let mX = Math.max(crHist[crHist.length-1].t, 5000), mY = Math.max(crMult, 2.0);
    cx.beginPath(); cx.moveTo(0, cv.height);
    for(let pt of crHist) { cx.lineTo((pt.t/mX)*cv.width, cv.height - ((pt.m-1)/(mY-1))*(cv.height-40)); }
    cx.lineWidth = 3; cx.strokeStyle = isCr ? '#fff' : '#f87171'; cx.stroke();
    cx.lineTo(cv.width, cv.height); cx.lineTo(0, cv.height); cx.fillStyle = isCr ? 'rgba(255, 255, 255, 0.05)' : 'rgba(248, 113, 113, 0.1)'; cx.fill();
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

// 5. ROULETTE
const redNum=[1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
function playRoulette() {
    let bet=getBet('rouletteBet'); if(!bet) return;
    const sBet = document.querySelector('input[name="r_bet"]:checked').value;
    updateBalance(-bet); const btn=document.getElementById('btnRoulette'), rd=document.getElementById('rouletteResult');
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

// 6. HORSE RACING
const horses = [
    {id:0,name:"bullet'n board",hex:"#dc2626"},{id:1,name:"lightning strikes thrice",hex:"#facc15"},{id:2,name:"superstitional realism",hex:"#22c55e"},{id:3,name:"door knob",hex:"#3b82f6"},
    {id:4,name:"jovial merryment",hex:"#f97316"},{id:5,name:"downtown skybox",hex:"#a855f7"},{id:6,name:"cyan",hex:"#06b6d4"},{id:7,name:"resolute mind afternoon",hex:"#ec4899"},
    {id:8,name:"comely material morning",hex:"#84cc16"},{id:9,name:"a mysterious figure",hex:"#333333"},{id:10,name:"garbage bin",hex:"#78350f"},{id:11,name:"nighttime knifemare",hex:"#1e3a8a"},
    {id:12,name:"00b",hex:"#ffffff"},{id:13,name:"00e",hex:"#6b7280"},{id:14,name:"006",hex:"#d946ef"},{id:15,name:"009",hex:"#14b8a6"}
];
let selHorseId = null, isRacing = false;
const hOpts = document.getElementById('horseOptions');
horses.forEach((h, i) => {
    let o = document.createElement('div'); o.className = 'custom-option';
    o.onclick = () => { selHorseId=i; document.getElementById('selectedHorseText').innerHTML=`<span style="text-shadow: 0 0 10px ${h.hex}">🐴</span> ${h.name}`; document.getElementById('horseOptions').classList.remove('show'); };
    o.innerHTML = `<span class="horse-preview" style="text-shadow: 0 0 10px ${h.hex}">🐴</span> ${h.name}`;
    hOpts.appendChild(o);
});
function toggleHorseDropdown(e) { e.stopPropagation(); if(!isRacing) document.getElementById('horseOptions').classList.toggle('show'); }
function startDerby() {
    if(isRacing) return; if(selHorseId === null) return alert("select a horse.");
    let bet = getBet('derbyBet'); if(!bet) return;
    updateBalance(-bet); isRacing = true; document.getElementById('btnDerby').disabled = true;
    document.getElementById('derbyStatus').innerHTML = 'they\'re off!'; document.getElementById('derbyStatus').className = 'game-status';

    let rGrp = [horses[selHorseId]];
    let pool = horses.filter(h => h.id !== selHorseId).sort(() => Math.random() - 0.5);
    rGrp.push(...pool.slice(0, 5)); rGrp.sort(() => Math.random() - 0.5); 

    let trk = document.getElementById('raceTrack'); trk.innerHTML = ''; 
    let hEls = [], pos = [];
    rGrp.forEach(h => {
        let l = document.createElement('div'); l.className = 'lane';
        l.style.background = `linear-gradient(90deg, ${h.hex}33, transparent)`; 
        let txt = document.createElement('div'); txt.className = 'lane-text'; txt.style.color = h.hex; txt.innerText = h.name;
        let e = document.createElement('div'); e.className = 'horse-emoji'; e.innerText = '🐴'; e.setAttribute('data-name', h.name); e.style.textShadow = `0 0 10px ${h.hex}, 0 0 20px ${h.hex}`; e.style.left = '0%';
        l.appendChild(txt); l.appendChild(e); trk.appendChild(l); hEls.push(e); pos.push(0);
    });

    let rAnim, ticks = 0, finOrd = [];
    function runR() {
        for(let i=0; i<6; i++) {
            if(pos[i] >= 100) continue;
            pos[i] += Math.random() * 0.8; hEls[i].style.left = Math.min(pos[i], 100) + '%';
            if(pos[i] >= 100 && !finOrd.includes(rGrp[i])) finOrd.push(rGrp[i]);
        }
        if (ticks++ % 4 === 0) sfx.tick(1, ticks);
        
        if(finOrd.length >= 2) {
            cancelAnimationFrame(rAnim); isRacing = false; document.getElementById('btnDerby').disabled = false;
            let first = finOrd[0], second = finOrd[1];
            if(first.id === selHorseId) { updateBalance(bet * 5); sfx.win(); status('derbyStatus', `${first.name} wins 1st! you won $${(bet*5).toFixed(2)} (5x)`, true); } 
            else if (second.id === selHorseId) { updateBalance(bet * 2); sfx.win(); status('derbyStatus', `${second.name} took 2nd! you won $${(bet*2).toFixed(2)} (2x)`, true); } 
            else { sfx.lose(); status('derbyStatus', `${first.name} won. your horse lost.`, false); }
        } else rAnim = requestAnimationFrame(runR);
    }
    rAnim = requestAnimationFrame(runR);
}

// 7. UNO
let unoDeck=[], unoPlayers=[], unoDiscard=null, unoColor='', unoDir=1, unoCurr=0, unoBetAmt=0, activeBotNames=[];
const uCols=['red','blue','green','yellow'], uVals=['0','1','2','3','4','5','6','7','8','9','skip','rev','+2'];
const botNamesPool = ["ace", "lucky", "bluff", "dealer", "joker", "chips", "shadow", "rusty", "shark", "rookie"];

function buildUnoDeck() {
    let d = [];
    uCols.forEach(c => { d.push({c,v:'0'}); for(let i=1;i<=9;i++){ d.push({c,v:i+''}); d.push({c,v:i+''}); } ['skip','rev','+2'].forEach(v=>{d.push({c,v}); d.push({c,v});}); });
    for(let i=0;i<4;i++){ d.push({c:'wild',v:'wild'}); d.push({c:'wild',v:'+4'}); }
    return d.sort(() => Math.random() - 0.5);
}
function sortUnoHand(hand) {
    const colRank = {red:1, blue:2, green:3, yellow:4, wild:5};
    hand.sort((a,b) => {
        if(colRank[a.c] !== colRank[b.c]) return colRank[a.c] - colRank[b.c];
        return a.v.localeCompare(b.v);
    });
}
function renderUnoCard(c, isValid=true, onClick='') {
    let cls = `uno-card uno-hand-card ${c.c} ${isValid ? 'playable' : 'disabled'}`;
    let display = c.v === 'skip' ? '⊘' : (c.v === 'rev' ? '↺' : c.v);
    return `<div class="${cls}" data-val="${display}" onclick="${onClick}"><span>${display}</span></div>`;
}

function animateBotCardPlay(card) {
    const container = document.getElementById('unoBotAnimContainer');
    let animCard = document.createElement('div');
    let display = card.v === 'skip' ? '⊘' : (card.v === 'rev' ? '↺' : card.v);
    animCard.className = `uno-card ${card.c}`;
    animCard.setAttribute('data-val', display);
    animCard.innerHTML = `<span>${display}</span>`;
    
    animCard.style.position = 'absolute'; animCard.style.transform = 'translate(-50%, 40px) scale(0.4)';
    animCard.style.opacity = '0'; animCard.style.transition = 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    container.appendChild(animCard);
    
    requestAnimationFrame(() => { requestAnimationFrame(() => {
        animCard.style.transform = 'translate(-50%, 0px) scale(0.9)'; animCard.style.opacity = '1';
    });});
    setTimeout(() => {
        animCard.style.transform = 'translate(-50%, -40px) scale(0.6)'; animCard.style.opacity = '0';
        animCard.addEventListener('transitionend', () => {
            if (animCard.parentNode === container) container.removeChild(animCard);
        });
    }, 1000);
}

function startUno() {
    let bots = parseInt(document.getElementById('unoBots').value);
    if(bots < 1 || bots > 10) return alert('choose 1-10 bots.');
    unoBetAmt = getBet('unoBet'); if(!unoBetAmt) return;
    updateBalance(-unoBetAmt);
    
    activeBotNames = botNamesPool.sort(() => Math.random() - 0.5).slice(0, bots);
    document.getElementById('unoSetup').style.display = 'none'; document.getElementById('unoGame').style.display = 'block';
    document.getElementById('unoBotAnimContainer').innerHTML = '';
    
    unoDeck = buildUnoDeck(); unoPlayers = Array.from({length: bots + 1}, () => []); 
    for(let i=0; i<7; i++) unoPlayers.forEach(p => p.push(unoDeck.pop())); 
    do { unoDiscard = unoDeck.pop(); } while(unoDiscard.c === 'wild');
    unoColor = unoDiscard.c; unoDir = 1; unoCurr = 0;
    
    sfx.cardDeal(); updateUnoUI("game started! your turn.");
}

function updateUnoUI(logText) {
    let bHtml = '';
    for(let i=1; i<unoPlayers.length; i++) {
        let name = activeBotNames[i-1] || `bot ${i}`;
        bHtml += `<div class="bot-tag ${unoCurr === i ? 'active' : ''}">${name}<span>${unoPlayers[i].length} cards</span></div>`;
    }
    document.getElementById('unoBotsStatus').innerHTML = bHtml;
    
    let dCard = document.getElementById('unoDiscardCard');
    let displayV = unoDiscard.v === 'skip' ? '⊘' : (unoDiscard.v === 'rev' ? '↺' : unoDiscard.v);
    dCard.className = `uno-card ${unoDiscard.c}`; dCard.innerHTML = `<span>${displayV}</span>`; dCard.setAttribute('data-val', displayV);
    
    let cInd = document.getElementById('unoCurrentColor');
    cInd.innerText = `color: ${unoColor}`; cInd.style.color = unoColor === 'yellow' ? '#eab308' : unoColor;

    sortUnoHand(unoPlayers[0]);
    let hHtml = '';
    unoPlayers[0].forEach((c, idx) => {
        let valid = isUnoValid(c) && unoCurr === 0;
        hHtml += renderUnoCard(c, valid, valid ? `unoPlayerPlay(${idx})` : '');
    });
    document.getElementById('unoPlayerHand').innerHTML = hHtml;
    if(logText) document.getElementById('unoTurnIndicator').innerText = logText;
}

function isUnoValid(c) { return c.c === 'wild' || c.c === unoColor || c.v === unoDiscard.v; }

function unoPlayerPlay(idx) {
    if(unoCurr !== 0) return;
    let c = unoPlayers[0][idx]; if(!isUnoValid(c)) return;
    sfx.cardDeal(); unoPlayers[0].splice(idx, 1); unoDiscard = c;
    if(c.c === 'wild') { document.getElementById('unoWildPicker').style.display = 'block'; updateUnoUI("pick a wild color"); return; }
    unoColor = c.c; processUnoEffect(c, 0);
}

function unoDrawCard() {
    if(unoCurr !== 0) return;
    if(unoDeck.length === 0) unoDeck = buildUnoDeck();
    unoPlayers[0].push(unoDeck.pop()); sfx.cardDeal();
    unoNextTurn("you drew a card.");
}

function unoResolveWild(color) {
    document.getElementById('unoWildPicker').style.display = 'none'; unoColor = color;
    processUnoEffect(unoDiscard, 0);
}

function processUnoEffect(c, playerIdx) {
    let effectLog = "";
    if(c.v === 'rev') { 
        unoDir *= -1; 
        if (unoPlayers.length === 2) { unoCurr = (unoCurr + unoDir + unoPlayers.length) % unoPlayers.length; effectLog = " (reversed back to them)"; }
    }
    if(c.v === 'skip') { unoCurr = (unoCurr + unoDir + unoPlayers.length) % unoPlayers.length; effectLog = " and skipped next player"; }
    if(c.v === '+2') {
        let t = (unoCurr + unoDir + unoPlayers.length) % unoPlayers.length;
        if(unoDeck.length < 2) unoDeck = buildUnoDeck();
        unoPlayers[t].push(unoDeck.pop(), unoDeck.pop()); effectLog = " and forced a draw 2"; 
    }
    if(c.v === '+4') {
        let t = (unoCurr + unoDir + unoPlayers.length) % unoPlayers.length;
        if(unoDeck.length < 4) unoDeck = buildUnoDeck();
        unoPlayers[t].push(unoDeck.pop(), unoDeck.pop(), unoDeck.pop(), unoDeck.pop()); effectLog = " and forced a draw 4"; 
    }
    checkUnoWin(playerIdx, effectLog);
}

function checkUnoWin(playerIdx, effectLog = "") {
    let name = playerIdx === 0 ? "you" : (activeBotNames[playerIdx-1] || `bot ${playerIdx}`);
    if(unoPlayers[playerIdx].length === 0) {
        if(playerIdx === 0) {
            let winAmt = unoBetAmt * (unoPlayers.length - 1); updateBalance(winAmt); sfx.win(); status('unoStatus', `you won! payout $${winAmt.toFixed(2)}`, true);
        } else { sfx.lose(); status('unoStatus', `${name} won. you lost.`, false); }
        document.getElementById('unoSetup').style.display = 'block'; document.getElementById('unoGame').style.display = 'none';
        return;
    }
    let playString = playerIdx === 0 ? "you played a card" : `${name} played a card`;
    unoNextTurn(`${playString}${effectLog}.`);
}

function unoNextTurn(logMsg) {
    unoCurr = (unoCurr + unoDir + unoPlayers.length) % unoPlayers.length;
    let nextName = unoCurr === 0 ? "your turn" : `${activeBotNames[unoCurr-1] || `bot ${unoCurr}`}'s turn`;
    updateUnoUI(`${logMsg} ${nextName}`);
    if(unoCurr !== 0) setTimeout(unoBotPlay, 1600); 
}

function unoBotPlay() {
    let hand = unoPlayers[unoCurr]; let vIdx = hand.findIndex(c => isUnoValid(c));
    let name = activeBotNames[unoCurr-1] || `bot ${unoCurr}`;
    if(vIdx !== -1) {
        let c = hand[vIdx]; hand.splice(vIdx, 1); unoDiscard = c;
        animateBotCardPlay(c);
        if(c.c === 'wild') {
            let counts = {red:0, blue:0, green:0, yellow:0};
            hand.forEach(hc => { if(hc.c !== 'wild') counts[hc.c]++; });
            unoColor = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
        } else unoColor = c.c;
        sfx.cardDeal(); processUnoEffect(c, unoCurr);
    } else {
        if(unoDeck.length === 0) unoDeck = buildUnoDeck();
        hand.push(unoDeck.pop()); sfx.cardDeal(); unoNextTurn(`${name} drew a card.`);
    }
}

// 8. CONNECT 4
let c4GridState = [], c4Rows = 6, c4Cols = 7, c4Target = 4, c4BetAmt = 0, isC4Active = false;

// Pre-build empty board so it is visible immediately on load
function buildC4Board() {
    let boardHTML = '';
    for(let c=0; c<c4Cols; c++) {
        let colHTML = `<div class="c4-col" onclick="c4PlayerMove(${c})">`;
        for(let r=0; r<c4Rows; r++) { colHTML += `<div class="c4-cell" id="c4-cell-${r}-${c}"></div>`; }
        colHTML += `</div>`; boardHTML += colHTML;
    }
    document.getElementById('c4BoardUI').innerHTML = boardHTML;
}
buildC4Board(); // render immediately

function startC4() {
    if(isC4Active) return;
    c4Target = parseInt(document.getElementById('c4Target').value);
    c4BetAmt = getBet('c4Bet'); if(!c4BetAmt) return;
    updateBalance(-c4BetAmt);
    
    document.getElementById('btnC4Start').disabled = true;
    document.getElementById('c4Target').disabled = true;
    document.getElementById('c4Bet').disabled = true;
    
    document.getElementById('c4Status').innerHTML = 'your turn (red).';
    document.getElementById('c4Status').className = 'game-status';
    isC4Active = true;

    // Reset logical array and visual board
    c4GridState = Array.from({length: c4Rows}, () => Array(c4Cols).fill(0));
    buildC4Board();
}

function c4DropToken(r, c, playerNum, callback) {
    let cell = document.getElementById(`c4-cell-${r}-${c}`);
    let token = document.createElement('div');
    token.className = `c4-token ${playerNum === 1 ? 'c4-red' : 'c4-yellow'}`;
    token.style.transform = 'translateY(-400px)';
    cell.appendChild(token);
    
    sfx.tick(1);
    
    requestAnimationFrame(() => { requestAnimationFrame(() => { token.style.transform = 'translateY(0px)'; }); });
    setTimeout(() => { sfx.thud(); if(callback) callback(); }, 600);
}

function c4PlayerMove(c) {
    if(!isC4Active) return;
    let r = getLowestEmptyRow(c); if(r === -1) return;
    
    isC4Active = false; 
    c4GridState[r][c] = 1;
    
    c4DropToken(r, c, 1, () => {
        if(checkC4Win(1)) {
            let mult = c4Target === 4 ? 2 : (c4Target === 5 ? 3 : 5);
            updateBalance(c4BetAmt * mult); sfx.win();
            status('c4Status', `you connect ${c4Target}! won $${(c4BetAmt * mult).toFixed(2)} (${mult}x)`, true);
            endC4();
        } else if (isC4Draw()) {
            updateBalance(c4BetAmt); sfx.tick();
            status('c4Status', 'draw! bet returned.', false); endC4();
        } else {
            document.getElementById('c4Status').innerHTML = 'bot is thinking...';
            setTimeout(c4BotMove, 500);
        }
    });
}

function c4BotMove() {
    let bestCol = -1;
    
    // 1. Can bot win?
    for(let c=0; c<c4Cols; c++) {
        let r = getLowestEmptyRow(c); if(r === -1) continue;
        c4GridState[r][c] = 2; if(checkC4Win(2)) { bestCol = c; } c4GridState[r][c] = 0;
        if(bestCol !== -1) break;
    }
    
    // 2. Can player win? (Block)
    if(bestCol === -1) {
        for(let c=0; c<c4Cols; c++) {
            let r = getLowestEmptyRow(c); if(r === -1) continue;
            c4GridState[r][c] = 1; if(checkC4Win(1)) { bestCol = c; } c4GridState[r][c] = 0;
            if(bestCol !== -1) break;
        }
    }
    
    // 3. Random fallback
    if(bestCol === -1) {
        let validCols = [];
        for(let c=0; c<c4Cols; c++) { if(getLowestEmptyRow(c) !== -1) validCols.push(c); }
        if(validCols.length > 0) bestCol = validCols[Math.floor(Math.random() * validCols.length)];
    }
    
    if(bestCol === -1) return;
    
    let r = getLowestEmptyRow(bestCol);
    c4GridState[r][bestCol] = 2;
    
    c4DropToken(r, bestCol, 2, () => {
        if(checkC4Win(2)) {
            sfx.lose(); status('c4Status', 'bot connected! you lost.', false); endC4();
        } else if (isC4Draw()) {
            updateBalance(c4BetAmt); sfx.tick(); status('c4Status', 'draw! bet returned.', false); endC4();
        } else {
            document.getElementById('c4Status').innerHTML = 'your turn (red).'; isC4Active = true;
        }
    });
}

function getLowestEmptyRow(c) {
    for(let r = c4Rows - 1; r >= 0; r--) { if(c4GridState[r][c] === 0) return r; }
    return -1;
}

function isC4Draw() {
    for(let c=0; c<c4Cols; c++) { if(c4GridState[0][c] === 0) return false; }
    return true;
}

function checkC4Win(player) {
    const dirs = [[0,1], [1,0], [1,1], [1,-1]];
    for(let r=0; r<c4Rows; r++) {
        for(let c=0; c<c4Cols; c++) {
            if(c4GridState[r][c] !== player) continue;
            for(let [dr, dc] of dirs) {
                let count = 1;
                for(let i=1; i<c4Target; i++) {
                    let nr = r + dr*i, nc = c + dc*i;
                    if(nr<0 || nr>=c4Rows || nc<0 || nc>=c4Cols || c4GridState[nr][nc] !== player) break;
                    count++;
                }
                if(count >= c4Target) return true;
            }
        }
    }
    return false;
}

function endC4() {
    isC4Active = false;
    document.getElementById('btnC4Start').disabled = false;
    document.getElementById('c4Target').disabled = false;
    document.getElementById('c4Bet').disabled = false;
}