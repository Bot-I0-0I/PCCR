let players = JSON.parse(localStorage.getItem('cricX_data')) || [];

// Migrate old data (balls to batOvers, add role)
players = players.map(p => {
    if (p.balls !== undefined && p.batOvers === undefined) {
        p.batOvers = Math.floor(p.balls / 6) + (p.balls % 6) / 10;
        delete p.balls;
    }
    if (p.highestScore === undefined) p.highestScore = 0;
    if (p.role === undefined) p.role = 'BATSMAN';
    return p;
});

let editId = null;

const playerForm = document.getElementById('playerForm');
const playerDisplay = document.getElementById('playerDisplay');
const searchBar = document.getElementById('searchBar');
const sortSelect = document.getElementById('sortSelect');
const toastContainer = document.getElementById('toastContainer');

// Toast Notification System
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        if(toast.parentElement) toast.remove();
    }, 3000);
}

const save = () => {
    localStorage.setItem('cricX_data', JSON.stringify(players));
    render(searchBar.value);
};

playerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newPlayer = {
        id: Date.now(),
        name: document.getElementById('playerName').value,
        role: document.getElementById('playerRole').value,
        batRank: document.getElementById('batRank').value,
        bowlRank: document.getElementById('bowlRank').value,
        runs: parseInt(document.getElementById('runs').value || 0),
        innings: parseInt(document.getElementById('innings').value || 0),
        batOvers: parseFloat(document.getElementById('batOvers').value || 0),
        highestScore: parseInt(document.getElementById('highestScore').value || 0),
        wickets: parseInt(document.getElementById('wickets').value || 0),
        overs: parseFloat(document.getElementById('overs').value || 0),
        conc: parseInt(document.getElementById('runsConceded').value || 0)
    };
    players.push(newPlayer);
    save();
    playerForm.reset();
    showToast(`${newPlayer.name} added to database`, 'success');
});

// Helper to convert overs to balls
function getBalls(overs) {
    return Math.floor(overs) * 6 + Math.round((overs % 1) * 10);
}

// Calculate an overall Power Rating
function calculateRating(p) {
    let rating = 0;
    const batAvg = p.innings > 0 ? p.runs / p.innings : 0;
    const batBalls = getBalls(p.batOvers || 0);
    const sr = batBalls > 0 ? (p.runs / batBalls) * 100 : 0;
    const bowlAvg = p.wickets > 0 ? p.conc / p.wickets : 0;
    const econ = p.overs > 0 ? p.conc / p.overs : 0;

    rating += batAvg * 1.5;
    rating += sr * 0.25;
    rating += (p.highestScore || 0) * 0.1;
    
    if (p.wickets > 0) {
        rating += (p.wickets * 8);
        if (bowlAvg > 0) rating += Math.max(0, (40 - bowlAvg) * 2);
        if (econ > 0) rating += Math.max(0, (10 - econ) * 5);
    }
    
    // Small role-based boosts
    if (p.role === 'ALL-ROUNDER') rating *= 1.1;
    if (p.role === 'WICKET-KEEPER') rating += 15;

    return Math.max(0, Math.round(rating));
}

function render(filter = "") {
    playerDisplay.innerHTML = '';
    let filtered = players.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()));
    
    // Apply Sorting
    const currentSort = sortSelect ? sortSelect.value : 'name';
    filtered.sort((a, b) => {
        if (currentSort === 'runs') return b.runs - a.runs;
        if (currentSort === 'wickets') return b.wickets - a.wickets;
        if (currentSort === 'rating') return calculateRating(b) - calculateRating(a);
        return a.name.localeCompare(b.name);
    });

    document.getElementById('count').innerText = filtered.length;

    filtered.forEach((p, index) => {
        const avg = p.innings > 0 ? (p.runs / p.innings).toFixed(2) : "0.00";
        const batBalls = getBalls(p.batOvers || 0);
        const sr = batBalls > 0 ? ((p.runs / batBalls) * 100).toFixed(2) : "0.00";
        const econ = p.overs > 0 ? (p.conc / p.overs).toFixed(2) : "0.00";
        
        const rating = calculateRating(p);
        let ratingTier = rating > 600 ? 'LEGEND' : rating > 400 ? 'STAR' : rating > 150 ? 'ELITE' : rating > 70 ? "PRO": 'ROOKIE';
        let tierColor = rating > 600 ? '#eab308' : rating > 400 ? '#a855f7' : rating > 150 ? '#22d3ee' : rating > 70 ? '#22d300' :'#94a3b8';

        const card = document.createElement('div');
        card.className = 'player-card';
        card.style.animationDelay = `${index * 0.05}s`; // Staggered animation
        card.innerHTML = `
            <div class="card-header">
                <div class="header-info">
                    <h3>${p.name}</h3>
                    <div class="role-badge">${p.role || 'UNKNOWN'}</div>
                    <div class="rating-badge" style="color: ${tierColor}; border-color: ${tierColor}">
                        ${ratingTier} | PWR: ${rating}
                    </div>
                </div>
                <button onclick="window.openEdit(${p.id})" class="edit-btn">EDIT</button>
            </div>
            
            <div class="split-stats">
                <div class="stat-zone">
                    <h4>BATTING</h4>
                    <div class="data-pt"><span>ICC Rank</span><span class="val">#${p.batRank}</span></div>
                    <div class="data-pt"><span>High Score</span><span class="val">${p.highestScore || 0}</span></div>
                    <div class="data-pt"><span>Average</span><span class="val">${avg}</span></div>
                    <div class="data-pt"><span>Strike Rate</span><span class="val">${sr}</span></div>
                    <div class="data-pt"><span>Overs Faced</span><span class="val">${p.batOvers || 0}</span></div>
                    <div class="data-pt"><span>Total Runs</span><span class="val">${p.runs}</span></div>
                </div>
                <div class="stat-zone">
                    <h4>BOWLING</h4>
                    <div class="data-pt"><span>ICC Rank</span><span class="val">#${p.bowlRank}</span></div>
                    <div class="data-pt"><span>Economy</span><span class="val">${econ}</span></div>
                    <div class="data-pt"><span>Wickets</span><span class="val">${p.wickets}</span></div>
                    <div class="data-pt"><span>Overs Bowled</span><span class="val">${p.overs}</span></div>
                </div>
            </div>

            <div class="card-footer">
                <span style="font-size: 0.65rem; color: var(--text-dim); font-family: 'Orbitron', sans-serif;">ID: ${p.id}</span>
                <button onclick="window.deletePlayer(${p.id})" class="delete-btn">DELETE</button>
            </div>
        `;
        playerDisplay.appendChild(card);
    });
}

