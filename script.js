// --- Core System ---
let balance = localStorage.getItem('classicCasinoBalance') ? parseFloat(localStorage.getItem('classicCasinoBalance')) : 1000.00;

function updateBalance(amount) {
    balance += amount;
    localStorage.setItem('classicCasinoBalance', balance.toFixed(2));
    document.getElementById('balanceDisplay').innerText = balance.toFixed(2);
    
    // Pulse effect
    const el = document.querySelector('.balance-container');
    el.style.transform = amount > 0 ? 'scale(1.05)' : 'scale(0.95)';
    el.style.borderColor = amount > 0 ? '#10b981' : '#dc2626';
    setTimeout(() => {
        el.style.transform = 'scale(1)';
        el.style.borderColor = 'var(--gold)';
    }, 300);
}

// Init balance on load
updateBalance(0);

function openGame(id) {
    document.querySelectorAll('.game-view, #lobby').forEach(el => el.classList.remove('active-view'));
    document.getElementById(id).classList.add('active-view');
}

function showLobby() {
    openGame('lobby');
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
    document.getElementById('slotsStatus').innerText = "Spinning...";

    setTimeout(() => {
        let results = [symbols[Math.floor(Math.random()*symbols.length)], symbols[Math.floor(Math.random()*symbols.length)], symbols[Math.floor(Math.random()*symbols.length)]];
        
        reels.forEach((r, i) => { r.classList.remove('spinning'); r.innerText = results[i]; });
        document.getElementById('btnSlots').disabled = false;

        if (results[0] === results[1] && results[1] === results[2]) {
            let mult = results[0] === '7️⃣' ? 50 : (results[0] === '💎' ? 20 : 5);
            updateBalance(bet * mult);
            status('slotsStatus', `JACKPOT! Won $${(bet * mult).toFixed(2)} (${mult}x)`, true);
        } else if (results[0] === results[1] || results[1] === results[2] || results[0] === results[2]) {
            updateBalance(bet * 1.5);
            status('slotsStatus', `Pair! Won $${(bet * 1.5).toFixed(2)} (1.5x)`, true);
        } else {
            status('slotsStatus', `Loss. Better luck next spin.`, false);
        }
    }, 1000);
}

// --- 2. Wheel ---
let currentRotation = 0;
function playWheel() {
    let bet = getBet('wheelBet');
    if (!bet) return;
    updateBalance(-bet);

    const btn = document.getElementById('btnWheel');
    const wheel = document.getElementById('spinWheel');
    btn.disabled = true;
    status('wheelStatus', 'Spinning...', false);

    let spins = Math.floor(Math.random() * 5) + 5; 
    let degrees = Math.floor(Math.random() * 360);
    currentRotation += (spins * 360) + degrees;
    
    wheel.style.transform = `rotate(${currentRotation}deg)`;

    setTimeout(() => {
        btn.disabled = false;
        let actualDeg = currentRotation % 360;
        let mults = [2, 0, 3, 0, 5, 0, 2, 10]; // Rough alignment for 8 segments
        let segment = Math.floor((360 - actualDeg + 22.5) % 360 / 45);
        let mult = mults[segment] || 0;

        if (mult > 0) {
            updateBalance(bet * mult);
            status('wheelStatus', `Won $${(bet * mult).toFixed(2)}! (${mult}x)`, true);
        } else {
            status('wheelStatus', 'Missed! Try again.', false);
        }
    }, 4000);
}

// --- 3. Blackjack ---
let plrHand = [], dlrHand = [], bjCurrentBet = 0;

function getCardObj() {
    const suits = ['♥', '♦', '♣', '♠'];
    const vals = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
    let v = vals[Math.floor(Math.random() * vals.length)];
    let s = suits[Math.floor(Math.random() * suits.length)];
    return { val: v, suit: s, num: ['J','Q','K'].includes(v) ? 10 : (v === 'A' ? 11 : parseInt(v)) };
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
    plrHand.push(getCardObj());
    updateBjUI();
    if(calcScore(plrHand) > 21) handleBjEnd();
}

