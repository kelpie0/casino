// --- Core System & Audio ---
let balance = localStorage.getItem('classicCasinoBalance') ? parseFloat(localStorage.getItem('classicCasinoBalance')) : 1000.00;

// Web Audio API Context (Initialized on user interaction)
let audioCtx;
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
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

// Procedural Sound Library
const sfx = {
    tick: (pitch = 1) => playTone(300 * pitch, 'sine', 0.05, 0.2),
    wheelTick: (pitch = 1) => playTone(500 * pitch, 'triangle', 0.05, 0.1),
    win: () => { playTone(400, 'square', 0.2, 0.1); setTimeout(() => playTone(600, 'square', 0.3, 0.1), 150); setTimeout(() => playTone(800, 'square', 0.5, 0.1), 300); },
    lose: () => playTone(150, 'sawtooth', 0.6, 0.1),
    cardDeal: () => playTone(350, 'square', 0.05, 0.05),
    crashEngine: (freq) => playTone(freq, 'sawtooth', 0.1, 0.05),
    crashExplode: () => { playTone(100, 'sawtooth', 0.5, 0.3); playTone(50, 'square', 0.8, 0.3); }
};

function updateBalance(amount) {
    balance += amount;
    localStorage.setItem('classicCasinoBalance', balance.toFixed(2));
    document.getElementById('balanceDisplay').innerText = balance.toFixed(2);
    
    const el = document.querySelector('.balance-container');
    el.style.transform = amount > 0 ? 'scale(1.05)' : 'scale(0.95)';
    el.style.borderColor = amount > 0 ? '#10b981' : '#dc2626';
    setTimeout(() => {
        el.style.transform = 'scale(1)';
        el.style.borderColor = 'var(--gold)';
    }, 300);
}
updateBalance(0);

// --- Navigation ---
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
    if (val > balance) { alert("Insufficient funds!"); return false; }
    return val;
}
function status(id, msg, isWin) {
    const el = document.getElementById(id);
    el.innerHTML = msg;
    el.className = 'game-status ' + (isWin ? 'win-text' : 'lose-text');
}

// --- 1. Slots ---
const symbols = ['🍒', '🍋', '🍉', '🍇', '🔔', '💎', '7️⃣'];
function playSlots() {
    let bet = getBet('slotsBet');
    if (!bet) return;
    updateBalance(-bet);

    const reels = [document.getElementById('reel1'), document.getElementById('reel2'), document.getElementById('reel3')];
    reels.forEach(r => r.classList.add('spinning'));
    document.getElementById('btnSlots').disabled = true;
    status('slotsStatus', 'Spinning...', false);

    let ticks = 0;
    let tickInterval = setInterval(() => { sfx.tick(1 + (ticks++ * 0.02)); }, 100);

    setTimeout(() => {
        clearInterval(tickInterval);
        let results = [symbols[Math.floor(Math.random()*symbols.length)], symbols[Math.floor(Math.random()*symbols.length)], symbols[Math.floor(Math.random()*symbols.length)]];
        
        reels.forEach((r, i) => { r.classList.remove('spinning'); r.innerText = results[i]; sfx.cardDeal(); });
        document.getElementById('btnSlots').disabled = false;

        if (results[0] === results[1] && results[1] === results[2]) {
            let mult = results[0] === '7️⃣' ? 50 : (results[0] === '💎' ? 20 : 5);
            updateBalance(bet * mult); sfx.win();
            status('slotsStatus', `JACKPOT! Won $${(bet * mult).toFixed(2)} (${mult}x)`, true);
        } else if (results[0] === results[1] || results[1] === results[2] || results[0] === results[2]) {
            updateBalance(bet * 1.5); sfx.win();
            status('slotsStatus', `Pair! Won $${(bet * 1.5).toFixed(2)} (1.5x)`, true);
        } else {
            sfx.lose(); status('slotsStatus', `Loss. Better luck next spin.`, false);
        }
    }, 1500);
}

// --- 2. Wheel of Fortune ---
// 20 segments, ranging from 0 to 10
const wheelMultipliers = [0, 0.5, 1.5, 0, 2, 0.1, 3, 0.5, 1, 0, 5, 0.5, 2.5, 0, 1.2, 0.2, 4, 0.5, 0, 10];
const totalSegments = wheelMultipliers.length;
const degPerSegment = 360 / totalSegments;

