let balance = localStorage.getItem('simpleCasinoBal') ? parseFloat(localStorage.getItem('simpleCasinoBal')) : 1000.00;

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
    tick: (pitch = 1) => playTone(400 * pitch, 'sine', 0.05, 0.1),
    thud: () => playTone(150, 'square', 0.1, 0.1),
    wheelTick: (pitch = 1) => playTone(600 * pitch, 'triangle', 0.05, 0.05),
    win: () => { playTone(400, 'square', 0.2, 0.1); setTimeout(() => playTone(600, 'square', 0.3, 0.1), 150); },
    lose: () => playTone(150, 'sawtooth', 0.4, 0.1),
    cardDeal: () => playTone(300, 'square', 0.05, 0.05),
    crashEngine: (freq) => playTone(freq, 'sawtooth', 0.1, 0.05),
    crashExplode: () => { playTone(100, 'sawtooth', 0.5, 0.2); playTone(50, 'square', 0.8, 0.2); }
};

function updateBalance(amount) {
    balance += amount;
    localStorage.setItem('simpleCasinoBal', balance.toFixed(2));
    document.getElementById('balanceDisplay').innerText = balance.toFixed(2);
    
    const el = document.querySelector('.balance-container');
    el.style.color = amount > 0 ? 'var(--win-color)' : (amount < 0 ? 'var(--lose-color)' : 'inherit');
    setTimeout(() => el.style.color = 'inherit', 400);
}
updateBalance(0);

function toggleMenu() {
    initAudio();
    document.getElementById('gameMenu').classList.toggle('show');
}
window.onclick = function(event) {
    if (!event.target.matches('.hamburger-btn')) {
        document.getElementById('gameMenu').classList.remove('show');
    }
}
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
    el.innerHTML = msg;
    el.className = 'game-status ' + (isWin ? 'win-text' : 'lose-text');
}

// --- 1. Massive Slots ---
const symbols = ['🍒', '🍋', '🍉', '🍇', '🔔', '💎', '7️⃣', '🍀', '🍎', '💰', '⭐', '🎱'];
function playSlots() {
    let bet = getBet('slotsBet');
    if (!bet) return;
    updateBalance(-bet);

    const reels = [document.getElementById('reel1'), document.getElementById('reel2'), document.getElementById('reel3')];
    document.getElementById('btnSlots').disabled = true;
    status('slotsStatus', 'spinning...', false);
    reels.forEach(r => r.style.borderColor = '#333');

    // Generate Final Results
    let results = [symbols[Math.floor(Math.random()*symbols.length)], symbols[Math.floor(Math.random()*symbols.length)], symbols[Math.floor(Math.random()*symbols.length)]];
    
    // Ticking setup per reel
    let stops = [15, 25, 35]; // How many ticks before each reel stops
    let ticks = 0;
    
    let spinInterval = setInterval(() => {
        let ticked = false;
        reels.forEach((r, i) => {
            if (ticks < stops[i]) {
                r.innerText = symbols[Math.floor(Math.random()*symbols.length)];
                ticked = true;
            } else if (ticks === stops[i]) {
                r.innerText = results[i]; // Lock in final result
                r.style.borderColor = '#fff';
                sfx.thud(); // Heavy stop sound
            }
        });
        
        if (ticked) { sfx.tick(1 + (ticks * 0.02)); }
        ticks++;

        if (ticks > stops[2]) {
            clearInterval(spinInterval);
            document.getElementById('btnSlots').disabled = false;

            if (results[0] === results[1] && results[1] === results[2]) {
                let mult = results[0] === '7️⃣' ? 100 : (results[0] === '💎' ? 50 : 10);
                updateBalance(bet * mult); sfx.win();
                status('slotsStatus', `jackpot! won $${(bet * mult).toFixed(2)} (${mult}x)`, true);
            } else if (results[0] === results[1] || results[1] === results[2] || results[0] === results[2]) {
                updateBalance(bet * 2); sfx.win();
                status('slotsStatus', `pair! won $${(bet * 2).toFixed(2)} (2x)`, true);
            } else {
                sfx.lose(); status('slotsStatus', `loss. try again.`, false);
            }
        }
    }, 80); // Ticks every 80ms for rapid visual cycling
}

