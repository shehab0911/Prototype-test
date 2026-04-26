/* ============================================================
   Atlético Intelligence — Full Frontend Application
   ============================================================ */

const API_BASE =
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "localhost"
    ? "http://127.0.0.1:8000"
    : "https://prototype-test-production.up.railway.app";

const ACTIVE_STATUSES = new Set([
  "queued",
  "extracting_clip",
  "awaiting_frame_selection",
  "ai_analyzing",
]);

/* ===== APP STATE ===== */
let currentRole = null;
let currentTeamId = null;
let selectedIncidentId = null;
let pollTimer = null;
let incidentCache = [];
let currentIncidentFilter = "all";

/* ===== DOM REFS ===== */
const landingPage = document.getElementById("landingPage");
const loginOverlay = document.getElementById("loginOverlay");
const appShell = document.getElementById("appShell");
const roleSelect = document.getElementById("roleSelect");
const teamIdInput = document.getElementById("teamIdInput");
const loginBtn = document.getElementById("loginBtn");
const sessionInfo = document.getElementById("sessionInfo");
const sessionRoleLabel = document.getElementById("sessionRoleLabel");
const navList = document.getElementById("navList");
const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");
const matchInfoEl = document.getElementById("matchInfo");

const matchIdInput = document.getElementById("matchId");
const videoSourceInput = document.getElementById("videoSource");
const videoFileInput = document.getElementById("videoFile");
const uploadVideoBtn = document.getElementById("uploadVideoBtn");
const uploadStatus = document.getElementById("uploadStatus");
const saveMatchBtn = document.getElementById("saveMatchBtn");
const eventTsInput = document.getElementById("eventTs");
const frameTsInput = document.getElementById("frameTs");
const offsideBtn = document.getElementById("offsideBtn");
const goalBtn = document.getElementById("goalBtn");
const autoGoalBtn = document.getElementById("autoGoalBtn");
const signOutBtn = document.getElementById("signOutBtn");

const listEl = document.getElementById("incidentList");
const incidentListEmpty = document.getElementById("incidentListEmpty");
const incidentsSummaryCards = document.getElementById("incidentsSummaryCards");
const incidentsTableWrap = document.getElementById("incidentsTableWrap");
const incidentsLogTableBody = document.getElementById("incidentsLogTableBody");
const detailEl = document.getElementById("detail");
const historyTable = document.getElementById("historyTable");
const myAssignmentsTable = document.getElementById("myAssignmentsTable");
const matchOfficialsTable = document.getElementById("matchOfficialsTable");
const teamDetailContent = document.getElementById("teamDetailContent");
const livePreviewVideo = document.getElementById("livePreviewVideo");
const liveScrubber = document.getElementById("liveScrubber");
const liveTimeLabel = document.getElementById("liveTimeLabel");
const filterAllBtn = document.getElementById("filterAllBtn");
const filterOffsideBtn = document.getElementById("filterOffsideBtn");
const filterGoalBtn = document.getElementById("filterGoalBtn");

/* ===== SCREEN CONFIG ===== */
const screenIds = [
  "dashboard",
  "my-assignments",
  "match-history",
  "live-console",
  "incidents",
  "incident-detail",
  "team-list",
  "team-detail",
  "leagues",
  "league-detail",
  "match-officials",
  "official-detail",
];

const navByRole = {
  team_viewer: [
    { key: "dashboard", icon: "📊" },
    { key: "match-history", icon: "📋" },
    { key: "incidents", icon: "🎬" },
  ],
  match_official: [
    { key: "dashboard", icon: "📊" },
    { key: "my-assignments", icon: "📋" },
    { key: "live-console", icon: "🎮" },
    { key: "incidents", icon: "🎬" },
  ],
  league_admin: [
    { key: "dashboard", icon: "📊" },
    { key: "leagues", icon: "🏆" },
    { key: "team-list", icon: "👥" },
    { key: "match-officials", icon: "👤" },
    { key: "match-history", icon: "📋" },
  ],
};

const label = {
  dashboard: "Dashboard",
  "my-assignments": "My Assignments",
  "match-history": "Matches",
  "live-console": "Live Console",
  incidents: "Clips & Incidents",
  "incident-detail": "Incidents Log",
  "team-list": "Teams",
  "team-detail": "Edit Team Profile",
  leagues: "Competitions",
  "league-detail": "League Detail Form",
  "match-officials": "Match Officials",
  "official-detail": "Official Profile",
};

const subtitles = {
  dashboard: "Overview of recent activity and quick actions",
  "my-assignments": "Matches where you are assigned as an official",
  "match-history": "Browse all past matches and incident archives",
  "live-console": "Active match review hub — trigger incident checks",
  incidents: "View all incident clips from your matches",
  "incident-detail": "Comprehensive incident review and documentation",
  "team-list": "Create, manage, and monitor all teams in the league",
  "team-detail": "Update team information and settings",
  leagues: "Manage all leagues, seasons, and team configurations",
  "league-detail": "League configuration and settings",
  "match-officials": "Manage referee assignments, certifications, and availability",
  "official-detail": "Match official profile and assignments",
};

const roleLabels = {
  team_viewer: "Team Viewer",
  match_official: "Match Official",
  league_admin: "League Admin",
};

/* ===== EVENT BINDINGS ===== */
document.getElementById("landingOpenConsole").addEventListener("click", showLoginOverlay);
document.getElementById("landingSignIn").addEventListener("click", showLoginOverlay);
document.getElementById("heroGetStarted").addEventListener("click", showLoginOverlay);
document.getElementById("ctaGetStarted").addEventListener("click", showLoginOverlay);
document.getElementById("heroWatchDemo").addEventListener("click", showLoginOverlay);
loginBtn.addEventListener("click", login);
signOutBtn.addEventListener("click", signOut);
saveMatchBtn.addEventListener("click", saveMatch);
uploadVideoBtn.addEventListener("click", uploadMatchVideo);
offsideBtn.addEventListener("click", () => createIncident("offside"));
goalBtn.addEventListener("click", () => createIncident("goal"));
autoGoalBtn.addEventListener("click", autoDetectGoal);
filterAllBtn.addEventListener("click", () => applyIncidentFilter("all"));
filterOffsideBtn.addEventListener("click", () => applyIncidentFilter("offside"));
filterGoalBtn.addEventListener("click", () => applyIncidentFilter("goal"));
liveScrubber.addEventListener("input", () => {
  const t = Number(liveScrubber.value);
  livePreviewVideo.currentTime = t;
  liveTimeLabel.textContent = `Current frame time: ${t.toFixed(1)}s`;
});

/* ===== HELPERS ===== */
function canEdit() {
  return currentRole === "league_admin" || currentRole === "match_official";
}

function getMatchId() {
  return (matchIdInput.value || "match-demo-001").trim();
}

function showLoginOverlay() {
  landingPage.classList.add("hidden");
  loginOverlay.classList.remove("hidden");
}

function signOut() {
  currentRole = null;
  currentTeamId = null;
  selectedIncidentId = null;
  incidentCache = [];
  if (pollTimer) clearInterval(pollTimer);
  appShell.classList.add("hidden");
  landingPage.classList.remove("hidden");
}

/* ===== NAV RENDERING ===== */
function renderNav(activeKey = "dashboard") {
  navList.innerHTML = "";
  const items = navByRole[currentRole] || [];
  items.forEach(({ key, icon }) => {
    const btn = document.createElement("button");
    btn.className = `nav-item ${key === activeKey ? "active" : ""}`;
    btn.innerHTML = `${icon} ${label[key]}`;
    btn.onclick = () => {
      setActiveScreen(key);
      renderNav(key);
    };
    navList.appendChild(btn);
  });
}

function setActiveScreen(key) {
  screenIds.forEach((id) => {
    const el = document.getElementById(`screen-${id}`);
    if (!el) return;
    el.classList.toggle("hidden", id !== key);
  });
  pageTitle.textContent = label[key] || "Dashboard";
  pageSubtitle.textContent = subtitles[key] || "";

  // Trigger screen-specific renders
  if (key === "dashboard") renderDashboard();
  if (key === "leagues") renderLeagues();
  if (key === "team-list") renderTeamList();
  if (key === "team-detail") renderTeamDetail();
  if (key === "league-detail") renderLeagueDetail();
  if (key === "match-officials") renderMatchOfficials();
  if (key === "official-detail") renderOfficialDetail();
  if (key === "match-history") renderHistory();
  if (key === "my-assignments") renderMyAssignments();
}

function updateControls() {
  const editable = canEdit();
  offsideBtn.disabled = !editable;
  goalBtn.disabled = !editable;
  autoGoalBtn.disabled = !editable;
}

/* ===== AUTH ===== */
async function login() {
  try {
    const payload = await request("/api/auth/mock-login", "POST", {
      role: roleSelect.value,
      team_id: teamIdInput.value || "team-demo-001",
    });
    currentRole = payload.role;
    currentTeamId = payload.team_id;
    sessionInfo.textContent = `${roleLabels[currentRole] || currentRole}`;
    sessionRoleLabel.textContent = `${currentTeamId} · ${currentRole}`;
    loginOverlay.classList.add("hidden");
    appShell.classList.remove("hidden");
    renderNav("dashboard");
    setActiveScreen("dashboard");
    updateControls();
    await saveMatch();
    await refreshIncidents();
    startPolling();
  } catch (err) {
    alert("Login failed: " + err.message);
  }
}

/* ===== MATCH MANAGEMENT ===== */
async function saveMatch() {
  try {
    const payload = await request(`/api/matches/${getMatchId()}`, "POST", {
      source_type: videoSourceInput.value,
      source_label:
        videoSourceInput.value === "live"
          ? "rtmp://camera/live"
          : "uploaded_video.mp4",
    });
    matchInfoEl.textContent = `${payload.id} (${payload.source_type})`;
    renderHistory();
  } catch (e) {
    console.warn("Match save:", e.message);
  }
}