function bjStand() {
    while(calcScore(dlrHand) < 17) dlrHand.push(getCardObj());
    handleBjEnd();
}

function handleBjEnd(isNatural = false) {
    updateBjUI(true);
    document.getElementById('bjBetPhase').style.display = 'flex';
    document.getElementById('bjActionPhase').style.display = 'none';

    let pScore = calcScore(plrHand);
    let dScore = calcScore(dlrHand);

    if(pScore > 21) {
        status('bjStatus', 'Bust! You lose.', false);
    } else if (isNatural) {
        updateBalance(bjCurrentBet * 2.5);
        status('bjStatus', `BLACKJACK! Won $${(bjCurrentBet * 2.5).toFixed(2)}`, true);
    } else if (dScore > 21 || pScore > dScore) {
        updateBalance(bjCurrentBet * 2);
        status('bjStatus', `You win $${(bjCurrentBet * 2).toFixed(2)}!`, true);
    } else if (pScore === dScore) {
        updateBalance(bjCurrentBet);
        status('bjStatus', 'Push. Bet returned.', true);
    } else {
        status('bjStatus', 'Dealer wins.', false);
    }
}

// --- 4. Crash ---
let crashMult = 1.00, crashTarget = 0, crashInterval, crashBet = 0, isCrashing = false;

function startCrash() {
    if(isCrashing) return;
    crashBet = getBet('crashBet');
    if(!crashBet) return;
    updateBalance(-crashBet);

    isCrashing = true;
    crashMult = 1.00;
    const e = 100;
    crashTarget = Math.max(1.00, (e / (e - Math.random() * e)) * 0.99); 
    if(Math.random() < 0.05) crashTarget = 1.00; 

    document.getElementById('btnCrash').style.display = 'none';
    document.getElementById('btnCashout').style.display = 'block';
    document.getElementById('crashGraph').classList.remove('crashing');
    status('crashStatus', '', true);

    crashInterval = setInterval(() => {
        crashMult += 0.01 * crashMult; 
        document.getElementById('crashMult').innerText = crashMult.toFixed(2) + 'x';
        
        if(crashMult >= crashTarget) {
            clearInterval(crashInterval);
            endCrash(false);
        }
    }, 50);
}

function cashoutCrash() {
    if(!isCrashing) return;
    clearInterval(crashInterval);
    updateBalance(crashBet * crashMult);
    endCrash(true);
}

function endCrash(won) {
    isCrashing = false;
    document.getElementById('btnCrash').style.display = 'block';
    document.getElementById('btnCashout').style.display = 'none';
    
    if(!won) {
        document.getElementById('crashGraph').classList.add('crashing');
        document.getElementById('crashMult').innerText = crashTarget.toFixed(2) + 'x';
        status('crashStatus', `Crashed at ${crashTarget.toFixed(2)}x`, false);
    } else {
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

    let cycle = setInterval(() => {
        resultDisplay.innerText = Math.floor(Math.random() * 37);
        resultDisplay.style.backgroundColor = '#111';
    }, 50);

    setTimeout(() => {
        clearInterval(cycle);
        btn.disabled = false;
        resultDisplay.classList.remove('spinning');
        
        let winningNum = Math.floor(Math.random() * 37); // 0 to 36
        let winningColor = 'green';
        let displayColor = '#047857'; // Green
        
        if (winningNum !== 0) {
            if (redNumbers.includes(winningNum)) {
                winningColor = 'red';
                displayColor = '#dc2626'; // Red
            } else {
                winningColor = 'black';
                displayColor = '#111'; // Black
            }
        }
        
        resultDisplay.innerText = winningNum;
        resultDisplay.style.backgroundColor = displayColor;
        
        if (selectedBet === winningColor) {
            let mult = winningColor === 'green' ? 36 : 2;
            updateBalance(bet * mult);
            status('rouletteStatus', `Landed on ${winningNum} ${winningColor.toUpperCase()}! You won $${(bet * mult).toFixed(2)}`, true);
        } else {
            status('rouletteStatus', `Landed on ${winningNum} ${winningColor.toUpperCase()}. You lost.`, false);
        }
        
    }, 2000);
}