// --- 2. Wheel ---
const wheelMultipliers = [0, 0.5, 1.5, 0, 2, 0.1, 3, 0.5, 1, 0, 5, 0.5, 2.5, 0, 1.2, 0.2, 4, 0.5, 0, 10];
const totalSegments = wheelMultipliers.length;
const degPerSegment = 360 / totalSegments;

const wheelEl = document.getElementById('spinWheel');
let gradientString = 'conic-gradient(';
wheelMultipliers.forEach((m, i) => {
    let color = m === 10 ? '#fff' : (m === 0 ? '#111' : (i % 2 === 0 ? '#dc2626' : '#222'));
    let startDeg = i * degPerSegment;
    let endDeg = (i + 1) * degPerSegment;
    gradientString += `${color} ${startDeg}deg ${endDeg}deg${i < totalSegments - 1 ? ',' : ''}`;
    
    let label = document.createElement('div');
    label.className = 'wheel-label';
    label.innerText = m + 'x';
    label.style.transform = `rotate(${startDeg + (degPerSegment/2) - 90}deg) translateY(-50%)`;
    if(m===10) label.style.color = '#000';
    wheelEl.appendChild(label);
});
gradientString += ')';
wheelEl.style.background = gradientString;

let currentWheelAngle = 0;
let isWheelSpinning = false;

function playWheel() {
    if(isWheelSpinning) return;
    let bet = getBet('wheelBet');
    if (!bet) return;
    updateBalance(-bet);

    isWheelSpinning = true;
    document.getElementById('btnWheel').disabled = true;
    status('wheelStatus', 'spinning...', false);

    let targetAngle = currentWheelAngle + (Math.floor(Math.random() * 5) + 5) * 360 + Math.floor(Math.random() * 360);
    let startTime = performance.now();
    let lastSegment = -1;

    function animateWheel(time) {
        let progress = Math.min((time - startTime) / 6000, 1);
        let easeOut = 1 - Math.pow(1 - progress, 3);
        let angle = currentWheelAngle + (targetAngle - currentWheelAngle) * easeOut;
        
        wheelEl.style.transform = `rotate(${angle}deg)`;
        
        let currentSegment = Math.floor(((360 - (angle % 360)) % 360) / degPerSegment);
        if (currentSegment !== lastSegment && progress > 0) {
            lastSegment = currentSegment;
            sfx.wheelTick(1.5 - progress);
        }

        if (progress < 1) requestAnimationFrame(animateWheel);
        else {
            currentWheelAngle = angle;
            isWheelSpinning = false;
            document.getElementById('btnWheel').disabled = false;
            let mult = wheelMultipliers[Math.floor(((360 - (currentWheelAngle % 360)) % 360) / degPerSegment)];
            if (mult > 0) { updateBalance(bet * mult); sfx.win(); status('wheelStatus', `won $${(bet * mult).toFixed(2)} (${mult}x)`, true); } 
            else { sfx.lose(); status('wheelStatus', 'missed.', false); }
        }
    }
    requestAnimationFrame(animateWheel);
}

// --- 3. Blackjack ---
let plrHand = [], dlrHand = [], bjCurrentBet = 0;
function getCardObj() {
    const suits = ['♥', '♦', '♣', '♠'];
    const vals = ['2','3','4','5','6','7','8','9','10','j','q','k','a'];
    let v = vals[Math.floor(Math.random() * vals.length)];
    return { val: v, suit: suits[Math.floor(Math.random() * suits.length)], num: ['j','q','k'].includes(v) ? 10 : (v === 'a' ? 11 : parseInt(v)) };
}
function renderCard(c, hidden = false) {
    let isRed = c.suit === '♥' || c.suit === '♦';
    return `<div class="playing-card ${isRed && !hidden ? 'card-red' : 'card-black'}">${hidden ? '?' : c.val + c.suit}</div>`;
}
function calcScore(hand) {
    let score = 0, aces = 0;
    hand.forEach(c => { score += c.num; if(c.val==='a') aces++; });
    while(score > 21 && aces > 0) { score -= 10; aces--; }
    return score;
}