async function uploadMatchVideo() {
  if (!canEdit()) return;
  if (!videoFileInput.files.length) {
    alert("Select a video file to upload.");
    return;
  }
  const form = new FormData();
  form.append("file", videoFileInput.files[0]);

  try {
    const res = await fetch(`${API_BASE}/api/matches/${getMatchId()}/source`, {
      method: "POST",
      headers: {
        "X-Role": currentRole || "",
        "X-Team-Id": currentTeamId || "",
      },
      body: form,
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error(payload.detail || "Video upload failed");
    }
    const payload = await res.json();
    uploadStatus.textContent = `✓ Uploaded ${payload.source_file}`;
    await refreshIncidents();
  } catch (err) {
    alert(err.message);
  }
}

/* ===== INCIDENT CREATION ===== */
async function createIncident(type) {
  if (!canEdit()) return;
  try {
    const incident = await request(
      `/api/matches/${getMatchId()}/incidents`,
      "POST",
      {
        type,
        event_ts: Number(eventTsInput.value || 0),
      }
    );
    if (type === "offside") {
      await request(`/api/incidents/${incident.id}/review-frame`, "POST", {
        frame_ts: Number(frameTsInput.value || 0),
      });
    }
    await refreshIncidents();
    setActiveScreen("incidents");
    renderNav("incidents");
  } catch (error) {
    alert(error.message);
  }
}

async function autoDetectGoal() {
  if (!canEdit()) return;
  try {
    await request(`/api/matches/${getMatchId()}/goal-auto-detect`, "POST", {
      frame_ts: Number(eventTsInput.value || 0),
    });
    await refreshIncidents();
  } catch (error) {
    alert(error.message);
  }
}

/* ===== INCIDENTS ===== */
async function refreshIncidents() {
  if (!currentRole) return;
  try {
    incidentCache = await request(`/api/matches/${getMatchId()}/incidents`);
  } catch (e) {
    incidentCache = [];
  }
  renderIncidents();
  if (selectedIncidentId) {
    const selected = incidentCache.find((x) => x.id === selectedIncidentId);
    if (selected) renderDetail(selected);
  }
}

function renderIncidents() {
  const filtered =
    currentIncidentFilter === "all"
      ? incidentCache
      : incidentCache.filter((i) => i.type === currentIncidentFilter);

  // Update filter buttons
  [filterAllBtn, filterOffsideBtn, filterGoalBtn].forEach((btn) =>
    btn.classList.remove("active")
  );
  if (currentIncidentFilter === "all") filterAllBtn.classList.add("active");
  else if (currentIncidentFilter === "offside") filterOffsideBtn.classList.add("active");
  else filterGoalBtn.classList.add("active");

  listEl.innerHTML = "";
  if (incidentsLogTableBody) incidentsLogTableBody.innerHTML = "";

  if (filtered.length === 0) {
    incidentListEmpty.style.display = "block";
  } else {
    incidentListEmpty.style.display = "none";
  }

  const showOfficialTable = currentRole === "match_official" || currentRole === "league_admin";
  const showViewerTable = currentRole === "team_viewer";
  const showAnyTable = showOfficialTable || showViewerTable;
  if (incidentsSummaryCards) incidentsSummaryCards.style.display = showOfficialTable ? "grid" : "none";
  if (incidentsTableWrap) incidentsTableWrap.style.display = showAnyTable ? "block" : "none";
  listEl.style.display = showAnyTable ? "none" : "block";

  if (incidentsTableWrap) {
    const headRow = incidentsTableWrap.querySelector("thead tr");
    if (headRow) {
      headRow.innerHTML = showViewerTable
        ? `
          <th>Type</th>
          <th>Match Time</th>
          <th>AI Verdict</th>
          <th>Confidence</th>
          <th>Action</th>
        `
        : `
          <th>Time</th>
          <th>Type</th>
          <th>Team/Player</th>
          <th>Description</th>
          <th>AI Verdict & Confidence</th>
          <th>Review Status</th>
          <th>Action</th>
        `;
    }
  }

  if (showOfficialTable && incidentsSummaryCards) {
    const completed = filtered.filter((x) => x.status === "completed").length;
    const avgConfidence =
      filtered.length === 0
        ? 0
        : Math.round(
            (filtered.reduce((sum, x) => sum + Number(x.confidence || 0), 0) / filtered.length) * 100
          );
    incidentsSummaryCards.innerHTML = `
      <div class="stat-card">
        <div class="stat-card-label">Total incidents</div>
        <div class="stat-value">${filtered.length}</div>
        <div class="stat-sub">Current match log</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">Completed</div>
        <div class="stat-value" style="color:var(--accent-primary);">${completed}</div>
        <div class="stat-sub">Finalized verdicts</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">Average confidence</div>
        <div class="stat-value" style="color:var(--accent-purple-hover);">${avgConfidence}%</div>
        <div class="stat-sub">Model confidence</div>
      </div>
    `;
  }

  filtered.forEach((incident) => {
    const confidenceLabel =
      incident.confidence >= 0.8
        ? "High"
        : incident.confidence >= 0.6
        ? "Medium"
        : "Low";
    const confidenceClass =
      incident.confidence >= 0.8
        ? "badge-active"
        : incident.confidence >= 0.6
        ? "badge-warning"
        : "badge-error";

    if (showAnyTable && incidentsLogTableBody) {
      const row = document.createElement("tr");
      if (showViewerTable) {
        row.innerHTML = `
          <td><span class="badge badge-${incident.type}">${incident.type === "offside" ? "Offside" : "Goal"}</span></td>
          <td>${Math.round(incident.event_ts)}:${String(Math.round((incident.event_ts % 1) * 60)).padStart(2, "0")}</td>
          <td style="font-weight:600;">${incident.verdict}</td>
          <td>${confidenceLabel}</td>
          <td><button class="secondary incident-open-btn">Open</button></td>
        `;
      } else {
        row.innerHTML = `
          <td>${Math.round(incident.event_ts)}:${String(Math.round((incident.event_ts % 1) * 60)).padStart(2, "0")}</td>
          <td><span class="badge badge-${incident.type}">${incident.type.toUpperCase()}</span></td>
          <td>Riverside FC (J. Smith)</td>
          <td>${incident.type === "offside" ? "Through ball, marginal offside call" : "Scramble in box, possible goal"}</td>
          <td style="font-weight:600;">${incident.verdict} <span style="font-size:0.78rem;color:var(--text-muted);margin-left:6px;">${(incident.confidence * 100).toFixed(0)}%</span></td>
          <td><span class="badge ${confidenceClass}">${incident.status.replace(/_/g, " ")}</span></td>
          <td><button class="secondary incident-open-btn">Details →</button></td>
        `;
      }
      row.querySelector(".incident-open-btn").onclick = () => {
        selectedIncidentId = incident.id;
        renderDetail(incident);
        setActiveScreen("incident-detail");
        renderNav("incident-detail");
      };
      incidentsLogTableBody.appendChild(row);
      return;
    }

    const li = document.createElement("li");
    li.innerHTML = `
      <span class="badge badge-${incident.type}" style="padding:4px 10px;font-size:0.75rem;font-weight:700;text-transform:uppercase;">${incident.type}</span>
      <span class="incident-type">${incident.verdict}</span>
      <span class="incident-info">${Math.round(incident.event_ts)}s · ${new Date(incident.created_at).toLocaleTimeString()}</span>
      <span class="badge ${confidenceClass}">${(incident.confidence * 100).toFixed(0)}% ${confidenceLabel}</span>
      <span class="badge badge-${incident.status}">${incident.status.replace(/_/g, " ")}</span>
    `;
    li.onclick = () => {
      selectedIncidentId = incident.id;
      renderDetail(incident);
      setActiveScreen("incident-detail");
      renderNav("incident-detail");
    };
    listEl.appendChild(li);
  });
}

function applyIncidentFilter(filterType) {
  currentIncidentFilter = filterType;
  renderIncidents();
}

/* ===== INCIDENT DETAIL (Full BRD-compliant) ===== */
function renderDetail(incident) {
  const readonly = !canEdit();
  const isOffside = incident.type === "offside";
  const verdictClass = isOffside
    ? incident.verdict === "Offside"
      ? "offside"
      : "onside"
    : incident.verdict === "Goal"
    ? "goal"
    : "no-goal";

  const verdictDescription = isOffside
    ? `Attacking player (Riverside FC - J. Smith) is positioned ${
        incident.verdict === "Offside" ? "ahead of" : "behind"
      } the second-last defender at the precise moment the ball is played.`
    : `The ball ${
        incident.verdict === "Goal"
          ? "has fully crossed the goal line"
          : "did not fully cross the goal line"
      } based on virtual goal-line analysis.`;

  const confidenceLevel =
    incident.confidence >= 0.8
      ? "High"
      : incident.confidence >= 0.6
      ? "Medium"
      : "Low";

  const historyHtml = (incident.processing_history || [])
    .map(
      (s, idx) => `
      <div class="audit-item">
        <div class="audit-dot ${idx > 0 ? "secondary" : ""}"></div>
        <div class="audit-content">
          <div class="audit-time">${idx === 0 ? "Just now" : idx + " min ago"}</div>
          <div class="audit-text">${s.status.replace(/_/g, " ")}</div>
          <div class="audit-by">${s.status === "completed" ? "System" : "by J. Martinez"}</div>
        </div>
      </div>`
    )
    .join("");

  if (currentRole === "team_viewer") {
    detailEl.innerHTML = `
      <div class="animate-in">
        <div class="incident-detail-header">
          <button class="back-btn" id="detailBackBtn">←</button>
          <span class="badge badge-${incident.type}" style="text-transform:uppercase;font-weight:700;">${incident.type}</span>
          <span class="incident-time">${Math.round(incident.event_ts)}s</span>
          <span style="font-size:1.05rem;font-weight:600;margin-left:4px;">Incident detail</span>
          <div style="margin-left:auto;display:flex;gap:8px;">
            <button id="downloadClipBtn" class="secondary" style="font-size:0.82rem;">⬇ Download clip</button>
          </div>
        </div>
        <div class="cards2" style="margin-bottom:20px;">
          <div class="panel" style="margin-bottom:0;">
            ${
              incident.clip_url
                ? `
              <div class="video-container" style="margin-bottom:8px;">
                <video id="detailClip" controls style="border:none;border-radius:var(--radius-md);">
                  <source src="${incident.clip_url}" type="video/mp4" />
                </video>
              </div>
            `
                : `<div style="padding:40px;text-align:center;color:var(--text-muted);background:var(--bg-input);border-radius:var(--radius-md);">Clip deleted from storage</div>`
            }
            <div style="font-size:0.78rem;color:var(--text-muted);">Stored clip playback (5-15s) — read-only</div>
          </div>
          <div class="panel" style="margin-bottom:0;">
            <h3>AI Verdict</h3>
            <div class="verdict-text ${verdictClass}" style="margin-top:8px;">${incident.verdict}</div>
            <p class="verdict-desc">${verdictDescription}</p>
            <div class="confidence-row">
              <div class="confidence-item">
                <div class="ci-label">Confidence</div>
                <div class="ci-value">${confidenceLevel}</div>
              </div>
              <div class="confidence-item">
                <div class="ci-label">Snapshot</div>
                <div class="ci-value">Frame locked</div>
              </div>
            </div>
            <div style="margin-top:16px;">
              <h4 style="margin-bottom:8px;">3D Positional Visual</h4>
              ${renderPitchDiagram(incident)}
            </div>
            <div style="margin-top:12px;">
              <h4 style="margin-bottom:8px;">Referee note</h4>
              <div style="padding:10px;border:1px solid var(--border-subtle);border-radius:var(--radius-md);background:var(--bg-input);color:var(--text-secondary);">${incident.note || "No note provided."}</div>
            </div>
          </div>
        </div>
      </div>
    `;
    document.getElementById("detailBackBtn").onclick = () => {
      setActiveScreen("incidents");
      renderNav("incidents");
    };
    document.getElementById("downloadClipBtn").onclick = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/incidents/${incident.id}/download`, {
          headers: {
            "X-Role": currentRole || "",
            "X-Team-Id": currentTeamId || "",
          },
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.detail || "Download failed");
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `incident_${incident.id}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        alert(error.message);
      }
    };
    return;
  }

  detailEl.innerHTML = `
    <div class="animate-in">
      <!-- Header -->
      <div class="incident-detail-header">
        <button class="back-btn" id="detailBackBtn">←</button>
        <span class="badge badge-${incident.type}" style="text-transform:uppercase;font-weight:700;">${incident.type}</span>
        <span class="incident-time">${Math.round(incident.event_ts)}s</span>
        <span style="font-size:1.05rem;font-weight:600;margin-left:4px;">Incident Detail</span>
        <div style="margin-left:auto;display:flex;gap:8px;">
          <button id="downloadClipBtn" class="secondary" style="font-size:0.82rem;">⬇ Download Clip</button>
          <button id="deleteClipBtn" class="btn-danger" style="font-size:0.82rem;" ${readonly ? "disabled" : ""}>🗑 Delete</button>
        </div>
      </div>

      <!-- Verdict + AI Rationale -->
      <div class="cards2-wide" style="margin-bottom:20px;">
        <div class="verdict-display" style="padding:0;">
          <div class="verdict-text ${verdictClass}">${incident.verdict}</div>
          <p class="verdict-desc">${verdictDescription}</p>
          <div class="confidence-row">
            <div class="confidence-item">
              <div class="ci-label">Confidence</div>
              <div class="ci-value">${(incident.confidence * 100).toFixed(0)}% (${confidenceLevel}) ${
    incident.confidence >= 0.8 ? "✅" : "⚠️"
  }</div>
            </div>
            <div class="confidence-item">
              <div class="ci-label">Snapshot</div>
              <div class="ci-value">Frame Locked 🔒</div>
            </div>
          </div>
        </div>
        <div class="ai-rationale">
          <h4>AI Rationale</h4>
          <ul class="rationale-list">
            ${
              isOffside
                ? `
              <li>Point of contact identified at frame #${Math.round((incident.frame_ts || incident.event_ts) * 100)}</li>
              <li>Last defender shoulder mapped</li>
              <li>Attacker trailing foot mapped</li>
              <li>Distance to goal line: Attacker +0.4m</li>
            `
                : `
              <li>Ball position tracked across 12 frames</li>
              <li>Virtual goal-line barrier applied</li>
              <li>Ball crossing confirmed at frame #${Math.round(incident.event_ts * 100)}</li>
              <li>Calibration confidence: ${(incident.confidence * 100).toFixed(0)}%</li>
            `
            }
          </ul>
        </div>
      </div>

      <!-- Video + 3D Positional -->
      <div class="cards2" style="margin-bottom:20px;">
        <div class="panel" style="margin-bottom:0;">
          <div class="tabs">
            <button class="tab active">Main Cam</button>
            <button class="tab">Tactical Cam</button>
            <button class="tab">AI Overlay</button>
          </div>
          ${
            incident.clip_url
              ? `
            <div class="video-container" style="margin-bottom:8px;">
              <video id="detailClip" controls style="border:none;border-radius:var(--radius-md) var(--radius-md) 0 0;">
                <source src="${incident.clip_url}" type="video/mp4" />
              </video>
              <div style="position:absolute;top:12px;right:12px;">
                <span class="frame-badge">Frame #${Math.round((incident.frame_ts || incident.event_ts) * 100)}</span>
              </div>
            </div>
          `
              : `<div style="padding:40px;text-align:center;color:var(--text-muted);background:var(--bg-input);border-radius:var(--radius-md);">
                <p style="font-size:1rem;margin-bottom:4px;">Clip deleted from storage</p>
                <p style="font-size:0.82rem;">Metadata retained for audit purposes.</p>
              </div>`
          }
          <div class="playback-controls">
            <button class="play-btn">▶</button>
            <div class="progress-bar">
              <div class="progress-fill" style="width:35%;">
                <div class="progress-thumb"></div>
              </div>
            </div>
            <span style="font-size:0.78rem;color:var(--text-muted);">0:04 / 0:12</span>
          </div>
          <div class="row" style="justify-content:space-between;margin-top:4px;">
            <div class="skip-btns">
              <button class="skip-btn">|◀</button>
              <button class="skip-btn">-1f</button>
              <button class="skip-btn">+1f</button>
              <button class="skip-btn">▶|</button>
            </div>
            <span style="font-size:0.75rem;color:var(--text-muted);">Stored clip playback (5-15s)</span>
            <button class="action-icon" title="Fullscreen">⛶</button>
          </div>
        </div>

        <div class="panel" style="margin-bottom:0;">
          <div class="row-between" style="margin-bottom:12px;">
            <h3>3D Positional Visual</h3>
            <div class="toggle-group">
              <button class="toggle-btn active">Top down</button>
              <button class="toggle-btn">Perspective</button>
            </div>
          </div>
          ${renderPitchDiagram(incident)}
          <div class="row" style="justify-content:center;gap:20px;margin-top:10px;">
            <span style="font-size:0.78rem;display:flex;align-items:center;gap:5px;">
              <span style="width:10px;height:10px;border-radius:50%;background:var(--status-info);display:inline-block;"></span>
              Riverside FC (Attacking)
            </span>
            <span style="font-size:0.78rem;display:flex;align-items:center;gap:5px;">
              <span style="width:10px;height:10px;border-radius:50%;background:var(--status-error);display:inline-block;"></span>
              North End (Defending)
            </span>
          </div>
        </div>
      </div>

      <!-- Referee Notes + Audit Trail -->
      <div class="cards2" style="margin-bottom:20px;">
        <div class="referee-notes">
          <div class="referee-notes-header">
            <h4>Referee Notes</h4>
            <span class="note-status badge ${incident.note ? 'badge-active' : 'badge-draft'}">${incident.note ? 'Saved' : 'Draft'}</span>
          </div>
          <p style="font-size:0.78rem;color:var(--text-muted);margin-bottom:8px;">Optional · Max 300 characters · Profanity filtered</p>
          <textarea id="note" rows="3" placeholder="Add referee notes about this incident..." ${readonly ? "disabled" : ""}>${incident.note || ""}</textarea>
          <div class="row-between" style="margin-top:8px;">
            <div class="row" style="gap:6px;">
              <span style="font-size:0.78rem;color:var(--text-muted);">📎 Attach Clip</span>
              <span id="charCounter" class="char-counter">${(incident.note || "").length} / 300</span>
            </div>
            <div class="btn-group">
              <button id="saveNoteBtn" class="secondary" ${readonly ? "disabled" : ""}>Save Draft</button>
              <button id="finalizeBtn" style="background:var(--status-error);color:white;font-size:0.82rem;" ${readonly ? "disabled" : ""}>Finalize Recommendation</button>
            </div>
          </div>
        </div>

        <div class="audit-trail">
          <h4>Audit Trail</h4>
          ${historyHtml || '<p style="color:var(--text-muted);font-size:0.85rem;">No timeline yet</p>'}
        </div>
      </div>

      <!-- Frame Review (for offside) -->
      ${
        isOffside
          ? `
        <div class="panel" style="margin-bottom:20px;">
          <h3 style="margin-bottom:12px;">Frame Review</h3>
          <label for="detailFrameTs">Select exact frame for analysis</label>
          <input id="detailFrameTs" type="range" min="0" max="30" step="0.1" value="${Number(
            incident.frame_ts || incident.event_ts || 0
          ).toFixed(1)}" />
          <p id="detailFrameTsLabel" style="font-size:0.82rem;color:var(--text-muted);">Selected frame: ${Number(
            incident.frame_ts || incident.event_ts || 0
          ).toFixed(1)}s</p>
          <button id="reviewFrameBtn" ${readonly ? "disabled" : ""} style="margin-top:8px;">🔍 Review This Frame</button>
        </div>
      `
          : ""
      }

      <!-- AI Analysis Details -->
      <div class="panel" style="margin-bottom:20px;">
        <h3 style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
          <span style="color:var(--accent-primary);">🤖</span> AI Analysis Details
        </h3>
        <div class="ai-analysis">
          <div class="ai-metric">
            <h4>Model Signals</h4>
            <div class="metric-row">
              <span>Position Detection</span>
              <span class="metric-val">98%</span>
            </div>
            <div class="metric-row">
              <span>Contact Point</span>
              <span class="metric-val">96%</span>
            </div>
            <div class="metric-row">
              <span>Line Calibration</span>
              <span class="metric-val">94%</span>
            </div>
          </div>
          <div class="ai-metric">
            <h4>Evidence Frames</h4>
            <div class="evidence-frames" style="margin-top:8px;">
              <div class="evidence-frame primary">#${Math.round((incident.frame_ts || incident.event_ts) * 100)}</div>
              <div class="evidence-frame">#${Math.round((incident.frame_ts || incident.event_ts) * 100) - 1}</div>
              <div class="evidence-frame">#${Math.round((incident.frame_ts || incident.event_ts) * 100) + 1}</div>
            </div>
            <p style="font-size:0.75rem;color:var(--text-muted);margin-top:10px;">Primary frame locked for analysis</p>
          </div>
          <div class="ai-metric">
            <h4>Measurement Data</h4>
            <div class="metric-row">
              <span>Distance from line</span>
              <span class="metric-val">+0.4m</span>
            </div>
            <div class="metric-row">
              <span>Calibration error</span>
              <span class="metric-val">±0.05m</span>
            </div>
            <div class="metric-row">
              <span>Camera angle</span>
              <span class="metric-val">12°</span>
            </div>
          </div>
        </div>
      </div>
      ${currentRole === 'league_admin' ? `
      <!-- Admin Moderation -->
      <div class="panel" style="margin-bottom:20px; border-color: var(--accent-purple);">
        <h3 style="color:var(--accent-purple-hover); margin-bottom:12px;">Admin Moderation</h3>
        <div class="form-grid">
          <div class="form-field">
            <label>Override Verdict</label>
            <select id="adminOverrideVerdict">
              <option value="">Keep current verdict</option>
              <option value="Offside">Offside</option>
              <option value="Onside">Onside</option>
              <option value="Goal">Goal</option>
              <option value="No Goal">No Goal</option>
            </select>
          </div>
          <div class="form-field full-width">
            <label>Admin Note</label>
            <textarea id="adminNote" rows="2" placeholder="Reason for moderation...">${incident.admin_note || ""}</textarea>
          </div>
        </div>
        <div class="btn-group" style="margin-top:12px;">
          <button id="adminOverrideBtn" style="background:var(--accent-purple);color:white;">Apply Override</button>
          <button id="adminFlagBtn" class="btn-danger">Flag for Review</button>
          <button id="adminArchiveBtn" class="secondary">Archive Incident</button>
        </div>
      </div>
      ` : ""}
      ${currentRole === 'team_viewer' ? `
      <!-- Team Viewer Combined View -->
      <div class="panel" style="margin-bottom:20px;">
        <h3 style="margin-bottom:12px;">Match History</h3>
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Fixture</th>
                <th>Status</th>
                <th>Incidents</th>
                <th>Offside</th>
                <th>Goal</th>
              </tr>
            </thead>
            <tbody id="combinedHistoryTable"></tbody>
          </table>
        </div>
      </div>
      ` : ""}
    </div>
  `;

  // Wire up events
  document.getElementById("detailBackBtn").onclick = () => {
    setActiveScreen("incidents");
    renderNav("incidents");
  };

  const noteTextarea = document.getElementById("note");
  const charCounter = document.getElementById("charCounter");
  if (noteTextarea && charCounter) {
    noteTextarea.addEventListener("input", () => {
      const len = noteTextarea.value.length;
      charCounter.textContent = `${len} / 300`;
      if (len > 300) noteTextarea.value = noteTextarea.value.substring(0, 300);
    });
  }

  if (isOffside) {
    const detailFrameTs = document.getElementById("detailFrameTs");
    const detailFrameTsLabel = document.getElementById("detailFrameTsLabel");
    if (detailFrameTs && detailFrameTsLabel) {
      detailFrameTs.addEventListener("input", () => {
        detailFrameTsLabel.textContent = `Selected frame: ${Number(
          detailFrameTs.value
        ).toFixed(1)}s`;
      });
    }
    const reviewFrameBtn = document.getElementById("reviewFrameBtn");
    if (reviewFrameBtn) {
      reviewFrameBtn.onclick = async () => {
        try {
          await request(`/api/incidents/${incident.id}/review-frame`, "POST", {
            frame_ts: Number(detailFrameTs.value),
          });
          await refreshIncidents();
        } catch (error) {
          alert(error.message);
        }
      };
    }
  }

  document.getElementById("saveNoteBtn").onclick = async () => {
    try {
      await request(`/api/incidents/${incident.id}/note`, "PATCH", {
        note: document.getElementById("note").value,
      });
      await refreshIncidents();
    } catch (error) {
      alert(error.message);
    }
  };
  document.getElementById("finalizeBtn").onclick = async () => {
    try {
      await request(`/api/incidents/${incident.id}/note`, "PATCH", {
        note: document.getElementById("note").value,
      });
      alert("Recommendation finalized successfully.");
      await refreshIncidents();
    } catch (error) {
      alert(error.message);
    }
  };
  document.getElementById("deleteClipBtn").onclick = async () => {
    if (confirm("Delete this clip from storage? Metadata will be preserved.")) {
      await request(`/api/incidents/${incident.id}/clip`, "DELETE");
      await refreshIncidents();
    }
  };
  document.getElementById("downloadClipBtn").onclick = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/incidents/${incident.id}/download`, {
        headers: {
          "X-Role": currentRole || "",
          "X-Team-Id": currentTeamId || "",
        },
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.detail || "Download failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `incident_${incident.id}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(error.message);
    }
  };

  if (currentRole === 'league_admin') {
    const overrideBtn = document.getElementById("adminOverrideBtn");
    if (overrideBtn) overrideBtn.onclick = async () => {
      const newVerdict = document.getElementById("adminOverrideVerdict").value;
      if (!newVerdict) return alert("Select a new verdict to override.");
      try {
        await request(`/api/incidents/${incident.id}/moderate`, "POST", {
          action: "override",
          new_verdict: newVerdict,
          note: document.getElementById("adminNote").value
        });
        await refreshIncidents();
      } catch (e) { alert(e.message); }
    };
    const flagBtn = document.getElementById("adminFlagBtn");
    if (flagBtn) flagBtn.onclick = async () => {
      try {
        await request(`/api/incidents/${incident.id}/moderate`, "POST", {
          action: "flag",
          note: document.getElementById("adminNote").value
        });
        await refreshIncidents();
      } catch (e) { alert(e.message); }
    };
    const archiveBtn = document.getElementById("adminArchiveBtn");
    if (archiveBtn) archiveBtn.onclick = async () => {
      try {
        await request(`/api/incidents/${incident.id}/moderate`, "POST", {
          action: "archive",
          note: document.getElementById("adminNote").value
        });
        await refreshIncidents();
      } catch (e) { alert(e.message); }
    };
  }

  if (currentRole === 'team_viewer') {
    request('/api/matches').then(matches => {
      const combinedTbody = document.getElementById("combinedHistoryTable");
      if (combinedTbody) {
        combinedTbody.innerHTML = matches.map((m) => `
          <tr>
            <td>${new Date(m.updated_at).toLocaleDateString()}</td>
            <td><strong>${m.id}</strong></td>
            <td><span class="badge badge-${m.status.toLowerCase()}">${m.status}</span></td>
            <td>${m.incident_count || 0}</td>
            <td>${m.offside_count || 0}</td>
            <td>${m.goal_count || 0}</td>
          </tr>
        `).join("") || '<tr><td colspan="6" style="text-align:center;">No matches found</td></tr>';
      }
    }).catch(console.error);
  }
}