// Setup Wheel UI
const wheelEl = document.getElementById('spinWheel');
let gradientString = 'conic-gradient(';
wheelMultipliers.forEach((m, i) => {
    let color = m === 10 ? 'var(--gold)' : (m === 0 ? '#111' : (i % 2 === 0 ? 'var(--red-classic)' : '#222'));
    let startDeg = i * degPerSegment;
    let endDeg = (i + 1) * degPerSegment;
    gradientString += `${color} ${startDeg}deg ${endDeg}deg${i < totalSegments - 1 ? ',' : ''}`;
    
    // Add text label
    let label = document.createElement('div');
    label.className = 'wheel-label';
    label.innerText = m + 'x';
    // Offset by half segment to center text, adjust rotation to face center
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
    status('wheelStatus', 'Spinning...', false);

    let spins = Math.floor(Math.random() * 5) + 5; 
    let targetAngle = currentWheelAngle + (spins * 360) + Math.floor(Math.random() * 360);
    
    let startTime = performance.now();
    let duration = 6000;
    let lastSegmentPassed = -1;

    function animateWheel(time) {
        let elapsed = time - startTime;
        let progress = Math.min(elapsed / duration, 1);
        
        // Easing: cubic ease out
        let easeOut = 1 - Math.pow(1 - progress, 3);
        let angle = currentWheelAngle + (targetAngle - currentWheelAngle) * easeOut;
        
        wheelEl.style.transform = `rotate(${angle}deg)`;

        // Calculate which segment is under the top pointer
        // If we rotate clockwise (+), pointer moves counter-clockwise relative to wheel
        let normalizedAngle = (360 - (angle % 360)) % 360; 
        let currentSegment = Math.floor(normalizedAngle / degPerSegment);
        
        if (currentSegment !== lastSegmentPassed && progress > 0) {
            lastSegmentPassed = currentSegment;
            // Pitch gets slightly lower as it slows down
            let speedPitch = 1.5 - progress;
            sfx.wheelTick(speedPitch);
        }

        if (progress < 1) {
            requestAnimationFrame(animateWheel);
        } else {
            currentWheelAngle = angle;
            isWheelSpinning = false;
            document.getElementById('btnWheel').disabled = false;
            
            let finalSegment = Math.floor(((360 - (currentWheelAngle % 360)) % 360) / degPerSegment);
            let mult = wheelMultipliers[finalSegment];

            if (mult > 0) {
                updateBalance(bet * mult); sfx.win();
                status('wheelStatus', `Won $${(bet * mult).toFixed(2)}! (${mult}x)`, true);
            } else {
                sfx.lose(); status('wheelStatus', 'Missed! Try again.', false);
            }
        }
    }
    requestAnimationFrame(animateWheel);
}

// --- 3. Blackjack ---
let plrHand = [], dlrHand = [], bjCurrentBet = 0;

function getCardObj() {
    const suits = ['♥', '♦', '♣', '♠'];
    const vals = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
    let v = vals[Math.floor(Math.random() * vals.length)];
    return { val: v, suit: suits[Math.floor(Math.random() * suits.length)], num: ['J','Q','K'].includes(v) ? 10 : (v === 'A' ? 11 : parseInt(v)) };
}
function renderCard(c, hidden = false) {
    let isRed = c.suit === '♥' || c.suit === '♦';
    return `<div class="playing-card ${isRed && !hidden ? 'card-red' : 'card-black'}">${hidden ? '?' : c.val + c.suit}</div>`;
}
function calcScore(hand) {
    let score = 0, aces = 0;
    hand.forEach(c => { score += c.num; if(c.val==='A') aces++; });
    while(score > 21 && aces > 0) { score -= 10; aces--; }
    return score;
}

function startBlackjack() {
    bjCurrentBet = getBet('bjBet');
    if(!bjCurrentBet) return;
    updateBalance(-bjCurrentBet);

    plrHand = [getCardObj(), getCardObj()];
    dlrHand = [getCardObj(), getCardObj()];
    
    document.getElementById('bjBetPhase').style.display = 'none';
    document.getElementById('bjActionPhase').style.display = 'flex';
    status('bjStatus', '', true);
    
    sfx.cardDeal();
    setTimeout(() => sfx.cardDeal(), 200);
    updateBjUI();

    if(calcScore(plrHand) === 21) handleBjEnd(true);
}

function updateBjUI(showDealer = false) {
    document.getElementById('plrCards').innerHTML = plrHand.map(c => renderCard(c)).join('');
    document.getElementById('plrScore').innerText = calcScore(plrHand);

    let dlrHtml = renderCard(dlrHand[0]);
    if(showDealer) {
        dlrHtml += dlrHand.slice(1).map(c => renderCard(c)).join('');
        document.getElementById('dlrScore').innerText = calcScore(dlrHand);
    } else {
        dlrHtml += renderCard(dlrHand[1], true);
        document.getElementById('dlrScore').innerText = '?';
    }
    document.getElementById('dlrCards').innerHTML = dlrHtml;
}

function bjHit() {
    sfx.cardDeal();
    plrHand.push(getCardObj());
    updateBjUI();
    if(calcScore(plrHand) > 21) handleBjEnd();
}

function bjStand() {
    let dlrTurn = setInterval(() => {
        if (calcScore(dlrHand) < 17) {
            sfx.cardDeal();
            dlrHand.push(getCardObj());
            updateBjUI(true);
        } else {
            clearInterval(dlrTurn);
            handleBjEnd();
        }
    }, 500);
}

function handleBjEnd(isNatural = false) {
    updateBjUI(true);
    document.getElementById('bjBetPhase').style.display = 'flex';
    document.getElementById('bjActionPhase').style.display = 'none';

    let pScore = calcScore(plrHand), dScore = calcScore(dlrHand);

    if(pScore > 21) {
        sfx.lose(); status('bjStatus', 'Bust! You lose.', false);
    } else if (isNatural) {
        updateBalance(bjCurrentBet * 2.5); sfx.win();
        status('bjStatus', `BLACKJACK! Won $${(bjCurrentBet * 2.5).toFixed(2)}`, true);
    } else if (dScore > 21 || pScore > dScore) {
        updateBalance(bjCurrentBet * 2); sfx.win();
        status('bjStatus', `You win $${(bjCurrentBet * 2).toFixed(2)}!`, true);
    } else if (pScore === dScore) {
        updateBalance(bjCurrentBet); sfx.tick();
        status('bjStatus', 'Push. Bet returned.', true);
    } else {
        sfx.lose(); status('bjStatus', 'Dealer wins.', false);
    }
}

// --- 4. Crash (with Dynamic Canvas Chart) ---
let crashMult = 1.00, crashTarget = 0, isCrashing = false, crashBet = 0;
let crashHistory = [];
let crashAnimFrame;
const canvas = document.getElementById('crashCanvas');
const ctx = canvas.getContext('2d');

function drawCrashLine() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if(crashHistory.length === 0) return;

    let maxX = Math.max(crashHistory[crashHistory.length-1].t, 5000);
    let maxY = Math.max(crashMult, 2.0);

    ctx.beginPath();
    ctx.moveTo(0, canvas.height);

    for(let point of crashHistory) {
        let px = (point.t / maxX) * canvas.width;
        let py = canvas.height - ((point.m - 1) / (maxY - 1)) * (canvas.height - 20); // 20px padding top
        ctx.lineTo(px, py);
    }

    ctx.lineWidth = 4;
    ctx.strokeStyle = isCrashing ? 'var(--gold)' : 'var(--red-classic)';
    ctx.shadowBlur = 15;
    ctx.shadowColor = isCrashing ? 'var(--gold)' : 'var(--red-classic)';
    ctx.stroke();

    // Fill under graph
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.fillStyle = isCrashing ? 'rgba(251, 191, 36, 0.1)' : 'rgba(220, 38, 38, 0.1)';
    ctx.fill();
}