// Edit Modal Functions
window.openEdit = function(id) {
    editId = id;
    const p = players.find(p => p.id === id);
    document.getElementById('editFormContainer').innerHTML = `
        <label style="font-size: 0.7rem; color: var(--accent); margin-bottom: 5px; display: block; font-weight: bold;">IDENTITY</label>
        <input type="text" id="en" class="cyber-input" value="${p.name}" style="margin-bottom: 10px;">
        
        <select id="erole" class="cyber-input" style="margin-bottom: 15px;">
            <option value="BATSMAN" ${p.role === 'BATSMAN' ? 'selected' : ''}>Batsman</option>
            <option value="BOWLER" ${p.role === 'BOWLER' ? 'selected' : ''}>Bowler</option>
            <option value="ALL-ROUNDER" ${p.role === 'ALL-ROUNDER' ? 'selected' : ''}>All-Rounder</option>
            <option value="WICKET-KEEPER" ${p.role === 'WICKET-KEEPER' ? 'selected' : ''}>Wicket-Keeper</option>
        </select>
        
        <label style="font-size: 0.7rem; color: var(--accent); margin-bottom: 5px; display: block; font-weight: bold;">RANKS (BAT / BOWL)</label>
        <div class="input-row" style="margin-bottom: 15px;">
            <input type="number" id="ebr" class="cyber-input" value="${p.batRank}">
            <input type="number" id="ebwr" class="cyber-input" value="${p.bowlRank}">
        </div>
        
        <label style="font-size: 0.7rem; color: var(--accent); margin-bottom: 5px; display: block; font-weight: bold;">BATTING (RUNS / INN / OVERS / HS)</label>
        <div class="input-row" style="margin-bottom: 15px;">
            <input type="number" id="er" class="cyber-input" value="${p.runs}">
            <input type="number" id="ei" class="cyber-input" value="${p.innings}">
            <input type="number" id="ebo" class="cyber-input" value="${p.batOvers || 0}" step="0.1">
            <input type="number" id="ehs" class="cyber-input" value="${p.highestScore || 0}">
        </div>
        
        <label style="font-size: 0.7rem; color: var(--accent); margin-bottom: 5px; display: block; font-weight: bold;">BOWLING (WKTS / OVERS / CONC)</label>
        <div class="input-row" style="margin-bottom: 15px;">
            <input type="number" id="ew" class="cyber-input" value="${p.wickets}">
            <input type="number" id="eo" class="cyber-input" value="${p.overs}" step="0.1">
            <input type="number" id="ec" class="cyber-input" value="${p.conc}">
        </div>
    `;
    document.getElementById('editModal').style.display = 'flex';
}

window.updatePlayer = function() {
    const i = players.findIndex(p => p.id === editId);
    players[i] = {
        ...players[i],
        name: document.getElementById('en').value,
        role: document.getElementById('erole').value,
        batRank: document.getElementById('ebr').value,
        bowlRank: document.getElementById('ebwr').value,
        runs: parseInt(document.getElementById('er').value || 0),
        innings: parseInt(document.getElementById('ei').value || 0),
        batOvers: parseFloat(document.getElementById('ebo').value || 0),
        highestScore: parseInt(document.getElementById('ehs').value || 0),
        wickets: parseInt(document.getElementById('ew').value || 0),
        overs: parseFloat(document.getElementById('eo').value || 0),
        conc: parseInt(document.getElementById('ec').value || 0)
    };
    window.closeModal();
    save();
    showToast('Player parameters updated', 'success');
}

window.closeModal = function() { document.getElementById('editModal').style.display = 'none'; }

window.deletePlayer = function(id) { 
    if(confirm("Are you sure you want to delete this player?")) {
        players = players.filter(p => p.id !== id); 
        save(); 
        showToast('Player deleted from database', 'error');
    }
}

// System Actions
document.getElementById('clearBtn').addEventListener('click', () => {
    if(confirm("WARNING: This will wipe the entire database. Proceed?")) {
        players = [];
        save();
        showToast('Database wiped successfully', 'error');
    }
});

document.getElementById('exportBtn').addEventListener('click', () => {
    if(players.length === 0) {
        showToast('Database is empty', 'error');
        return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(players));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "cricx_database.json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    showToast('Database exported', 'success');
});

document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('importFile').click();
});

document.getElementById('importFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if(Array.isArray(importedData)) {
                players = importedData;
                save();
                showToast('Database imported successfully', 'success');
            } else {
                showToast('Invalid file format', 'error');
            }
        } catch(err) {
            showToast('Error parsing file', 'error');
        }
    };
    reader.readAsText(file);
    this.value = ''; // reset input
});

searchBar.addEventListener('input', (e) => render(e.target.value));
if(sortSelect) sortSelect.addEventListener('change', () => render(searchBar.value));

render();
