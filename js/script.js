const API_URL = "https://script.google.com/macros/s/AKfycbxyd2DlgoQCvxOBQO5pWGoUFbj9tbgu-hx1Il1cpZBc2XeQlm2lC--QNrdhxbVmlzGPkA/exec";
const BUDGET_PER_TEAM = 10000000; // ₹1 Cr default budget

let allPlayers = [];
let allTeams = [];

// ─── TOAST ───
function showToast(msg, isError = false) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.className = isError ? "error show" : "show";
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.className = "", 3000);
}

// ─── FETCH PLAYERS ───
function fetchData() {
  const tbody = document.getElementById("tableBody");
  if (!tbody) return;

  tbody.innerHTML = `
    <tr><td colspan="5">
      <div class="loading-state">
        <div class="spinner"></div>
        <div>Loading players...</div>
      </div>
    </td></tr>`;

  fetch(API_URL)
    .then(res => res.json())
    .then(data => {
      allPlayers = data.slice(1); // skip header row
      renderTable(allPlayers);
      updateStats(allPlayers);
    })
    .catch(() => {
      tbody.innerHTML = `
        <tr><td colspan="5">
          <div class="empty-state">
            <div class="empty-icon">⚠️</div>
            <div class="empty-title">Failed to load players</div>
            <div class="empty-sub">Check your internet connection and try again.</div>
          </div>
        </td></tr>`;
      showToast("Failed to load players", true);
    });
}

// ─── RENDER TABLE ───
function renderTable(players) {
  const tbody = document.getElementById("tableBody");
  if (!tbody) return;

  if (!players || players.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="5">
        <div class="empty-state">
          <div class="empty-icon">🏏</div>
          <div class="empty-title">No players found</div>
          <div class="empty-sub">Add your first player using the form above.</div>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = players.map(row => `
    <tr>
      <td>${row[0]}</td>
      <td class="player-name">${row[1]}</td>
      <td><span class="team-badge">${row[2]}</span></td>
      <td class="price-tag">₹ ${Number(row[3]).toLocaleString('en-IN')}</td>
      <td>
        <div class="actions">
          <button class="btn btn-warning btn-sm" onclick="editData(${row[0]}, '${escapeQuotes(row[1])}', '${escapeQuotes(row[2])}', ${row[3]})">✏️ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteData(${row[0]})">🗑️ Delete</button>
        </div>
      </td>
    </tr>`).join("");
}

function escapeQuotes(str) {
  return String(str).replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// ─── UPDATE STATS ───
function updateStats(players) {
  const totalEl = document.getElementById("stat-total");
  const spentEl = document.getElementById("stat-spent");
  const teamsEl = document.getElementById("stat-teams");

  if (!players) return;

  const total = players.length;
  const spent = players.reduce((sum, r) => sum + Number(r[3] || 0), 0);
  const teams = new Set(players.map(r => r[2]).filter(Boolean)).size;

  if (totalEl) totalEl.textContent = total;
  if (spentEl) spentEl.textContent = "₹" + formatCr(spent);
  if (teamsEl) teamsEl.textContent = teams;
}

function formatCr(val) {
  if (val >= 10000000) return (val / 10000000).toFixed(1) + "Cr";
  if (val >= 100000) return (val / 100000).toFixed(1) + "L";
  return val.toLocaleString('en-IN');
}

// ─── SEARCH & FILTER ───
function applyFilter() {
  const q = (document.getElementById("searchInput")?.value || "").toLowerCase();
  const team = document.getElementById("filterTeam")?.value || "";

  const filtered = allPlayers.filter(row => {
    const nameMatch = String(row[1]).toLowerCase().includes(q);
    const teamMatch = !team || row[2] === team;
    return nameMatch && teamMatch;
  });

  renderTable(filtered);
}

// ─── LOAD TEAMS INTO DROPDOWN ───
function loadTeams() {
  const sel = document.getElementById("teamName");
  const filterSel = document.getElementById("filterTeam");
  if (!sel && !filterSel) return;

  fetch(API_URL + "?type=teams")
    .then(res => res.json())
    .then(data => {
      allTeams = data.slice(1);
      const options = allTeams.map(row =>
        `<option value="${row[1]}">${row[1]}</option>`
      ).join("");

      if (sel) sel.innerHTML = `<option value="">Select Team</option>` + options;
      if (filterSel) filterSel.innerHTML = `<option value="">All Teams</option>` + options;
    })
    .catch(() => showToast("Could not load teams", true));
}

// ─── SAVE / UPDATE ───
function saveData() {
  const id = document.getElementById("id").value.trim();
  const playerName = document.getElementById("playerName").value.trim();
  const teamName = document.getElementById("teamName").value;
  const price = document.getElementById("price").value.trim();

  if (!playerName || !teamName || !price) {
    showToast("Please fill all fields", true);
    return;
  }

  if (isNaN(price) || Number(price) <= 0) {
    showToast("Enter a valid price", true);
    return;
  }

  const action = id ? "update" : "create";
  const btn = document.querySelector(".btn-primary");
  if (btn) { btn.disabled = true; btn.textContent = "Saving..."; }

  fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({ action, id, playerName, teamName, price })
  })
  .then(() => {
    clearForm();
    showToast(id ? "Player updated!" : "Player saved!");
    setTimeout(fetchData, 800);
  })
  .catch(() => showToast("Save failed. Try again.", true))
  .finally(() => {
    if (btn) { btn.disabled = false; btn.textContent = "💾 Save Player"; }
  });
}