function startBlackjack() {
    bjCurrentBet = getBet('bjBet');
    if(!bjCurrentBet) return;
    updateBalance(-bjCurrentBet);

    plrHand = [getCardObj(), getCardObj()]; dlrHand = [getCardObj(), getCardObj()];
    document.getElementById('bjBetPhase').style.display = 'none';
    document.getElementById('bjActionPhase').style.display = 'flex';
    status('bjStatus', '', true);
    
    sfx.cardDeal(); setTimeout(() => sfx.cardDeal(), 200); updateBjUI();
    if(calcScore(plrHand) === 21) handleBjEnd(true);
}
function updateBjUI(showDealer = false) {
    document.getElementById('plrCards').innerHTML = plrHand.map(c => renderCard(c)).join('');
    document.getElementById('plrScore').innerText = calcScore(plrHand);
    let dlrHtml = renderCard(dlrHand[0]);
    if(showDealer) { dlrHtml += dlrHand.slice(1).map(c => renderCard(c)).join(''); document.getElementById('dlrScore').innerText = calcScore(dlrHand); } 
    else { dlrHtml += renderCard(dlrHand[1], true); document.getElementById('dlrScore').innerText = '?'; }
    document.getElementById('dlrCards').innerHTML = dlrHtml;
}
function bjHit() {
    sfx.cardDeal(); plrHand.push(getCardObj()); updateBjUI();
    if(calcScore(plrHand) > 21) handleBjEnd();
}
function bjStand() {
    let dlrTurn = setInterval(() => {
        if (calcScore(dlrHand) < 17) { sfx.cardDeal(); dlrHand.push(getCardObj()); updateBjUI(true); } 
        else { clearInterval(dlrTurn); handleBjEnd(); }
    }, 500);
}
function handleBjEnd(isNatural = false) {
    updateBjUI(true);
    document.getElementById('bjBetPhase').style.display = 'flex';
    document.getElementById('bjActionPhase').style.display = 'none';

    let pScore = calcScore(plrHand), dScore = calcScore(dlrHand);
    if(pScore > 21) { sfx.lose(); status('bjStatus', 'bust. you lose.', false); } 
    else if (isNatural) { updateBalance(bjCurrentBet * 2.5); sfx.win(); status('bjStatus', `blackjack! won $${(bjCurrentBet * 2.5).toFixed(2)}`, true); } 
    else if (dScore > 21 || pScore > dScore) { updateBalance(bjCurrentBet * 2); sfx.win(); status('bjStatus', `you win $${(bjCurrentBet * 2).toFixed(2)}`, true); } 
    else if (pScore === dScore) { updateBalance(bjCurrentBet); sfx.tick(); status('bjStatus', 'push. bet returned.', true); } 
    else { sfx.lose(); status('bjStatus', 'dealer wins.', false); }
}

// --- 4. Crash ---
let crashMult = 1.00, crashTarget = 0, isCrashing = false, crashBet = 0, crashHistory = [], crashAnimFrame;
const canvas = document.getElementById('crashCanvas'), ctx = canvas.getContext('2d');

function drawCrashLine() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if(crashHistory.length === 0) return;
    let maxX = Math.max(crashHistory[crashHistory.length-1].t, 5000), maxY = Math.max(crashMult, 2.0);
    ctx.beginPath(); ctx.moveTo(0, canvas.height);
    for(let point of crashHistory) {
        let px = (point.t / maxX) * canvas.width;
        let py = canvas.height - ((point.m - 1) / (maxY - 1)) * (canvas.height - 40);
        ctx.lineTo(px, py);
    }
    ctx.lineWidth = 3; ctx.strokeStyle = isCrashing ? '#fff' : '#f87171'; ctx.stroke();
    ctx.lineTo(canvas.width, canvas.height); ctx.lineTo(0, canvas.height);
    ctx.fillStyle = isCrashing ? 'rgba(255, 255, 255, 0.05)' : 'rgba(248, 113, 113, 0.1)'; ctx.fill();
}