function startCrash() {
    if(isCrashing) return;
    crashBet = getBet('crashBet');
    if(!crashBet) return;
    updateBalance(-crashBet);

    isCrashing = true;
    crashMult = 1.00;
    crashHistory = [];
    
    const e = 100;
    crashTarget = Math.max(1.00, (e / (e - Math.random() * e)) * 0.99); 
    if(Math.random() < 0.05) crashTarget = 1.00; 

    document.getElementById('btnCrash').style.display = 'none';
    document.getElementById('btnCashout').style.display = 'block';
    document.getElementById('crashGraphContainer').classList.remove('crashing');
    status('crashStatus', '', true);

    let startTime = performance.now();
    let lastTickTime = startTime;

    function runCrash(time) {
        if(!isCrashing) return;
        let elapsed = time - startTime;
        
        // Exponential growth formula
        crashMult = Math.pow(1.00005, elapsed); 
        
        crashHistory.push({t: elapsed, m: crashMult});
        document.getElementById('crashMult').innerText = crashMult.toFixed(2) + 'x';
        drawCrashLine();

        // Sound Engine Pitch goes up as multiplier goes up
        if (time - lastTickTime > 100) {
            sfx.crashEngine(100 + (crashMult * 10));
            lastTickTime = time;
        }

        if(crashMult >= crashTarget) {
            endCrash(false);
        } else {
            crashAnimFrame = requestAnimationFrame(runCrash);
        }
    }
    crashAnimFrame = requestAnimationFrame(runCrash);
}