// ─── DELETE ───
function deleteData(id) {
  if (!confirm("Delete this player?")) return;

  fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({ action: "delete", id })
  })
  .then(() => {
    showToast("Player deleted");
    setTimeout(fetchData, 800);
  })
  .catch(() => showToast("Delete failed", true));
}

// ─── EDIT ───
function editData(id, playerName, teamName, price) {
  document.getElementById("id").value = id;
  document.getElementById("playerName").value = playerName;
  document.getElementById("teamName").value = teamName;
  document.getElementById("price").value = price;

  const card = document.querySelector(".card");
  if (card) card.scrollIntoView({ behavior: "smooth", block: "start" });

  const btn = document.querySelector(".btn-primary");
  if (btn) btn.textContent = "💾 Update Player";

  showToast("Editing player — make your changes and save.");
}

// ─── CLEAR FORM ───
function clearForm() {
  document.getElementById("id").value = "";
  document.getElementById("playerName").value = "";
  const sel = document.getElementById("teamName");
  if (sel) sel.selectedIndex = 0;
  document.getElementById("price").value = "";

  const btn = document.querySelector(".btn-primary");
  if (btn) btn.textContent = "💾 Save Player";
}

// ─── TEAMS PAGE ───

function fetchTeamsPage() {
  const grid = document.getElementById("teamsGrid");
  if (!grid) return;

  grid.innerHTML = `<div class="loading-state"><div class="spinner"></div><div>Loading teams...</div></div>`;

  Promise.all([
    fetch(API_URL + "?type=teams").then(r => r.json()),
    fetch(API_URL).then(r => r.json())
  ])
  .then(([teamsData, playersData]) => {
    const teams = teamsData.slice(1);
    const players = playersData.slice(1);

    if (!teams.length) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🏟️</div>
          <div class="empty-title">No teams yet</div>
          <div class="empty-sub">Add your first team using the form above.</div>
        </div>`;
      updateTeamStats(0, 0);
      return;
    }

    let totalSpent = 0;
    grid.innerHTML = teams.map(row => {
      const teamName = row[1];
      const owner = row[2] || "—";
      const teamPlayers = players.filter(p => p[2] === teamName);
      const spent = teamPlayers.reduce((s, p) => s + Number(p[3] || 0), 0);
      const remaining = BUDGET_PER_TEAM - spent;
      const pct = Math.min((spent / BUDGET_PER_TEAM) * 100, 100);
      const barClass = pct > 85 ? "danger" : pct > 60 ? "warn" : "";
      totalSpent += spent;

      return `
        <div class="team-card">
          <div class="team-card-header">
            <div>
              <div class="team-card-name">${teamName}</div>
              <div class="team-card-owner">👤 ${owner}</div>
            </div>
            <div class="team-icon">🏏</div>
          </div>
          <div class="team-card-stats">
            <div class="team-stat">
              <div class="team-stat-label">Players</div>
              <div class="team-stat-val">${teamPlayers.length}</div>
            </div>
            <div class="team-stat">
              <div class="team-stat-label">Spent</div>
              <div class="team-stat-val ${pct > 85 ? 'red' : ''}">₹${formatCr(spent)}</div>
            </div>
            <div class="team-stat">
              <div class="team-stat-label">Left</div>
              <div class="team-stat-val green">₹${formatCr(remaining)}</div>
            </div>
          </div>
          <div class="budget-bar-wrap">
            <div class="budget-bar-bg">
              <div class="budget-bar-fill ${barClass}" style="width:${pct}%"></div>
            </div>
            <div class="budget-bar-label">
              <span>Budget used: ${pct.toFixed(1)}%</span>
              <span>of ₹${formatCr(BUDGET_PER_TEAM)}</span>
            </div>
          </div>
        </div>`;
    }).join("");

    updateTeamStats(teams.length, totalSpent);
  })
  .catch(() => {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Failed to load</div></div>`;
    showToast("Failed to load teams data", true);
  });
}

function updateTeamStats(count, spent) {
  const countEl = document.getElementById("stat-team-count");
  const spentEl = document.getElementById("stat-total-spent");
  const budgetEl = document.getElementById("stat-total-budget");
  if (countEl) countEl.textContent = count;
  if (spentEl) spentEl.textContent = "₹" + formatCr(spent);
  if (budgetEl) budgetEl.textContent = "₹" + formatCr(count * BUDGET_PER_TEAM);
}

function saveTeam() {
  const teamName = document.getElementById("teamName")?.value.trim();
  const ownerName = document.getElementById("ownerName")?.value.trim();

  if (!teamName || !ownerName) {
    showToast("Please fill Team Name and Owner Name", true);
    return;
  }

  const btn = document.getElementById("saveTeamBtn");
  if (btn) { btn.disabled = true; btn.textContent = "Saving..."; }

  fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({ type: "team", action: "create", teamName, ownerName })
  })
  .then(() => {
    document.getElementById("teamName").value = "";
    document.getElementById("ownerName").value = "";
    showToast("Team saved!");
    setTimeout(fetchTeamsPage, 800);
  })
  .catch(() => showToast("Failed to save team", true))
  .finally(() => {
    if (btn) { btn.disabled = false; btn.textContent = "➕ Add Team"; }
  });
}

// ─── INIT ───
document.addEventListener("DOMContentLoaded", () => {
  // Players page
  if (document.getElementById("tableBody")) {
    fetchData();
    loadTeams();
  }
  // Teams page
  if (document.getElementById("teamsGrid")) {
    fetchTeamsPage();
  }
});