/* ===== PITCH DIAGRAM RENDERER ===== */
function renderPitchDiagram(incident) {
  const isOffside = incident.type === "offside";
  return `
    <div class="pitch-diagram">
      <!-- Pitch lines -->
      <div class="pitch-line" style="top:0;left:0;right:0;height:2px;"></div>
      <div class="pitch-line" style="bottom:0;left:0;right:0;height:2px;"></div>
      <div class="pitch-line" style="top:0;bottom:0;left:0;width:2px;"></div>
      <div class="pitch-line" style="top:0;bottom:0;right:0;width:2px;"></div>
      <div class="pitch-line" style="top:0;bottom:0;left:50%;width:2px;"></div>
      <div class="pitch-center-circle"></div>

      <!-- Penalty area -->
      <div class="pitch-line" style="top:20%;bottom:20%;right:0;width:20%;border:2px solid rgba(255,255,255,0.15);border-right:none;background:transparent;"></div>
      <div class="pitch-line" style="top:30%;bottom:30%;right:0;width:8%;border:2px solid rgba(255,255,255,0.15);border-right:none;background:transparent;"></div>

      <!-- Offside line -->
      ${isOffside ? '<div class="offside-line" style="left:68%;"></div>' : ''}

      <!-- Ball -->
      <div class="player-dot ball" style="top:45%;left:${isOffside ? '55%' : '90%'};"></div>

      <!-- Defender -->
      <div class="player-dot defender" style="top:38%;left:${isOffside ? '70%' : '85%'};">DEF</div>

      <!-- Attacker -->
      <div class="player-dot attacker" style="top:55%;left:${isOffside ? '72%' : '92%'};">ATT</div>

      <!-- Additional players -->
      <div class="player-dot defender" style="top:25%;left:60%;opacity:0.5;">DEF</div>
      <div class="player-dot attacker" style="top:65%;left:50%;opacity:0.5;">ATT</div>
    </div>
  `;
}

