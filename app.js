// === Функция для генерации уникальных ID ===
function generateId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

// === Функции для работы с localStorage ===

function loadData() {
  return JSON.parse(localStorage.getItem('footballData') || '{"teams":[],"players":[],"matches":[]}');
}

function saveData(data) {
  localStorage.setItem('footballData', JSON.stringify(data));
}

// === Глобальные переменные ===

let data = loadData();
let currentMatch = null; // Для хранения текущего матча при вводе голов

// === Инициализация ===

function initApp() {
  loadTeams();
  loadMatches();
  setupEventListeners();
  updateTable();
  updateStats();
}

function setupEventListeners() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
      btn.classList.add('active');
      const tabId = btn.dataset.tab + '-tab';
      document.getElementById(tabId).classList.add('active');
    });
  });

  document.getElementById('add-team').addEventListener('click', addTeam);
  document.getElementById('add-player').addEventListener('click', addPlayerInput);
  document.getElementById('save-match').addEventListener('click', showGoalModal);
  document.getElementById('export-csv').addEventListener('click', exportToCSV);

  // Модальное окно
  document.querySelector('.close').addEventListener('click', closeGoalModal);
  document.getElementById('cancel-goals').addEventListener('click', closeGoalModal);
  document.getElementById('save-goals').addEventListener('click', saveGoalsForMatch);
}

// === Команды ===

function addTeam() {
  const name = document.getElementById('team-name').value.trim();
  if (!name) return;

  const newTeam = { id: generateId(), name };
  data.teams.push(newTeam);

  // Добавляем игроков
  const playerInputs = document.querySelectorAll('.player-input input');
  playerInputs.forEach(input => {
    const playerName = input.value.trim();
    if (playerName) {
      data.players.push({ 
        id: generateId(), 
        name: playerName, 
        teamId: newTeam.id 
      });
    }
  });

  saveData(data);
  document.getElementById('team-name').value = '';
  document.getElementById('players-inputs').innerHTML = '<div class="player-input"><input type="text" placeholder="Игрок 1"><button class="remove-player">X</button></div>';
  loadTeams();
}

function addPlayerInput() {
  const container = document.getElementById('players-inputs');
  const div = document.createElement('div');
  div.className = 'player-input';
  div.innerHTML = `
    <input type="text" placeholder="Игрок ${container.children.length + 1}">
    <button class="remove-player">X</button>
  `;
  container.appendChild(div);

  div.querySelector('.remove-player').addEventListener('click', () => {
    container.removeChild(div);
  });
}

function loadTeams() {
  const select1 = document.getElementById('match-team1');
  const select2 = document.getElementById('match-team2');
  select1.innerHTML = '';
  select2.innerHTML = '';

  const list = document.getElementById('team-list');
  list.innerHTML = '';

  data.teams.forEach(team => {
    const option = document.createElement('option');
    option.value = team.id;
    option.textContent = team.name;
    select1.appendChild(option.cloneNode(true));
    select2.appendChild(option.cloneNode(true));

    const li = document.createElement('li');
    li.className = 'team-item';
    li.innerHTML = `
      <span>${team.name}</span>
      <button class="delete-btn" onclick="deleteTeam(${team.id})">Удалить</button>
    `;
    list.appendChild(li);
  });
}

function deleteTeam(id) {
  if (!confirm('Удалить команду и всех её игроков?')) return;

  data.teams = data.teams.filter(t => t.id !== id);
  data.players = data.players.filter(p => p.teamId !== id);
  saveData(data);
  loadTeams();
  updateTable();
  updateStats();
}

// === Матчи ===

function showGoalModal() {
  const team1Id = parseInt(document.getElementById('match-team1').value);
  const team2Id = parseInt(document.getElementById('match-team2').value);
  const score1 = parseInt(document.getElementById('score1').value);
  const score2 = parseInt(document.getElementById('score2').value);

  if (isNaN(score1) || isNaN(score2)) {
    alert("Введите корректный счет");
    return;
  }

  currentMatch = { team1Id, team2Id, score1, score2 };

  const modal = document.getElementById('goal-modal');
  modal.style.display = 'block';

  renderGoalEntries();
}