function cashoutCrash() {
    if(!isCrashing) return;
    cancelAnimationFrame(crashAnimFrame);
    updateBalance(crashBet * crashMult);
    sfx.win();
    endCrash(true);
}

function endCrash(won) {
    isCrashing = false;
    document.getElementById('btnCrash').style.display = 'block';
    document.getElementById('btnCashout').style.display = 'none';
    
    if(!won) {
        sfx.crashExplode();
        document.getElementById('crashGraphContainer').classList.add('crashing');
        document.getElementById('crashMult').innerText = crashTarget.toFixed(2) + 'x';
        drawCrashLine(); // Draw one last time to turn red
        status('crashStatus', `Crashed at ${crashTarget.toFixed(2)}x`, false);
    } else {
        drawCrashLine(); // Stops expanding
        status('crashStatus', `Cashed out! Won $${(crashBet * crashMult).toFixed(2)}`, true);
    }
}

// --- 5. Roulette ---
const redNumbers = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];

function playRoulette() {
    let bet = getBet('rouletteBet');
    if (!bet) return;
    
    const selectedBet = document.querySelector('input[name="r_bet"]:checked').value;
    updateBalance(-bet);
    
    const btn = document.getElementById('btnRoulette');
    const resultDisplay = document.getElementById('rouletteResult');
    
    btn.disabled = true;
    resultDisplay.classList.add('spinning');
    status('rouletteStatus', 'Spinning the wheel...', false);

    let ticks = 0;
    let cycle = setInterval(() => {
        resultDisplay.innerText = Math.floor(Math.random() * 37);
        resultDisplay.style.backgroundColor = '#111';
        sfx.tick(1 + (ticks++ * 0.05)); // ascending tick
    }, 50);

    setTimeout(() => {
        clearInterval(cycle);
        btn.disabled = false;
        resultDisplay.classList.remove('spinning');
        
        let winningNum = Math.floor(Math.random() * 37); 
        let winningColor = 'green';
        let displayColor = '#047857'; 
        
        if (winningNum !== 0) {
            if (redNumbers.includes(winningNum)) { winningColor = 'red'; displayColor = '#dc2626'; } 
            else { winningColor = 'black'; displayColor = '#111'; }
        }
        
        resultDisplay.innerText = winningNum;
        resultDisplay.style.backgroundColor = displayColor;
        
        if (selectedBet === winningColor) {
            let mult = winningColor === 'green' ? 36 : 2;
            updateBalance(bet * mult); sfx.win();
            status('rouletteStatus', `Landed on ${winningNum} ${winningColor.toUpperCase()}! You won $${(bet * mult).toFixed(2)}`, true);
        } else {
            sfx.lose();
            status('rouletteStatus', `Landed on ${winningNum} ${winningColor.toUpperCase()}. You lost.`, false);
        }
    }, 2500);
}