function startCrash() {
    if(isCrashing) return;
    crashBet = getBet('crashBet'); if(!crashBet) return;
    updateBalance(-crashBet);

    isCrashing = true; crashMult = 1.00; crashHistory = [];
    crashTarget = Math.max(1.00, (100 / (100 - Math.random() * 100)) * 0.99); 
    if(Math.random() < 0.05) crashTarget = 1.00; 

    document.getElementById('btnCrash').style.display = 'none';
    document.getElementById('btnCashout').style.display = 'block';
    document.getElementById('crashGraphContainer').classList.remove('crashing');
    status('crashStatus', '', true);

    let startTime = performance.now(), lastTick = startTime;
    function runCrash(time) {
        if(!isCrashing) return;
        let elapsed = time - startTime;
        crashMult = Math.pow(1.00005, elapsed); 
        crashHistory.push({t: elapsed, m: crashMult});
        document.getElementById('crashMult').innerText = crashMult.toFixed(2) + 'x';
        drawCrashLine();

        if (time - lastTick > 100) { sfx.crashEngine(100 + (crashMult * 10)); lastTick = time; }
        if(crashMult >= crashTarget) endCrash(false); else crashAnimFrame = requestAnimationFrame(runCrash);
    }
    crashAnimFrame = requestAnimationFrame(runCrash);
}
function cashoutCrash() {
    if(!isCrashing) return;
    cancelAnimationFrame(crashAnimFrame); updateBalance(crashBet * crashMult); sfx.win(); endCrash(true);
}
function endCrash(won) {
    isCrashing = false;
    document.getElementById('btnCrash').style.display = 'block'; document.getElementById('btnCashout').style.display = 'none';
    if(!won) {
        sfx.crashExplode(); document.getElementById('crashGraphContainer').classList.add('crashing');
        document.getElementById('crashMult').innerText = crashTarget.toFixed(2) + 'x'; drawCrashLine(); 
        status('crashStatus', `crashed at ${crashTarget.toFixed(2)}x`, false);
    } else {
        drawCrashLine(); status('crashStatus', `cashed out! won $${(crashBet * crashMult).toFixed(2)}`, true);
    }
}

// --- 5. Roulette ---
const redNumbers = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
function playRoulette() {
    let bet = getBet('rouletteBet'); if (!bet) return;
    const selectedBet = document.querySelector('input[name="r_bet"]:checked').value;
    updateBalance(-bet);
    
    const btn = document.getElementById('btnRoulette'); const resultDisplay = document.getElementById('rouletteResult');
    btn.disabled = true; status('rouletteStatus', 'spinning...', false);

    let ticks = 0;
    let cycle = setInterval(() => {
        resultDisplay.innerText = Math.floor(Math.random() * 37);
        resultDisplay.style.borderColor = '#333';
        sfx.tick(1 + (ticks++ * 0.05)); 
    }, 60);

    setTimeout(() => {
        clearInterval(cycle); btn.disabled = false;
        let winningNum = Math.floor(Math.random() * 37); 
        let winningColor = 'green'; let displayColor = '#059669'; 
        
        if (winningNum !== 0) {
            if (redNumbers.includes(winningNum)) { winningColor = 'red'; displayColor = '#dc2626'; } 
            else { winningColor = 'black'; displayColor = '#fff'; }
        }
        
        resultDisplay.innerText = winningNum; resultDisplay.style.borderColor = displayColor;
        
        if (selectedBet === winningColor) {
            let mult = winningColor === 'green' ? 36 : 2;
            updateBalance(bet * mult); sfx.win();
            status('rouletteStatus', `landed on ${winningNum} ${winningColor}! won $${(bet * mult).toFixed(2)}`, true);
        } else {
            sfx.lose(); status('rouletteStatus', `landed on ${winningNum} ${winningColor}. lost.`, false);
        }
    }, 2500);
}