function renderGoalEntries() {
  const container = document.getElementById('goal-entries-container');
  container.innerHTML = '';

  const team1 = data.teams.find(t => t.id === currentMatch.team1Id);
  const team2 = data.teams.find(t => t.id === currentMatch.team2Id);

  if (!team1 || !team2) return;

  // Группа для первой команды
  const homeGroup = document.createElement('div');
  homeGroup.className = 'goal-entry-group';
  homeGroup.innerHTML = `<h4>${team1.name} (${currentMatch.score1} голов):</h4>`;
  const homePlayers = data.players.filter(p => p.teamId === team1.id);
  homePlayers.forEach(player => {
    const entry = document.createElement('div');
    entry.className = 'goal-entry';
    entry.innerHTML = `
      <label>${player.name}:</label>
      <input type="number" min="0" value="0" data-player-id="${player.id}" data-team="home">
    `;
    homeGroup.appendChild(entry);
  });
  container.appendChild(homeGroup);

  // Группа для второй команды
  const awayGroup = document.createElement('div');
  awayGroup.className = 'goal-entry-group';
  awayGroup.innerHTML = `<h4>${team2.name} (${currentMatch.score2} голов):</h4>`;
  const awayPlayers = data.players.filter(p => p.teamId === team2.id);
  awayPlayers.forEach(player => {
    const entry = document.createElement('div');
    entry.className = 'goal-entry';
    entry.innerHTML = `
      <label>${player.name}:</label>
      <input type="number" min="0" value="0" data-player-id="${player.id}" data-team="away">
    `;
    awayGroup.appendChild(entry);
  });
  container.appendChild(awayGroup);

  updateTotalGoals();
}

function updateTotalGoals() {
  const homeInputs = document.querySelectorAll('input[data-team="home"]');
  const awayInputs = document.querySelectorAll('input[data-team="away"]');

  let homeTotal = 0;
  let awayTotal = 0;

  homeInputs.forEach(input => {
    homeTotal += parseInt(input.value) || 0;
  });

  awayInputs.forEach(input => {
    awayTotal += parseInt(input.value) || 0;
  });

  document.getElementById('home-total').textContent = homeTotal;
  document.getElementById('away-total').textContent = awayTotal;
  document.getElementById('home-score').textContent = currentMatch.score1;
  document.getElementById('away-score').textContent = currentMatch.score2;

  // Подсветка, если сумма не совпадает со счетом
  document.getElementById('home-total').style.color = homeTotal === currentMatch.score1 ? 'black' : 'red';
  document.getElementById('away-total').style.color = awayTotal === currentMatch.score2 ? 'black' : 'red';
}

function saveGoalsForMatch() {
  const homeInputs = document.querySelectorAll('input[data-team="home"]');
  const awayInputs = document.querySelectorAll('input[data-team="away"]');

  let homeTotal = 0;
  let awayTotal = 0;

  homeInputs.forEach(input => {
    homeTotal += parseInt(input.value) || 0;
  });

  awayInputs.forEach(input => {
    awayTotal += parseInt(input.value) || 0;
  });

  if (homeTotal !== currentMatch.score1 || awayTotal !== currentMatch.score2) {
    alert("Сумма голов не совпадает со счетом матча!");
    return;
  }

  const goals = [];

  // Собираем голы для первой команды
  homeInputs.forEach(input => {
    const playerId = parseInt(input.dataset.playerId);
    const goalsCount = parseInt(input.value);

    if (isNaN(playerId) || playerId <= 0) {
      console.error("Некорректный ID игрока:", input);
      return;
    }

    for (let i = 0; i < goalsCount; i++) {
      goals.push(playerId);
    }
  });

  // Собираем голы для второй команды
  awayInputs.forEach(input => {
    const playerId = parseInt(input.dataset.playerId);
    const goalsCount = parseInt(input.value);

    if (isNaN(playerId) || playerId <= 0) {
      console.error("Некорректный ID игрока:", input);
      return;
    }

    for (let i = 0; i < goalsCount; i++) {
      goals.push(playerId);
    }
  });

  const newMatch = {
    id: generateId(),
    team1Id: currentMatch.team1Id,
    team2Id: currentMatch.team2Id,
    score1: currentMatch.score1,
    score2: currentMatch.score2,
    goals: goals,
    date: new Date()
  };

  data.matches.push(newMatch);
  saveData(data);

  closeGoalModal();
  loadMatches();
  updateTable();
  updateStats();
}

function closeGoalModal() {
  document.getElementById('goal-modal').style.display = 'none';
  currentMatch = null;
}