/* ===== DASHBOARD ===== */
function renderDashboard() {
  const welcomeSection = document.getElementById("dashWelcome");
  const statsGrid = document.getElementById("dashStats");
  const recentPanel = document.getElementById("dashRecentMatches");
  const quickPanel = document.getElementById("dashQuickLinks");

  const matchCount = new Set(incidentCache.map((i) => i.match_id)).size || 3;
  const incidentCount = incidentCache.length || 8;
  const openCount = incidentCache.filter((i) => ACTIVE_STATUSES.has(i.status)).length;
  const userName = currentRole === "team_viewer" ? "Alex Chen" : currentRole === "match_official" ? "Sam Rivera" : "League Admin";

  welcomeSection.innerHTML = `
    <h3>Welcome back, <strong>${userName}</strong></h3>
    <p>${
      currentRole === "team_viewer"
        ? 'You can review <span class="highlight" title="Completed and visible">approved</span> incident clips for your club after matches. You cannot edit clips, AI output, or trigger live reviews.'
        : currentRole === "match_official"
        ? "You can trigger offside and goal checks during live or uploaded match review."
        : "You can manage leagues, teams, matches, and override verdicts across the platform."
    }</p>
  `;

  if (currentRole === "team_viewer") {
    statsGrid.innerHTML = `
      <div class="stat-card">
        <div class="stat-card-label">Matches with clips</div>
        <div class="stat-value">${matchCount}</div>
        <div class="stat-sub">Completed · your access</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">Available Incidents</div>
        <div class="stat-value" style="color:var(--accent-purple-hover);">${incidentCount}</div>
        <div class="stat-sub">Offside & goal reviews</div>
      </div>
      <div class="stat-card featured">
        <div class="stat-badge">Latest</div>
        <div style="font-size:1.05rem;font-weight:700;margin-bottom:4px;">Riverside vs North End</div>
        <div class="stat-sub">Mar 28, 2026 · 3 clips</div>
        <div class="stat-link" onclick="setActiveScreen('incidents');renderNav('incidents');">Browse clips →</div>
      </div>
    `;
    recentPanel.innerHTML = `
      <div class="panel-header">
        <h3>Recent matches</h3>
        <a class="link-btn" onclick="setActiveScreen('match-history');renderNav('match-history');">All matches</a>
      </div>
      <div class="match-list-item">
        <span class="match-name">vs Riverside FC</span>
        <div class="match-meta"><span>Mar 28</span><span>${incidentCache.length || 3} clips</span></div>
      </div>
      <div class="match-list-item">
        <span class="match-name">vs Harbor SC</span>
        <div class="match-meta"><span>Mar 14</span><span>1 clip</span></div>
      </div>
      <div class="match-list-item">
        <span class="match-name">vs Valley United</span>
        <div class="match-meta"><span>Feb 22</span><span>4 clips</span></div>
      </div>
    `;
    quickPanel.innerHTML = `
      <div class="panel-header">
        <h3>Quick links</h3>
      </div>
      <div class="quick-links">
        <div class="quick-link-item" onclick="setActiveScreen('incidents');renderNav('incidents');">Open clips & incidents</div>
        <div class="quick-link-item" onclick="setActiveScreen('match-history');renderNav('match-history');">Match history</div>
      </div>
      <p style="font-size:0.75rem;color:var(--text-muted);margin-top:14px;">Only content approved for your role is shown. No access to other teams.</p>
    `;
  } else if (currentRole === "match_official") {
    // MATCH OFFICIAL DASHBOARD (Image 4)
    document.querySelector('.cards2-wide').style.display = 'none'; // hide default
    statsGrid.style.display = 'none'; // hide default stats grid
    
    // Inject Custom Official layout
    let officialLayout = document.getElementById('officialLayoutOverride');
    if (!officialLayout) {
      officialLayout = document.createElement('div');
      officialLayout.id = 'officialLayoutOverride';
      document.getElementById('screen-dashboard').appendChild(officialLayout);
    }
    
    officialLayout.innerHTML = `
      <div class="cards2-wide" style="margin-bottom:24px;">
        <div class="panel" style="background: linear-gradient(145deg, rgba(16,185,129,0.05) 0%, rgba(0,0,0,0) 100%); border-left: 4px solid var(--accent-primary);">
          <div class="row-between" style="margin-bottom:16px;">
            <span class="badge badge-active" style="padding:4px 8px; font-size:0.8rem;">📡 Live Now</span>
          </div>
          <div style="font-size:1.8rem; font-weight:700; margin-bottom:8px;">Riverside FC <span style="color:var(--text-muted); font-size:1.2rem; margin:0 8px;">vs</span> North End</div>
          <div class="row" style="color:var(--text-secondary); font-size:0.9rem; gap:16px; margin-bottom:24px;">
            <div>🏆 Metro Amateur League</div>
            <div>🕒 Kickoff 18:00</div>
          </div>
          <div class="row-between">
            <div style="background:rgba(255,255,255,0.05); padding:10px 16px; border-radius:var(--radius-md); display:flex; align-items:center; gap:12px;">
              <span style="font-size:1.2rem;">📹</span>
              <div>
                <div style="font-size:0.75rem; color:var(--text-muted);">Feed Status</div>
                <div style="font-weight:600; font-size:0.9rem;"><span style="color:var(--accent-primary);">●</span> Receiving 1080p</div>
              </div>
            </div>
            <button class="btn-primary" style="padding:12px 24px; font-size:1rem;" onclick="setActiveScreen('live-console');renderNav('live-console');">Open Console →</button>
          </div>
        </div>
        <div class="panel">
          <h3 style="margin-bottom:16px;">Quick Actions</h3>
          <div style="display:flex; flex-direction:column; gap:12px;">
            <div class="row-between" style="padding:14px 16px; background:var(--bg-input); border:1px solid var(--border-subtle); border-radius:var(--radius-md); cursor:pointer;" onclick="setActiveScreen('live-console');renderNav('live-console');">
              <div class="row" style="gap:12px;"><span style="color:var(--accent-primary);">🖥</span> <span style="font-weight:600;">Live Match Console</span></div>
              <span style="color:var(--text-muted);">›</span>
            </div>
            <div class="row-between" style="padding:14px 16px; background:var(--bg-input); border:1px solid var(--border-subtle); border-radius:var(--radius-md); cursor:pointer;" onclick="setActiveScreen('incidents');renderNav('incidents');">
              <div class="row" style="gap:12px;"><span style="color:var(--accent-purple);">📋</span> <span style="font-weight:600;">View Incidents Log</span></div>
              <span style="color:var(--text-muted);">›</span>
            </div>
            <div class="row-between" style="padding:14px 16px; background:var(--bg-input); border:1px solid var(--border-subtle); border-radius:var(--radius-md); cursor:pointer;">
              <div class="row" style="gap:12px;"><span style="color:var(--status-info);">🎧</span> <span style="font-weight:600;">Contact Ref Team</span></div>
              <span style="color:var(--text-muted);">›</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="cards2">
        <div class="panel">
          <div class="row-between" style="margin-bottom:16px;">
            <h3>Today's Overview</h3>
            <a href="#" style="font-size:0.8rem; color:var(--accent-primary);">View Schedule</a>
          </div>
          <div class="row" style="gap:12px; margin-bottom:24px;">
            <div style="flex:1; background:var(--bg-input); padding:16px; border-radius:var(--radius-md); text-align:center;">
              <div style="font-size:1.8rem; font-weight:700; margin-bottom:4px;">3</div>
              <div style="font-size:0.75rem; color:var(--text-muted);">Assigned</div>
            </div>
            <div style="flex:1; background:var(--bg-input); padding:16px; border-radius:var(--radius-md); text-align:center;">
              <div style="font-size:1.8rem; font-weight:700; margin-bottom:4px; color:var(--accent-primary);">1</div>
              <div style="font-size:0.75rem; color:var(--text-muted);">Completed</div>
            </div>
            <div style="flex:1; background:var(--bg-input); padding:16px; border-radius:var(--radius-md); text-align:center; position:relative;">
              <div style="position:absolute; top:8px; right:8px; width:8px; height:8px; background:var(--status-warning); border-radius:50%;"></div>
              <div style="font-size:1.8rem; font-weight:700; margin-bottom:4px; color:var(--status-warning);">2</div>
              <div style="font-size:0.75rem; color:var(--text-muted);">Pending Rev.</div>
            </div>
          </div>
          <h4 style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:12px;">Upcoming</h4>
          <div class="match-list-item" style="padding:12px 0;">
            <div class="row-between">
              <div class="row" style="gap:16px;">
                <div style="text-align:center;">
                  <div style="font-weight:600; font-size:0.9rem;">15:30</div>
                  <div style="font-size:0.7rem; color:var(--text-muted);">Sat</div>
                </div>
                <div>
                  <div style="font-weight:600; font-size:0.9rem;">Harbor SC vs Valley United</div>
                  <div style="font-size:0.75rem; color:var(--text-muted);">Coastal Cup</div>
                </div>
              </div>
              <span class="badge badge-muted" style="font-size:0.7rem;">Scheduled</span>
            </div>
          </div>
          <div class="match-list-item" style="padding:12px 0; border:none;">
            <div class="row-between">
              <div class="row" style="gap:16px;">
                <div style="text-align:center;">
                  <div style="font-weight:600; font-size:0.9rem;">14:00</div>
                  <div style="font-size:0.7rem; color:var(--text-muted);">Sun</div>
                </div>
                <div>
                  <div style="font-weight:600; font-size:0.9rem;">North End vs Riverside FC</div>
                  <div style="font-size:0.75rem; color:var(--text-muted);">Metro Amateur</div>
                </div>
              </div>
              <span class="badge badge-muted" style="font-size:0.7rem;">Scheduled</span>
            </div>
          </div>
        </div>
        
        <div class="panel">
          <div class="row-between" style="margin-bottom:20px;">
            <h3>System Health</h3>
            <span class="badge badge-active" style="font-size:0.75rem;">✓ All Systems Go</span>
          </div>
          
          <div style="margin-bottom:24px;">
            <div class="row-between" style="margin-bottom:8px;">
              <span style="font-size:0.85rem; font-weight:600;">Video Feed Latency</span>
              <span style="font-size:0.85rem; color:var(--accent-primary); font-weight:600;">0.8s <span style="font-weight:400; color:var(--text-muted);">delay</span></span>
            </div>
            <div style="width:100%; height:6px; background:var(--bg-input); border-radius:3px; overflow:hidden;">
              <div style="width:15%; height:100%; background:var(--accent-primary);"></div>
            </div>
          </div>
          
          <div style="margin-bottom:24px;">
            <div class="row-between" style="margin-bottom:8px;">
              <span style="font-size:0.85rem; font-weight:600;">AI Sync Buffer</span>
              <span style="font-size:0.85rem; color:var(--accent-primary); font-weight:600;">100% <span style="font-weight:400; color:var(--text-muted);">optimal</span></span>
            </div>
            <div style="width:100%; height:6px; background:var(--bg-input); border-radius:3px; overflow:hidden;">
              <div style="width:100%; height:100%; background:var(--accent-primary);"></div>
            </div>
          </div>
          
          <div class="row" style="gap:16px;">
            <div style="flex:1; padding:16px; background:var(--bg-input); border:1px solid var(--border-subtle); border-radius:var(--radius-md); display:flex; align-items:center; gap:12px;">
              <span style="font-size:1.2rem;">🎤</span>
              <div>
                <div style="font-size:0.7rem; color:var(--text-muted);">Mic Comms</div>
                <div style="font-size:0.85rem; font-weight:600;"><span style="color:var(--accent-primary);">●</span> Connected</div>
              </div>
            </div>
            <div style="flex:1; padding:16px; background:var(--bg-input); border:1px solid var(--border-subtle); border-radius:var(--radius-md); display:flex; align-items:center; gap:12px;">
              <span style="font-size:1.2rem;">☁️</span>
              <div>
                <div style="font-size:0.7rem; color:var(--text-muted);">Cloud Storage</div>
                <div style="font-size:0.85rem; font-weight:600;"><span style="color:var(--accent-primary);">●</span> Online</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  } else {
    // LEAGUE ADMIN DASHBOARD
    document.querySelector('.cards2-wide').style.display = 'none'; // hide default
    
    // Inject Custom Admin layout
    let adminLayout = document.getElementById('adminLayoutOverride');
    if (!adminLayout) {
      adminLayout = document.createElement('div');
      adminLayout.id = 'adminLayoutOverride';
      document.getElementById('screen-dashboard').appendChild(adminLayout);
    }
    
    statsGrid.style.gridTemplateColumns = 'repeat(4, 1fr)';
    statsGrid.innerHTML = `
      <div class="stat-card">
        <div class="stat-card-label">Total Leagues</div>
        <div class="stat-value">12</div>
        <div class="stat-sub"><span style="color:var(--accent-primary);">↑ 8.2%</span> vs last month</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">Active Seasons</div>
        <div class="stat-value" style="color:var(--status-info);">8</div>
        <div class="stat-sub">In progress</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">Matches Need Setup</div>
        <div class="stat-value" style="color:var(--status-warning);">5</div>
        <div class="stat-sub">Requires attention</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">Incidents Reviewed</div>
        <div class="stat-value" style="color:var(--accent-purple-hover);">23</div>
        <div class="stat-sub"><span style="color:var(--accent-primary);">✓</span> All processed</div>
      </div>
    `;
    
    adminLayout.innerHTML = `
      <div class="cards2-wide" style="margin-bottom:24px;">
        <div class="panel">
          <div class="panel-header">
            <h3>Recent Match Results</h3>
            <a class="link-btn" onclick="setActiveScreen('match-history');renderNav('match-history');">View All →</a>
          </div>
          <div class="match-list-item" style="display:flex; flex-direction:column; align-items:stretch;">
            <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:8px;">Premier League • 2 hours ago <span class="badge badge-active" style="float:right;">Completed</span></div>
            <div class="row-between" style="font-size:1.1rem;font-weight:600;margin-bottom:8px;">
              <div class="row"><div class="team-badge red">ARS</div> Arsenal FC</div>
              <div>3 - 1</div>
              <div class="row">Chelsea FC <div class="team-badge blue">CHE</div></div>
            </div>
            <div class="row-between" style="font-size:0.8rem;color:var(--text-muted);">
              <div>4 incidents reviewed</div>
              <div>All verified <span style="color:var(--accent-primary);">✓</span></div>
            </div>
          </div>
          <div class="match-list-item" style="display:flex; flex-direction:column; align-items:stretch;">
            <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:8px;">Championship • 5 hours ago <span class="badge badge-active" style="float:right;">Completed</span></div>
            <div class="row-between" style="font-size:1.1rem;font-weight:600;margin-bottom:8px;">
              <div class="row"><div class="team-badge yellow">NOR</div> Norwich City</div>
              <div>2 - 2</div>
              <div class="row">Leeds United <div class="team-badge" style="background:#fff;color:#000;">LEE</div></div>
            </div>
            <div class="row-between" style="font-size:0.8rem;color:var(--text-muted);">
              <div>6 incidents reviewed</div>
              <div>All verified <span style="color:var(--accent-primary);">✓</span></div>
            </div>
          </div>
          <div class="match-list-item" style="display:flex; flex-direction:column; align-items:stretch; border:none;">
            <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:8px;">League One • Yesterday <span class="badge badge-active" style="float:right;">Completed</span></div>
            <div class="row-between" style="font-size:1.1rem;font-weight:600;margin-bottom:8px;">
              <div class="row"><div class="team-badge green">PLY</div> Plymouth Argyle</div>
              <div>1 - 0</div>
              <div class="row">Portsmouth FC <div class="team-badge blue">POR</div></div>
            </div>
            <div class="row-between" style="font-size:0.8rem;color:var(--text-muted);">
              <div>2 incidents reviewed</div>
              <div>All verified <span style="color:var(--accent-primary);">✓</span></div>
            </div>
          </div>
        </div>
        <div class="panel">
          <div class="panel-header" style="margin-bottom:8px;">
            <h3>Alerts & Notifications</h3>
            <div class="notification-count" style="position:static;">3</div>
          </div>
          <div class="alert-card error">
            <div class="alert-icon">⚠️</div>
            <div>
              <div class="alert-title">Missing Video Upload</div>
              <div class="alert-desc">Match "Everton vs Fulham" has no video uploaded. Upload required for incident review.</div>
              <div class="alert-time">2 hours ago</div>
            </div>
          </div>
          <div class="alert-card warning">
            <div class="alert-icon">🤖</div>
            <div>
              <div class="alert-title">Low-Confidence AI Review</div>
              <div class="alert-desc">Offside incident in "Liverpool vs Man City" flagged for manual verification (Confidence: 62%).</div>
              <div class="alert-time">3 hours ago</div>
            </div>
          </div>
          <div class="alert-card warning">
            <div class="alert-icon">📅</div>
            <div>
              <div class="alert-title">Match Setup Incomplete</div>
              <div class="alert-desc">5 matches scheduled for this weekend need team assignments and official setup.</div>
              <div class="alert-time">5 hours ago</div>
            </div>
          </div>
          <div class="alert-card success" style="margin-bottom:0;">
            <div class="alert-icon">✓</div>
            <div>
              <div class="alert-title">Season Started Successfully</div>
              <div class="alert-desc">Championship 2024 season has begun with all teams and fixtures confirmed.</div>
              <div class="alert-time">Yesterday</div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="cards2">
        <div class="panel">
          <h3>Incident Reviews by Type</h3>
          <div class="pie-chart-container" style="margin-top:20px;">
            <div class="pie-chart">
              <div class="pie-labels">
                <div class="pie-label gl">GL<br/>25.9%</div>
                <div class="pie-label os">OS<br/>42.3%</div>
                <div class="pie-label cd">Card<br/>12.5%</div>
                <div class="pie-label fl">Foul<br/>19.3%</div>
              </div>
            </div>
          </div>
        </div>
        <div class="panel">
          <h3>Weekly Match Activity</h3>
          <div class="bar-chart-container" style="margin-top:20px;">
            <div class="bar-y-axis">
              <span>35</span><span>30</span><span>25</span><span>20</span><span>15</span><span>10</span><span>5</span><span>0</span>
            </div>
            <div class="bar-col"><div class="bar-fill" style="height:35%;"></div><div class="bar-label">Mon</div></div>
            <div class="bar-col"><div class="bar-fill" style="height:45%;"></div><div class="bar-label">Tue</div></div>
            <div class="bar-col"><div class="bar-fill" style="height:55%;"></div><div class="bar-label">Wed</div></div>
            <div class="bar-col"><div class="bar-fill" style="height:40%;"></div><div class="bar-label">Thu</div></div>
            <div class="bar-col"><div class="bar-fill" style="height:60%;"></div><div class="bar-label">Fri</div></div>
            <div class="bar-col"><div class="bar-fill" style="height:100%;"></div><div class="bar-label">Sat</div></div>
            <div class="bar-col"><div class="bar-fill" style="height:80%;"></div><div class="bar-label">Sun</div></div>
          </div>
        </div>
      </div>
    `;
  }
}

/* ===== MY ASSIGNMENTS ===== */
function renderMyAssignments() {
  if (!myAssignmentsTable) return;
  myAssignmentsTable.innerHTML = `
    <tr>
      <td>
        <div style="font-weight:600;">Today, 18:00</div>
        <div style="font-size:0.75rem;color:var(--text-muted);">Apr 8, 2026</div>
      </td>
      <td>
        <div style="font-weight:600;">Riverside FC vs North End</div>
        <div style="font-size:0.75rem;color:var(--text-muted);">Match ID: #14991</div>
      </td>
      <td>Metro Amateur League</td>
      <td>Riverside Stadium</td>
      <td><span class="badge badge-muted">🎥 Video Ref</span></td>
      <td><span class="badge badge-active">● Live</span></td>
      <td><button class="btn-primary assignment-open-console">Console</button></td>
    </tr>
    <tr>
      <td>
        <div style="font-weight:600;">Tomorrow, 15:30</div>
        <div style="font-size:0.75rem;color:var(--text-muted);">Apr 7, 2026</div>
      </td>
      <td>
        <div style="font-weight:600;">Harbor SC vs Valley United</div>
        <div style="font-size:0.75rem;color:var(--text-muted);">Match ID: #14112</div>
      </td>
      <td>Coastal Cup</td>
      <td>Harbor Point Pitch</td>
      <td><span class="badge badge-muted">🎥 Video Ref</span></td>
      <td><span class="badge badge-warning">Scheduled</span></td>
      <td><button class="secondary">Pre-open</button></td>
    </tr>
    <tr>
      <td>
        <div style="font-weight:600;">14:00</div>
        <div style="font-size:0.75rem;color:var(--text-muted);">Apr 12, 2026</div>
      </td>
      <td>
        <div style="font-weight:600;">North End vs Riverside FC</div>
        <div style="font-size:0.75rem;color:var(--text-muted);">Match ID: #14301</div>
      </td>
      <td>Metro Amateur League</td>
      <td>North End Arena</td>
      <td><span class="badge badge-muted">🎥 Video Ref</span></td>
      <td><span class="badge badge-muted">Scheduled</span></td>
      <td style="color:var(--text-muted);">—</td>
    </tr>
    <tr>
      <td>
        <div style="font-weight:600;">14:00</div>
        <div style="font-size:0.75rem;color:var(--text-muted);">Mar 28, 2026</div>
      </td>
      <td>
        <div style="font-weight:600;">Valley United vs Harbor SC</div>
        <div style="font-size:0.75rem;color:var(--text-muted);">Match ID: #12112</div>
      </td>
      <td>Coastal Cup</td>
      <td>Valley Sports Complex</td>
      <td><span class="badge badge-muted">🎥 Video Ref</span></td>
      <td><span class="badge badge-active">Completed</span></td>
      <td><button class="secondary assignment-open-incidents">Incidents</button></td>
    </tr>
  `;
  myAssignmentsTable.querySelectorAll(".assignment-open-console").forEach((btn) => {
    btn.onclick = () => {
      setActiveScreen("live-console");
      renderNav("live-console");
    };
  });
  myAssignmentsTable.querySelectorAll(".assignment-open-incidents").forEach((btn) => {
    btn.onclick = () => {
      setActiveScreen("incidents");
      renderNav("incidents");
    };
  });
}

/* ===== MATCH OFFICIALS ===== */
function renderMatchOfficials() {
  if (!matchOfficialsTable) return;
  matchOfficialsTable.innerHTML = `
    <tr>
      <td><div class="checkbox"></div></td>
      <td><div class="team-info"><div class="team-badge">MJ</div><div style="display:flex;flex-direction:column;"><strong>Michael Johnson</strong><span style="font-size:0.75rem;color:var(--text-muted);">m.johnson@email.com</span></div></div></td>
      <td>Level 4<br/><span style="font-size:0.75rem;color:var(--text-muted);">Referee</span></td>
      <td><span class="badge badge-active">Verified</span></td>
      <td><span class="badge badge-active">Cleared</span></td>
      <td><span class="badge badge-active">Available</span></td>
      <td><span class="tag">Premier</span> <span class="tag" style="background:rgba(59,130,246,0.15);">Championship</span></td>
      <td>23</td>
      <td>2 hours ago</td>
      <td><button class="action-icon official-open-detail">✏️</button></td>
    </tr>
    <tr>
      <td><div class="checkbox"></div></td>
      <td><div class="team-info"><div class="team-badge blue">SW</div><div style="display:flex;flex-direction:column;"><strong>Sarah Williams</strong><span style="font-size:0.75rem;color:var(--text-muted);">s.williams@email.com</span></div></div></td>
      <td>Level 3<br/><span style="font-size:0.75rem;color:var(--text-muted);">Assistant</span></td>
      <td><span class="badge badge-warning">Pending</span></td>
      <td><span class="badge badge-active">Cleared</span></td>
      <td><span class="badge badge-error">Unavailable</span></td>
      <td><span class="tag" style="background:rgba(124,58,237,0.15);">League One</span></td>
      <td>15</td>
      <td>1 day ago</td>
      <td><button class="action-icon official-open-detail">✏️</button></td>
    </tr>
    <tr>
      <td><div class="checkbox"></div></td>
      <td><div class="team-info"><div class="team-badge yellow">DB</div><div style="display:flex;flex-direction:column;"><strong>David Brown</strong><span style="font-size:0.75rem;color:var(--text-muted);">d.brown@email.com</span></div></div></td>
      <td>Level 5<br/><span style="font-size:0.75rem;color:var(--text-muted);">Referee</span></td>
      <td><span class="badge badge-error">Expired</span></td>
      <td><span class="badge badge-warning">Pending</span></td>
      <td><span class="badge badge-active">Available</span></td>
      <td><span class="tag">Championship</span> <span class="tag" style="background:rgba(124,58,237,0.15);">League One</span></td>
      <td>31</td>
      <td>3 days ago</td>
      <td><button class="action-icon official-open-detail">✏️</button></td>
    </tr>
  `;
  matchOfficialsTable.querySelectorAll(".official-open-detail").forEach((btn) => {
    btn.onclick = () => {
      setActiveScreen("official-detail");
      renderNav("match-officials");
    };
  });
}

/* ===== MATCH HISTORY ===== */
async function renderHistory() {
  const historyTable = document.getElementById("historyTable");
  if (!historyTable) return;
  
  try {
    if (currentRole === "team_viewer") {
      const headRow = historyTable.closest("table").querySelector("thead tr");
      if (headRow) {
        headRow.innerHTML = `
          <th>Date</th>
          <th>Fixture</th>
          <th>Competition</th>
          <th>Clips</th>
          <th>Action</th>
        `;
      }
      historyTable.innerHTML = `
        <tr><td>Mar 28, 2026</td><td>North End vs Riverside FC</td><td>Metro Amateur</td><td><span class="badge badge-purple">3</span></td><td><button class="secondary">View</button></td></tr>
        <tr><td>Mar 14, 2026</td><td>Harbor SC vs North End</td><td>Coastal Cup</td><td><span class="badge badge-purple">1</span></td><td><button class="secondary">View</button></td></tr>
        <tr><td>Feb 22, 2026</td><td>North End vs Valley United</td><td>Metro Amateur</td><td><span class="badge badge-purple">4</span></td><td><button class="secondary">View</button></td></tr>
        <tr><td>Feb 08, 2026</td><td>Westside vs North End</td><td>Metro Amateur</td><td><span class="badge badge-muted">0</span></td><td style="color:var(--text-muted);">No clips</td></tr>
      `;
      return;
    }

    const headRow = historyTable.closest("table").querySelector("thead tr");
    if (headRow) {
      headRow.innerHTML = `
        <th>Kickoff</th>
        <th>Teams</th>
        <th>Venue</th>
        <th>Officials</th>
        <th>Video Source</th>
        <th>Incidents</th>
        <th>AI Verdicts</th>
        <th>Actions</th>
      `;
    }
    // We are mocking a rich dataset to match the high-fidelity mockups,
    // as the backend doesn't provide all these UI-specific fields yet.
    historyTable.innerHTML = `
      <tr>
        <td>
          <div style="font-size:0.75rem;margin-bottom:4px;"><span class="badge badge-error" style="padding:2px 6px;">● Live</span></div>
          <div style="font-weight:600;">Today, 15:00</div>
          <div style="font-size:0.75rem;color:var(--text-muted);">Dec 15, 2024</div>
        </td>
        <td>
          <div class="team-info" style="margin-bottom:6px;"><div class="team-badge red" style="width:20px;height:20px;font-size:0.6rem;">MU</div> Manchester United</div>
          <div class="team-info"><div class="team-badge blue" style="width:20px;height:20px;font-size:0.6rem;">CHE</div> Chelsea FC</div>
        </td>
        <td style="color:var(--text-secondary);">Old Trafford<br/><span style="font-size:0.75rem;">Manchester</span></td>
        <td style="color:var(--text-secondary);">Michael Oliver<br/><span style="font-size:0.75rem;">Main Referee</span></td>
        <td><span class="badge badge-purple">📡 Live Stream</span></td>
        <td><span style="color:var(--accent-primary);font-weight:700;">8</span> incidents</td>
        <td style="font-size:0.8rem;font-weight:600;">
          <span style="color:var(--accent-primary);margin-right:8px;">3 Onside</span>
          <span style="color:var(--status-error);margin-right:8px;">2 Offside</span>
          <span style="color:var(--status-info);">3 Goals</span>
        </td>
        <td>
          <div class="action-icons">
            <button class="action-icon" style="background:var(--accent-primary);color:#000;">▶</button>
            <button class="action-icon">▤</button>
          </div>
        </td>
      </tr>
      <tr>
        <td>
          <div style="font-size:0.75rem;margin-bottom:4px;"><span class="badge badge-active" style="padding:2px 6px;">Completed</span></div>
          <div style="font-weight:600;">Dec 14, 19:45</div>
          <div style="font-size:0.75rem;color:var(--text-muted);">Yesterday</div>
        </td>
        <td>
          <div class="team-info" style="margin-bottom:6px;"><div class="team-badge yellow" style="width:20px;height:20px;font-size:0.6rem;">ARS</div> Arsenal FC</div>
          <div class="team-info"><div class="team-badge blue" style="width:20px;height:20px;font-size:0.6rem;">MC</div> Manchester City</div>
        </td>
        <td style="color:var(--text-secondary);">Emirates Stadium<br/><span style="font-size:0.75rem;">London</span></td>
        <td style="color:var(--text-secondary);">Anthony Taylor<br/><span style="font-size:0.75rem;">Main Referee</span></td>
        <td><span class="badge badge-muted">↑ Upload</span></td>
        <td><span style="color:var(--accent-primary);font-weight:700;">12</span> incidents</td>
        <td style="font-size:0.8rem;font-weight:600;">
          <span style="color:var(--accent-primary);margin-right:8px;">5 Onside</span>
          <span style="color:var(--status-error);margin-right:8px;">4 Offside</span>
          <span style="color:var(--status-info);">2 Goals</span>
        </td>
        <td>
          <div class="action-icons">
            <button class="action-icon" style="background:var(--accent-primary);color:#000;">▶</button>
            <button class="action-icon">▤</button>
          </div>
        </td>
      </tr>
      <tr>
        <td>
          <div style="font-size:0.75rem;margin-bottom:4px;"><span class="badge badge-warning" style="padding:2px 6px;">Scheduled</span></div>
          <div style="font-weight:600;">Dec 17, 16:30</div>
          <div style="font-size:0.75rem;color:var(--text-muted);">in 2 days</div>
        </td>
        <td>
          <div class="team-info" style="margin-bottom:6px;"><div class="team-badge red" style="width:20px;height:20px;font-size:0.6rem;">LIV</div> Liverpool FC</div>
          <div class="team-info"><div class="team-badge" style="background:#fff;color:#000;width:20px;height:20px;font-size:0.6rem;">TOT</div> Tottenham</div>
        </td>
        <td style="color:var(--text-secondary);">Anfield<br/><span style="font-size:0.75rem;">Liverpool</span></td>
        <td style="color:var(--text-secondary);">Paul Tierney<br/><span style="font-size:0.75rem;">Main Referee</span></td>
        <td><span class="badge badge-muted">🕒 Not Started</span></td>
        <td><span style="font-weight:700;color:var(--text-muted);">0</span> incidents</td>
        <td style="font-size:0.8rem;color:var(--text-muted);">No data</td>
        <td>
          <div class="action-icons">
            <button class="action-icon">↑</button>
            <button class="action-icon">📡</button>
          </div>
        </td>
      </tr>
      <tr>
        <td>
          <div style="font-size:0.75rem;margin-bottom:4px;"><span class="badge badge-active" style="padding:2px 6px;">Completed</span></div>
          <div style="font-weight:600;">Dec 13, 20:00</div>
          <div style="font-size:0.75rem;color:var(--text-muted);">2 days ago</div>
        </td>
        <td>
          <div class="team-info" style="margin-bottom:6px;"><div class="team-badge" style="background:#000;border:1px solid #333;width:20px;height:20px;font-size:0.6rem;">NEW</div> Newcastle United</div>
          <div class="team-info"><div class="team-badge yellow" style="width:20px;height:20px;font-size:0.6rem;">WOL</div> Wolverhampton</div>
        </td>
        <td style="color:var(--text-secondary);">St James' Park<br/><span style="font-size:0.75rem;">Newcastle</span></td>
        <td style="color:var(--text-secondary);">Simon Hooper<br/><span style="font-size:0.75rem;">Main Referee</span></td>
        <td><span class="badge badge-muted">↑ Upload</span></td>
        <td><span style="color:var(--accent-primary);font-weight:700;">6</span> incidents</td>
        <td style="font-size:0.8rem;font-weight:600;">
          <span style="color:var(--accent-primary);margin-right:8px;">4 Onside</span>
          <span style="color:var(--status-info);">2 Goals</span>
        </td>
        <td>
          <div class="action-icons">
            <button class="action-icon" style="background:var(--accent-primary);color:#000;">▶</button>
            <button class="action-icon">▤</button>
          </div>
        </td>
      </tr>
    `;
  } catch (err) {
    historyTable.innerHTML = '<tr><td colspan="8" style="text-align:center;">Failed to load matches</td></tr>';
  }
}

/* ===== LEAGUES (Admin) ===== */
async function renderLeagues() {
  const tbody = document.getElementById("leaguesTableBody");
  const statsBar = document.getElementById("leagueStatsBar");
  
  try {
    // We mock the full dataset to match the high-fidelity mockups
    tbody.innerHTML = `
      <tr>
        <td><div class="checkbox"></div></td>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <div class="league-icon" style="background:rgba(239,68,68,0.1);color:#ef4444;">🏆</div>
            <div>
              <div style="font-weight:600;">Premier League</div>
              <div style="font-size:0.75rem;color:var(--text-muted);">Top tier competition</div>
            </div>
          </div>
        </td>
        <td>2024</td>
        <td>20</td>
        <td>156</td>
        <td style="color:var(--text-secondary);">2 hours ago</td>
        <td><span class="badge badge-active" style="background:rgba(16,185,129,0.1);color:var(--accent-primary);border:1px solid rgba(16,185,129,0.2);">Active</span></td>
        <td>
          <div class="action-icons">
            <button class="action-icon" title="View">👁</button>
            <button class="action-icon" title="Calendar">📅</button>
            <button class="action-icon" title="More">⋯</button>
          </div>
        </td>
      </tr>
      <tr>
        <td><div class="checkbox"></div></td>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <div class="league-icon" style="background:rgba(59,130,246,0.1);color:#3b82f6;">🏆</div>
            <div>
              <div style="font-weight:600;">Championship</div>
              <div style="font-size:0.75rem;color:var(--text-muted);">Second tier competition</div>
            </div>
          </div>
        </td>
        <td>2024</td>
        <td>24</td>
        <td>198</td>
        <td style="color:var(--text-secondary);">5 hours ago</td>
        <td><span class="badge badge-active" style="background:rgba(16,185,129,0.1);color:var(--accent-primary);border:1px solid rgba(16,185,129,0.2);">Active</span></td>
        <td>
          <div class="action-icons">
            <button class="action-icon" title="View">👁</button>
            <button class="action-icon" title="Calendar">📅</button>
            <button class="action-icon" title="More">⋯</button>
          </div>
        </td>
      </tr>
      <tr>
        <td><div class="checkbox"></div></td>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <div class="league-icon" style="background:rgba(245,158,11,0.1);color:#f59e0b;">🏆</div>
            <div>
              <div style="font-weight:600;">League One</div>
              <div style="font-size:0.75rem;color:var(--text-muted);">Third tier competition</div>
            </div>
          </div>
        </td>
        <td>2024</td>
        <td>24</td>
        <td>142</td>
        <td style="color:var(--text-secondary);">Yesterday</td>
        <td><span class="badge badge-active" style="background:rgba(16,185,129,0.1);color:var(--accent-primary);border:1px solid rgba(16,185,129,0.2);">Active</span></td>
        <td>
          <div class="action-icons">
            <button class="action-icon" title="View">👁</button>
            <button class="action-icon" title="Calendar">📅</button>
            <button class="action-icon" title="More">⋯</button>
          </div>
        </td>
      </tr>
      <tr>
        <td><div class="checkbox"></div></td>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <div class="league-icon" style="background:rgba(124,58,237,0.1);color:#7c3aed;">🏆</div>
            <div>
              <div style="font-weight:600;">Women's Super League</div>
              <div style="font-size:0.75rem;color:var(--text-muted);">Elite women's competition</div>
            </div>
          </div>
        </td>
        <td>2024</td>
        <td>12</td>
        <td>88</td>
        <td style="color:var(--text-secondary);">2 days ago</td>
        <td><span class="badge badge-active" style="background:rgba(16,185,129,0.1);color:var(--accent-primary);border:1px solid rgba(16,185,129,0.2);">Active</span></td>
        <td>
          <div class="action-icons">
            <button class="action-icon" title="View">👁</button>
            <button class="action-icon" title="Calendar">📅</button>
            <button class="action-icon" title="More">⋯</button>
          </div>
        </td>
      </tr>
      <tr>
        <td><div class="checkbox"></div></td>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <div class="league-icon" style="background:rgba(249,115,22,0.1);color:#f97316;">🏆</div>
            <div>
              <div style="font-weight:600;">Youth League U21</div>
              <div style="font-size:0.75rem;color:var(--text-muted);">Under 21 development league</div>
            </div>
          </div>
        </td>
        <td>2024</td>
        <td>16</td>
        <td>64</td>
        <td style="color:var(--text-secondary);">3 days ago</td>
        <td><span class="badge badge-warning" style="background:rgba(249,115,22,0.1);color:var(--status-draft);border:1px solid rgba(249,115,22,0.2);">Draft</span></td>
        <td>
          <div class="action-icons">
            <button class="action-icon" title="View">👁</button>
            <button class="action-icon" title="Calendar">📅</button>
            <button class="action-icon" title="More">⋯</button>
          </div>
        </td>
      </tr>
      <tr>
        <td><div class="checkbox"></div></td>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <div class="league-icon" style="background:rgba(107,127,160,0.1);color:var(--text-muted);">🏆</div>
            <div>
              <div style="font-weight:600;color:var(--text-secondary);">Premier League 2023</div>
              <div style="font-size:0.75rem;color:var(--text-muted);">Previous season archive</div>
            </div>
          </div>
        </td>
        <td>2023</td>
        <td>20</td>
        <td>380</td>
        <td style="color:var(--text-secondary);">2 months ago</td>
        <td><span class="badge badge-muted" style="background:rgba(107,127,160,0.1);color:var(--text-muted);border:1px solid rgba(107,127,160,0.2);">Archived</span></td>
        <td>
          <div class="action-icons">
            <button class="action-icon" title="View">👁</button>
            <button class="action-icon" title="Calendar">📅</button>
            <button class="action-icon" title="More">⋯</button>
          </div>
        </td>
      </tr>
    `;

    statsBar.innerHTML = `
      <div class="stat-bar-item">
        <div class="stat-bar-icon green">🏆</div>
        <div style="flex:1;">
          <div class="row-between">
            <div class="stat-bar-value">12</div>
            <div class="stat-bar-change positive">+12%</div>
          </div>
          <div class="stat-bar-label">Total Leagues</div>
        </div>
      </div>
      <div class="stat-bar-item">
        <div class="stat-bar-icon blue">👥</div>
        <div style="flex:1;">
          <div class="row-between">
            <div class="stat-bar-value">156</div>
            <div class="stat-bar-change positive">+8%</div>
          </div>
          <div class="stat-bar-label">Total Teams</div>
        </div>
      </div>
      <div class="stat-bar-item">
        <div class="stat-bar-icon purple">📅</div>
        <div style="flex:1;">
          <div class="row-between">
            <div class="stat-bar-value">728</div>
            <div class="stat-bar-change positive">+24%</div>
          </div>
          <div class="stat-bar-label">Total Matches</div>
        </div>
      </div>
      <div class="stat-bar-item">
        <div class="stat-bar-icon green" style="color:var(--accent-primary);background:rgba(16,185,129,0.1);">✓</div>
        <div style="flex:1;">
          <div class="row-between">
            <div class="stat-bar-value">8</div>
            <div class="stat-bar-change" style="color:var(--text-secondary);">67%</div>
          </div>
          <div class="stat-bar-label">Active Leagues</div>
        </div>
      </div>
    `;
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Failed to load leagues</td></tr>';
  }
}

/* ===== TEAM LIST (Admin) ===== */
async function renderTeamList() {
  const tbody = document.getElementById("teamListBody");
  try {
    // We mock the full dataset to match the high-fidelity mockups
    tbody.innerHTML = `
      <tr>
        <td><div class="checkbox"></div></td>
        <td><div class="team-info"><div class="team-badge red">MU</div> <div style="display:flex;flex-direction:column;"><span style="font-weight:600;font-size:0.9rem;">Manchester United</span><span style="font-size:0.75rem;color:var(--text-muted);">Founded 1878</span></div></div></td>
        <td style="color:var(--text-secondary);">Premier League</td>
        <td style="color:var(--text-secondary);">25</td>
        <td style="color:var(--text-secondary);">18</td>
        <td><span class="badge badge-active" style="background:rgba(16,185,129,0.1);color:var(--accent-primary);border:1px solid rgba(16,185,129,0.2);">Active</span></td>
        <td>
          <div class="action-icons">
            <button class="action-icon team-open-detail" title="View">👁</button>
            <button class="action-icon team-open-detail" title="Edit">✏️</button>
            <button class="action-icon" title="Delete">🗑</button>
          </div>
        </td>
      </tr>
      <tr>
        <td><div class="checkbox"></div></td>
        <td><div class="team-info"><div class="team-badge blue">CHE</div> <div style="display:flex;flex-direction:column;"><span style="font-weight:600;font-size:0.9rem;">Chelsea FC</span><span style="font-size:0.75rem;color:var(--text-muted);">Founded 1905</span></div></div></td>
        <td style="color:var(--text-secondary);">Premier League</td>
        <td style="color:var(--text-secondary);">23</td>
        <td style="color:var(--text-secondary);">16</td>
        <td><span class="badge badge-active" style="background:rgba(16,185,129,0.1);color:var(--accent-primary);border:1px solid rgba(16,185,129,0.2);">Active</span></td>
        <td>
          <div class="action-icons">
            <button class="action-icon team-open-detail" title="View">👁</button>
            <button class="action-icon team-open-detail" title="Edit">✏️</button>
            <button class="action-icon" title="Delete">🗑</button>
          </div>
        </td>
      </tr>
      <tr>
        <td><div class="checkbox"></div></td>
        <td><div class="team-info"><div class="team-badge yellow">NOR</div> <div style="display:flex;flex-direction:column;"><span style="font-weight:600;font-size:0.9rem;">Norwich City</span><span style="font-size:0.75rem;color:var(--text-muted);">Founded 1902</span></div></div></td>
        <td style="color:var(--text-secondary);">Championship</td>
        <td style="color:var(--text-secondary);">22</td>
        <td style="color:var(--text-secondary);">14</td>
        <td><span class="badge badge-error" style="background:rgba(239,68,68,0.1);color:var(--status-error);border:1px solid rgba(239,68,68,0.2);">Inactive</span></td>
        <td>
          <div class="action-icons">
            <button class="action-icon team-open-detail" title="View">👁</button>
            <button class="action-icon team-open-detail" title="Edit">✏️</button>
            <button class="action-icon" title="Delete">🗑</button>
          </div>
        </td>
      </tr>
    `;
    
    tbody.querySelectorAll(".team-open-detail").forEach((btn) => {
      btn.onclick = () => {
        setActiveScreen("team-detail");
        renderNav("team-list");
      };
    });

    // Also inject filters above the table and pagination below it
    const listPanel = document.getElementById('screen-team-list').querySelector('.panel');
    const header = listPanel.querySelector('.panel-header');
    
    // Replace the simple search bar with the complex filters if not already done
    if (!header.querySelector('select')) {
      header.innerHTML = `
        <div class="row" style="width:100%; gap:12px;">
          <div class="search-bar" style="flex:1;">
            <span class="search-icon">🔍</span>
            <input type="text" placeholder="Search teams..." style="width:100%;" />
          </div>
          <select style="width:200px;"><option>All Leagues</option></select>
          <select style="width:200px;"><option>All Status</option></select>
        </div>
      `;
      // Put the sort by outside the header, above the table
      const sortRow = document.createElement('div');
      sortRow.className = "row-between";
      sortRow.style.marginBottom = "16px";
      sortRow.style.padding = "0 8px";
      sortRow.innerHTML = `
        <div style="font-size:0.8rem;color:var(--text-muted);">Sort by: <span style="color:var(--accent-primary);margin-left:8px;cursor:pointer;">A-Z</span> <span style="margin-left:8px;cursor:pointer;">Newest</span></div>
        <div class="row">
          <span style="font-size:0.8rem;color:var(--text-muted);margin-right:16px;">Showing 24 of 156 teams</span>
          <div class="checkbox"></div>
          <span style="font-size:0.8rem;color:var(--text-muted);margin-left:4px;">Select All</span>
        </div>
      `;
      header.insertAdjacentElement('afterend', sortRow);
      
      // Update table headers to match mockup
      const thead = listPanel.querySelector('thead tr');
      thead.innerHTML = `
        <th style="width:30px;"></th>
        <th>Team</th>
        <th>League</th>
        <th>Players</th>
        <th>Matches</th>
        <th>Status</th>
        <th>Actions</th>
      `;
      
      // Add pagination
      const pagination = document.createElement('div');
      pagination.className = "pagination";
      pagination.style.padding = "16px 20px";
      pagination.innerHTML = `
        <span class="pagination-info">Showing 1-10 of 156 results</span>
        <div class="pagination-buttons">
          <button class="page-btn">‹</button>
          <button class="page-btn active">1</button>
          <button class="page-btn">2</button>
          <button class="page-btn">3</button>
          <button class="page-btn">›</button>
        </div>
      `;
      listPanel.appendChild(pagination);
    }

  } catch(err) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Failed to load teams</td></tr>';
  }
}

/* ===== TEAM DETAIL FORM ===== */
function renderTeamDetail() {
  if (!teamDetailContent) return;
  teamDetailContent.innerHTML = `
    <div class="animate-in">
      <div class="panel">
        <div class="row-between" style="margin-bottom:8px;">
          <div>
            <h3>Edit Team Profile</h3>
            <p style="font-size:0.85rem;color:var(--text-muted);">Update team information and settings</p>
          </div>
          <button class="secondary team-detail-back-btn">← Back to Team List</button>
        </div>
        <div class="form-grid">
          <div class="form-field full-width">
            <label>Team Name *</label>
            <input type="text" value="Manchester United" />
          </div>
          <div class="form-field full-width">
            <label>Team Logo</label>
            <div style="border:1px dashed var(--border-subtle);border-radius:var(--radius-md);padding:20px;text-align:center;background:var(--bg-panel-soft);">
              <div class="team-badge red" style="width:48px;height:48px;margin:0 auto 8px auto;">MU</div>
              <div style="font-size:0.82rem;color:var(--text-muted);">Click to upload or drag and drop (PNG/JPG up to 5MB)</div>
            </div>
          </div>
          <div class="form-field">
            <label>League *</label>
            <select><option>Premier League</option><option>Championship</option></select>
          </div>
          <div class="form-field">
            <label>Founded Year</label>
            <input type="number" value="1878" />
          </div>
          <div class="form-field">
            <label>Stadium</label>
            <input type="text" value="Old Trafford" />
          </div>
          <div class="form-field">
            <label>Manager</label>
            <input type="text" value="Erik ten Hag" />
          </div>
          <div class="form-field full-width">
            <label>Contact Email</label>
            <input type="email" value="admin@manutd.com" />
          </div>
          <div class="form-field full-width">
            <label>Notes (Optional)</label>
            <textarea rows="4" placeholder="Add any additional notes about the team..."></textarea>
          </div>
        </div>
        <div class="row-between" style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border-subtle);">
          <button class="btn-danger">🗑 Delete Team</button>
          <div class="btn-group">
            <button class="secondary team-detail-back-btn">Cancel</button>
            <button class="btn-primary">💾 Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  `;
  teamDetailContent.querySelectorAll(".team-detail-back-btn").forEach((btn) => {
    btn.onclick = () => {
      setActiveScreen("team-list");
      renderNav("team-list");
    };
  });
}

/* ===== LEAGUE DETAIL FORM ===== */
function renderLeagueDetail() {
  const el = document.getElementById("leagueDetailContent");
  el.innerHTML = `
    <div class="animate-in" style="display:flex; flex-direction:column; gap:24px;">
      
      <!-- Basic Information -->
      <div class="panel">
        <h3 style="margin-bottom:16px;">Basic Information</h3>
        <div class="form-grid">
          <div class="form-field full-width">
            <label>League Name *</label>
            <input type="text" value="Premier League" />
          </div>
          <div class="form-field">
            <label>Season Start Date</label>
            <input type="date" value="2024-08-15" />
          </div>
          <div class="form-field">
            <label>Season End Date</label>
            <input type="date" value="2025-05-25" />
          </div>
          <div class="form-field full-width">
            <label>Description</label>
            <textarea rows="3">Top tier English professional football league.</textarea>
          </div>
        </div>
      </div>

      <!-- Competition Format -->
      <div class="panel">
        <h3 style="margin-bottom:16px;">Competition Format</h3>
        <div class="form-grid">
          <div class="form-field">
            <label>Format Type</label>
            <select><option>Round Robin</option><option>Knockout</option></select>
          </div>
          <div class="form-field">
            <label>Number of Teams</label>
            <input type="number" value="20" />
          </div>
        </div>
      </div>

      <!-- Match Rules -->
      <div class="panel">
        <h3 style="margin-bottom:16px;">Match Rules</h3>
        <div class="form-grid" style="margin-bottom:20px;">
          <div class="form-field">
            <label>Half Length (Minutes)</label>
            <input type="number" value="45" />
          </div>
          <div class="form-field">
            <label>Extra Time</label>
            <select><option>None</option><option>Standard (2 x 15m)</option></select>
          </div>
        </div>
        <div style="display:flex; flex-direction:column; gap:16px;">
          <div class="row-between" style="padding:16px; border:1px solid var(--border-subtle); border-radius:var(--radius-md);">
            <div>
              <div style="font-weight:600;margin-bottom:4px;">AI Review System Enabled</div>
              <div style="font-size:0.8rem;color:var(--text-muted);">Allow AI generation of incidents.</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" checked>
              <span class="slider"></span>
            </label>
          </div>
          <div class="row-between" style="padding:16px; border:1px solid var(--border-subtle); border-radius:var(--radius-md);">
            <div>
              <div style="font-weight:600;margin-bottom:4px;">VAR Protocol</div>
              <div style="font-size:0.8rem;color:var(--text-muted);">Require formal VAR steps for review.</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" checked>
              <span class="slider"></span>
            </label>
          </div>
        </div>
      </div>

      <!-- Teams Management -->
      <div class="panel">
        <div class="row-between" style="margin-bottom:16px;">
          <h3>Teams Management (20)</h3>
          <button class="secondary" style="font-size:0.8rem;">⬆ Import from CSV</button>
        </div>
        <table class="table" style="margin-bottom:0;">
          <thead><tr><th>Team Name</th><th>Home Venue</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            <tr>
              <td><div class="team-info"><div class="team-badge red" style="width:24px;height:24px;font-size:0.6rem;">ARS</div> Arsenal FC</div></td>
              <td>Emirates Stadium</td>
              <td><span class="badge badge-active">Active</span></td>
              <td><button class="action-icon">🗑</button></td>
            </tr>
            <tr>
              <td><div class="team-info"><div class="team-badge blue" style="width:24px;height:24px;font-size:0.6rem;">CHE</div> Chelsea FC</div></td>
              <td>Stamford Bridge</td>
              <td><span class="badge badge-active">Active</span></td>
              <td><button class="action-icon">🗑</button></td>
            </tr>
            <tr><td colspan="4" style="text-align:center;font-size:0.8rem;color:var(--text-muted);padding:10px;">+ 18 more teams</td></tr>
          </tbody>
        </table>
        <div style="margin-top:16px;">
          <input type="text" placeholder="Add team by name..." style="width:200px;margin-right:8px;" />
          <button class="btn-primary" style="padding:6px 12px;">Add</button>
        </div>
      </div>

      <!-- Officials Access Settings -->
      <div class="panel">
        <h3 style="margin-bottom:16px;">Officials Access Settings</h3>
        <div style="display:flex; flex-direction:column; gap:16px;">
          <div class="row-between" style="padding:16px; border:1px solid var(--border-subtle); border-radius:var(--radius-md);">
            <div>
              <div style="font-weight:600;margin-bottom:4px;">Allow Match Officials to Create Matches</div>
              <div style="font-size:0.8rem;color:var(--text-muted);">If disabled, only League Admins can create.</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox">
              <span class="slider"></span>
            </label>
          </div>
          <div class="row-between" style="padding:16px; border:1px solid var(--border-subtle); border-radius:var(--radius-md);">
            <div>
              <div style="font-weight:600;margin-bottom:4px;">Restrict Incident Deletion</div>
              <div style="font-size:0.8rem;color:var(--text-muted);">Officials cannot delete confirmed incidents.</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" checked>
              <span class="slider"></span>
            </label>
          </div>
        </div>
      </div>

      <!-- Storage Policy -->
      <div class="panel">
        <h3 style="margin-bottom:16px;">Storage Policy</h3>
        <div class="warning-box" style="margin-bottom:16px;">
          <div style="font-size:1.5rem;">⚠️</div>
          <div>
            <div style="font-weight:600;margin-bottom:4px;">Data Retention Policy</div>
            <div style="font-size:0.85rem;">All video data will be securely stored for 90 days after the season ends. Past this period, videos are archived or purged according to platform configuration.</div>
          </div>
        </div>
        <div class="row" style="gap:8px;">
          <input type="checkbox" id="storageAck" checked />
          <label for="storageAck" style="font-size:0.85rem;font-weight:400;margin:0;">I acknowledge the storage policy constraints for this league.</label>
        </div>
      </div>

      <!-- Permissions Summary -->
      <div class="panel">
        <h3 style="margin-bottom:16px;">Permissions Summary</h3>
        <div class="row" style="gap:16px; align-items:stretch;">
          <div class="perm-card">
            <h4>League Admin</h4>
            <ul class="perm-list">
              <li class="yes">Manage teams & fixtures</li>
              <li class="yes">Override AI verdicts</li>
              <li class="yes">Configure rules</li>
            </ul>
          </div>
          <div class="perm-card">
            <h4>Match Official</h4>
            <ul class="perm-list">
              <li class="yes">Trigger live reviews</li>
              <li class="yes">Upload video</li>
              <li class="no">Edit past verdicts</li>
            </ul>
          </div>
          <div class="perm-card">
            <h4>Team Viewer</h4>
            <ul class="perm-list">
              <li class="yes">View own team clips</li>
              <li class="no">View other teams</li>
              <li class="no">Edit verdicts</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Action Footer -->
      <div class="row-between" style="padding:20px 0; border-top:1px solid var(--border-subtle);">
        <button class="secondary" style="color:var(--status-error); border-color:var(--status-error);">Archive League</button>
        <div class="row" style="gap:12px;">
          <button class="secondary">Discard Changes</button>
          <button class="btn-primary" style="padding:8px 24px;">Save League</button>
        </div>
      </div>

    </div>
  `;
}

/* ===== MATCH OFFICIALS LIST (Admin) ===== */
async function renderMatchOfficials() {
  const tbody = document.getElementById("matchOfficialsTable");
  if (!tbody) return;
  
  tbody.innerHTML = `
    <tr>
      <td><div class="checkbox"></div></td>
      <td>
        <div style="display:flex;align-items:center;gap:10px;">
          <div class="team-badge" style="width:32px;height:32px;border-radius:50%;background:#4b5563;">MJ</div>
          <div>
            <div style="font-weight:600;font-size:0.9rem;">Michael Johnson</div>
            <div style="font-size:0.75rem;color:var(--text-muted);">m.johnson@email.com</div>
          </div>
        </div>
      </td>
      <td style="color:var(--text-secondary);">Level 4<br/><span style="font-size:0.75rem;color:var(--text-muted);">Referee</span></td>
      <td><span class="badge badge-active" style="padding:4px 8px;font-size:0.75rem;">Verified</span></td>
      <td><span class="badge badge-active" style="padding:4px 8px;font-size:0.75rem;">Cleared</span></td>
      <td><span class="badge badge-active" style="padding:4px 8px;font-size:0.75rem;">Available</span></td>
      <td>
        <div style="display:flex;gap:4px;flex-wrap:wrap;">
          <span class="tag" style="font-size:0.65rem;">Premier</span>
          <span class="tag" style="font-size:0.65rem;background:rgba(124,58,237,0.1);color:var(--accent-purple-hover);">Championship</span>
        </div>
      </td>
      <td style="color:var(--text-secondary);">23</td>
      <td style="color:var(--text-secondary);">2 hours ago</td>
      <td>
        <div class="action-icons">
          <button class="action-icon open-official-btn" title="View">👁</button>
          <button class="action-icon open-official-btn" title="Edit">✏️</button>
          <button class="action-icon" title="Deactivate">🚫</button>
        </div>
      </td>
    </tr>
    <tr>
      <td><div class="checkbox"></div></td>
      <td>
        <div style="display:flex;align-items:center;gap:10px;">
          <div class="team-badge" style="width:32px;height:32px;border-radius:50%;background:#6b7280;">SW</div>
          <div>
            <div style="font-weight:600;font-size:0.9rem;">Sarah Williams</div>
            <div style="font-size:0.75rem;color:var(--text-muted);">s.williams@email.com</div>
          </div>
        </div>
      </td>
      <td style="color:var(--text-secondary);">Level 3<br/><span style="font-size:0.75rem;color:var(--text-muted);">Assistant</span></td>
      <td><span class="badge badge-warning" style="padding:4px 8px;font-size:0.75rem;">Pending</span></td>
      <td><span class="badge badge-active" style="padding:4px 8px;font-size:0.75rem;">Cleared</span></td>
      <td><span class="badge badge-error" style="padding:4px 8px;font-size:0.75rem;">Unavailable</span></td>
      <td>
        <div style="display:flex;gap:4px;flex-wrap:wrap;">
          <span class="tag" style="font-size:0.65rem;background:rgba(59,130,246,0.1);color:var(--status-info);">League One</span>
        </div>
      </td>
      <td style="color:var(--text-secondary);">15</td>
      <td style="color:var(--text-secondary);">1 day ago</td>
      <td>
        <div class="action-icons">
          <button class="action-icon open-official-btn" title="View">👁</button>
          <button class="action-icon open-official-btn" title="Edit">✏️</button>
          <button class="action-icon" title="Deactivate">🚫</button>
        </div>
      </td>
    </tr>
  `;

  tbody.querySelectorAll(".open-official-btn").forEach((btn) => {
    btn.onclick = () => {
      setActiveScreen("official-detail");
    };
  });
}

/* ===== MY ASSIGNMENTS (Match Official) ===== */
async function renderMyAssignments() {
  const tbody = document.getElementById("myAssignmentsTable");
  if (!tbody) return;
  
  tbody.innerHTML = `
    <tr style="background:rgba(16,185,129,0.02);">
      <td>
        <div style="font-weight:600;font-size:0.9rem;">Today, 18:00</div>
        <div style="font-size:0.75rem;color:var(--text-muted);">Apr 6, 2026</div>
      </td>
      <td>
        <div style="font-weight:600;font-size:0.9rem;">Riverside FC</div>
        <div style="font-size:0.75rem;color:var(--text-muted);">vs</div>
        <div style="font-weight:600;font-size:0.9rem;">North End</div>
        <div style="font-size:0.7rem;color:var(--text-muted);">Match ID: #48291</div>
      </td>
      <td style="color:var(--text-secondary);font-size:0.85rem;">Metro Amateur League</td>
      <td style="color:var(--text-secondary);font-size:0.85rem;">Riverside Stadium</td>
      <td><div class="row" style="gap:6px;font-size:0.82rem;"><span style="font-size:1rem;">📹</span> Video Ref</div></td>
      <td><span class="badge badge-active" style="padding:4px 10px;font-size:0.75rem;">● Live</span></td>
      <td>
        <div class="row" style="gap:8px;">
          <button class="btn-primary" style="padding:6px 14px;font-size:0.82rem;" onclick="setActiveScreen('live-console');">Console</button>
        </div>
      </td>
    </tr>
    <tr>
      <td>
        <div style="font-weight:600;font-size:0.9rem;">Tomorrow, 15:30</div>
        <div style="font-size:0.75rem;color:var(--text-muted);">Apr 7, 2026</div>
      </td>
      <td>
        <div style="font-weight:600;font-size:0.9rem;">Harbor SC</div>
        <div style="font-size:0.75rem;color:var(--text-muted);">vs</div>
        <div style="font-weight:600;font-size:0.9rem;">Valley United</div>
        <div style="font-size:0.7rem;color:var(--text-muted);">Match ID: #48293</div>
      </td>
      <td style="color:var(--text-secondary);font-size:0.85rem;">Coastal Cup</td>
      <td style="color:var(--text-secondary);font-size:0.85rem;">Harbor Point Pitch</td>
      <td><div class="row" style="gap:6px;font-size:0.82rem;"><span style="font-size:1rem;">📹</span> Video Ref</div></td>
      <td><span class="badge badge-muted" style="padding:4px 10px;font-size:0.75rem;">Scheduled</span></td>
      <td>
        <button class="secondary" style="padding:6px 14px;font-size:0.82rem;">Pre-open</button>
      </td>
    </tr>
    <tr>
      <td>
        <div style="font-weight:600;font-size:0.9rem;">14:00</div>
        <div style="font-size:0.75rem;color:var(--text-muted);">Apr 12, 2026</div>
      </td>
      <td>
        <div style="font-weight:600;font-size:0.9rem;">North End</div>
        <div style="font-size:0.75rem;color:var(--text-muted);">vs</div>
        <div style="font-weight:600;font-size:0.9rem;">Riverside FC</div>
        <div style="font-size:0.7rem;color:var(--text-muted);">Match ID: #48301</div>
      </td>
      <td style="color:var(--text-secondary);font-size:0.85rem;">Metro Amateur League</td>
      <td style="color:var(--text-secondary);font-size:0.85rem;">North End Arena</td>
      <td><div class="row" style="gap:6px;font-size:0.82rem;"><span style="font-size:1rem;">📹</span> Video Ref</div></td>
      <td><span class="badge badge-muted" style="padding:4px 10px;font-size:0.75rem;">Scheduled</span></td>
      <td><span style="color:var(--text-muted);">—</span></td>
    </tr>
    <tr>
      <td>
        <div style="font-weight:600;font-size:0.9rem;">14:00</div>
        <div style="font-size:0.75rem;color:var(--text-muted);">Mar 28, 2026</div>
      </td>
      <td>
        <div style="font-weight:600;font-size:0.9rem;">Valley United</div>
        <div style="font-size:0.75rem;color:var(--text-muted);">vs</div>
        <div style="font-weight:600;font-size:0.9rem;">Harbor SC</div>
        <div style="font-size:0.7rem;color:var(--text-muted);">Match ID: #48112</div>
      </td>
      <td style="color:var(--text-secondary);font-size:0.85rem;">Coastal Cup</td>
      <td style="color:var(--text-secondary);font-size:0.85rem;">Valley Sports Complex</td>
      <td><div class="row" style="gap:6px;font-size:0.82rem;"><span style="font-size:1rem;">📹</span> Video Ref</div></td>
      <td><span class="badge badge-muted" style="padding:4px 10px;font-size:0.75rem;">Completed</span></td>
      <td>
        <button class="btn-ghost" style="color:var(--accent-primary);font-size:0.85rem;" onclick="setActiveScreen('incidents');">Incidents</button>
      </td>
    </tr>
  `;
}

/* ===== OFFICIAL DETAIL / USER FORM (Admin) ===== */
function renderOfficialDetail() {
  const el = document.getElementById("officialDetailContent");
  el.innerHTML = `
    <div class="animate-in">
      <!-- Status Bar -->
      <div class="user-status-bar" style="border-radius:var(--radius-lg);margin-bottom:20px;">
        <span class="user-name">Michael Johnson</span>
        <span class="badge badge-active" style="margin-left:8px;">Verified</span>
        <div style="margin-left:auto;display:flex;gap:8px;">
          <button class="secondary" style="font-size:0.82rem;">Deactivate</button>
          <button style="background:var(--status-error);color:white;font-size:0.82rem;">Reset Password</button>
          <button class="secondary" style="font-size:0.82rem;">Demo</button>
          <button style="font-size:0.82rem;">Save Changes</button>
        </div>
      </div>

      <div class="admin-detail-grid">
        <div>
          <!-- Profile & Contact -->
          <div class="detail-section">
            <h3><span class="section-icon">👤</span> Profile & Contact</h3>
            <div class="form-grid">
              <div class="form-field"><label>Full Name *</label><input type="text" value="Michael" /></div>
              <div class="form-field"><label>Last Name *</label><input type="text" value="Johnson" /></div>
              <div class="form-field"><label>Preferred Name</label><input type="text" value="Mike J." /></div>
              <div class="form-field"><label>Preferred Name</label><input type="text" value="Mike" /></div>
              <div class="form-field"><label>Email *</label><input type="email" value="m.johnson@referee-uk.com" /></div>
              <div class="form-field"><label>Phone</label><input type="tel" value="+44 7911 123456" /></div>
              <div class="form-field full-width"><label>Emergency Contact</label><input type="text" value="+44 7911 654321" /></div>
              <div class="form-field full-width"><label>Address</label><input type="text" value="123 Football Lane, Manchester, M1 4AB" /></div>
            </div>
          </div>

          <!-- Official Details -->
          <div class="detail-section">
            <h3><span class="section-icon">⚽</span> Official Details</h3>
            <div class="form-grid">
              <div class="form-field"><label>Role Type *</label><select><option>Match Official</option><option>Video Referee</option><option>Assistant Referee</option></select></div>
              <div class="form-field"><label>Years Experience</label><input type="number" value="8" /></div>
              <div class="form-field"><label>Grade</label><select><option>Level 3 - County/District</option><option>Level 4 - Regional</option><option>Level 5 - National</option></select></div>
              <div class="form-field full-width"><label>Languages</label><input type="text" value="English, Spanish" /></div>
              <div class="form-field full-width"><label>Notes</label><textarea rows="2">Experienced match official with 8+ years in amateur and semi-professional leagues.</textarea></div>
            </div>
          </div>

          <!-- Certifications -->
          <div class="detail-section">
            <h3><span class="section-icon">📜</span> Certifications
              <button style="margin-left:auto;font-size:0.78rem;padding:5px 12px;" class="secondary">+ Add Certification</button>
            </h3>
            <table class="cert-table">
              <thead><tr><th>Certification Type</th><th>Issued By</th><th>Confirmed</th></tr></thead>
              <tbody>
                <tr><td>FA Level 3</td><td>The Football Association</td><td>FA-REF-2024-06-1234</td></tr>
                <tr><td>VAR Certified</td><td>FIFA</td><td>VAR-2025-UK-0567</td></tr>
              </tbody>
            </table>
            <div class="form-grid" style="margin-top:12px;">
              <div class="form-field"><label>Issue Date</label><input type="date" value="2023-01-01" /></div>
              <div class="form-field"><label>Expiry Date</label><input type="date" value="2026-01-01" /></div>
            </div>
            <div class="row" style="margin-top:8px;">
              <span class="badge badge-active">✓ Verified</span>
            </div>
          </div>

          <!-- Compliance -->
          <div class="detail-section">
            <h3><span class="section-icon">🛡️</span> Compliance</h3>
            <div class="form-grid">
              <div class="form-field"><label>Background Check Status</label><select><option>Cleared</option><option>Pending</option><option>Expired</option></select></div>
              <div class="form-field"><label>Background Check Date</label><input type="date" value="2025-05-01" /></div>
              <div class="form-field"><label>Safeguarding Certification</label><select><option>Valid</option><option>Expired</option><option>Not Required</option></select></div>
              <div class="form-field"><label>First Aid Certification</label><input type="date" value="2025-08-15" /></div>
            </div>
          </div>

          <!-- League Assignments -->
          <div class="detail-section">
            <h3><span class="section-icon">🏆</span> League Assignments</h3>
            <div style="display:flex;gap:6px;margin-bottom:12px;">
              <span class="tag">Premier League</span>
              <span class="tag" style="background:rgba(124,58,237,0.15);color:var(--accent-purple-hover);">Championship</span>
            </div>
            <div class="form-grid">
              <div class="form-field"><label>Assignment Start</label><input type="date" value="2025-01-01" /></div>
              <div class="form-field"><label>Assignment End</label><input type="date" value="2026-02-28" /></div>
            </div>
          </div>

          <!-- Availability -->
          <div class="detail-section">
            <h3><span class="section-icon">📅</span> Availability</h3>
            <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:12px;">Weekly Schedule</p>
            <div class="availability-row">
              <div class="day-dot available">M</div>
              <div class="day-dot available">T</div>
              <div class="day-dot">W</div>
              <div class="day-dot available">T</div>
              <div class="day-dot available">F</div>
              <div class="day-dot available">S</div>
              <div class="day-dot available">S</div>
            </div>
            <div class="form-grid" style="margin-top:12px;">
              <div class="form-field"><label>Blocked Dates</label><input type="text" placeholder="e.g. 2026-04-01" /></div>
              <div class="form-field"><label>Until</label><input type="text" placeholder="e.g. 2026-04-05" /></div>
            </div>
            <button style="font-size:0.78rem;padding:6px 12px;margin-top:8px;" class="secondary">+ Add blocked range</button>
            <p style="font-size:0.75rem;color:var(--text-muted);margin-top:8px;">Mar 25, 2026 - Mar 29, 2026</p>
          </div>
        </div>

        <!-- Right column: Audit & History -->
        <div>
          <div class="detail-section">
            <h3>Audit & History</h3>
            <div class="audit-trail" style="border:none;padding:0;background:transparent;">
              <div class="audit-item">
                <div class="audit-dot"></div>
                <div class="audit-content">
                  <div class="audit-text">Created/Verified</div>
                  <div class="audit-time">Aug 18, 2023 by K Smith</div>
                </div>
              </div>
              <div class="audit-item">
                <div class="audit-dot secondary"></div>
                <div class="audit-content">
                  <div class="audit-text">Last Login</div>
                  <div class="audit-time">2 days ago</div>
                </div>
              </div>
            </div>
            <div style="margin-top:16px;">
              <h4 style="font-size:0.85rem;margin-bottom:10px;">Compliance</h4>
              <ul style="list-style:none;font-size:0.82rem;">
                <li style="padding:4px 0;display:flex;align-items:center;gap:6px;"><span style="color:var(--accent-primary);">✓</span> Certifications up to date</li>
                <li style="padding:4px 0;display:flex;align-items:center;gap:6px;"><span style="color:var(--accent-primary);">✓</span> Background check completed</li>
                <li style="padding:4px 0;display:flex;align-items:center;gap:6px;"><span style="color:var(--accent-primary);">✓</span> Safeguarding certification valid</li>
                <li style="padding:4px 0;display:flex;align-items:center;gap:6px;"><span style="color:var(--accent-primary);">✓</span> Insurance current</li>
                <li style="padding:4px 0;display:flex;align-items:center;gap:6px;"><span style="color:var(--accent-primary);">✓</span> First aid validated</li>
                <li style="padding:4px 0;display:flex;align-items:center;gap:6px;"><span style="color:var(--accent-primary);">✓</span> Photo uploaded</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/* ===== POLLING ===== */
function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    if (!currentRole) return;
    try {
      const incidents = await request(`/api/matches/${getMatchId()}/incidents`);
      const active = incidents.some((i) => ACTIVE_STATUSES.has(i.status));
      incidentCache = incidents;
      renderIncidents();
      if (active && selectedIncidentId) {
        const selected = incidents.find((i) => i.id === selectedIncidentId);
        if (selected) renderDetail(selected);
      }
    } catch (_) {
      // no-op for polling
    }
  }, 2000);
}

/* ===== HTTP UTILITY ===== */
async function request(path, method = "GET", body) {
  const headers = {
    "X-Role": currentRole || "",
    "X-Team-Id": currentTeamId || "",
  };
  const options = { method, headers };

  if (body) {
    if (body instanceof FormData) {
      options.body = body;
    } else {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }
  }

  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.detail || "Request failed");
  }
  return res.json();
}