function loadMatches() {
  const list = document.getElementById('match-list');
  list.innerHTML = '';

  data.matches.forEach(match => {
    const team1 = data.teams.find(t => t.id === match.team1Id);
    const team2 = data.teams.find(t => t.id === match.team2Id);

    if (!team1 || !team2) return;

    const li = document.createElement('li');
    li.textContent = `${team1.name} ${match.score1} - ${match.score2} ${team2.name}`;

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Удалить';
    deleteBtn.className = 'delete-btn';
    deleteBtn.onclick = () => deleteMatch(match.id);

    li.appendChild(deleteBtn);
    list.appendChild(li);
  });
}

function deleteMatch(id) {
  if (!confirm('Удалить матч?')) return;

  data.matches = data.matches.filter(m => m.id !== id);
  saveData(data);
  loadMatches();
  updateTable();
  updateStats();
}

// === Таблица ===

function updateTable() {
  const teamsMap = {};

  data.teams.forEach(team => {
    teamsMap[team.id] = {
      id: team.id,
      name: team.name,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0
    };
  });

  data.matches.forEach(m => {
    const t1 = teamsMap[m.team1Id];
    const t2 = teamsMap[m.team2Id];

    if (t1 && t2) {
      t1.played++;
      t2.played++;

      t1.goalsFor += m.score1;
      t1.goalsAgainst += m.score2;
      t2.goalsFor += m.score2;
      t2.goalsAgainst += m.score1;

      if (m.score1 > m.score2) {
        t1.wins++;
        t2.losses++;
      } else if (m.score1 < m.score2) {
        t1.losses++;
        t2.wins++;
      } else {
        t1.draws++;
        t2.draws++;
      }
    }
  });

  const teamList = Object.values(teamsMap);

  teamList.sort((a, b) => {
    const pointsA = a.wins * 3 + a.draws;
    const pointsB = b.wins * 3 + b.draws;
    if (pointsA !== pointsB) return pointsB - pointsA;
    const diffA = a.goalsFor - a.goalsAgainst;
    const diffB = b.goalsFor - b.goalsAgainst;
    return diffB - diffA;
  });

  const tbody = document.querySelector('#championship-table tbody');
  tbody.innerHTML = '';

  teamList.forEach(team => {
    const points = team.wins * 3 + team.draws;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${team.name}</td>
      <td>${team.played}</td>
      <td>${team.wins}</td>
      <td>${team.draws}</td>
      <td>${team.losses}</td>
      <td>${team.goalsFor}</td>
      <td>${team.goalsAgainst}</td>
      <td>${team.goalsFor - team.goalsAgainst}</td>
      <td class="points">${points}</td>
    `;
    tbody.appendChild(tr);
  });
}

// === Статистика бомбардиров ===

function updateStats() {
  const goalsCount = {};

  // Собираем статистику по забитым мячам
  data.matches.forEach(match => {
    match.goals.forEach(playerId => {
      goalsCount[playerId] = (goalsCount[playerId] || 0) + 1;
    });
  });

  const tbody = document.querySelector('#stats-table tbody');
  tbody.innerHTML = '';

  // Собираем статистику игроков с их командами
  const playerStats = [];

  data.players.forEach(player => {
    const goals = goalsCount[player.id] || 0;
    // Показываем только тех, кто забил хотя бы 1 гол
    if (goals > 0) {
      const team = data.teams.find(t => t.id === player.teamId);
      playerStats.push({
        id: player.id,
        name: player.name,
        teamName: team ? team.name : 'N/A',
        goals: goals
      });
    }
  });

  // Сортируем по количеству голов (по убыванию)
  playerStats.sort((a, b) => b.goals - a.goals);

  // Заполняем таблицу
  playerStats.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.name}</td>
      <td>${p.teamName}</td>
      <td>${p.goals}</td>
    `;
    tbody.appendChild(tr);
  });
}

// === Экспорт в CSV ===

function exportToCSV() {
  const table = document.getElementById('championship-table');
  let csv = [];
  const rows = table.querySelectorAll('tr');

  for (let i = 0; i < rows.length; i++) {
    const row = [], cols = rows[i].querySelectorAll('th, td');
    for (let j = 0; j < cols.length; j++) {
      row.push('"' + cols[j].innerText + '"');
    }
    csv.push(row.join(','));
  }

  const csvFile = new Blob([csv.join('\n')], { type: 'text/csv' });
  const downloadLink = document.createElement('a');
  downloadLink.download = 'table.csv';
  downloadLink.href = window.URL.createObjectURL(csvFile);
  downloadLink.click();
}

// === Запуск приложения ===

initApp();

// Обновление суммы голов при изменении полей
document.addEventListener('input', function(e) {
  if (e.target.matches('input[data-team]')) {
    updateTotalGoals();
  }
});