# Atletico Intelligence - Screens & Features Guide

## MATCH OFFICIAL (Video Referee)

### 1. Dashboard

**Purpose:** Overview of recent matches and quick access to ongoing match reviews.

**What it does:**

- Displays a list of recent/active matches assigned to the official
- Shows match details: team name, match date/time, status (live, completed)
- Quick statistics: total incidents reviewed today, pending decisions
- Provides quick-launch buttons to enter match console

**How it works:**

- Official logs in with their credentials
- Dashboard loads all matches in their queue
- Clicking a match launches the Live Console for that match
- Shows real-time status updates (match started, match ended, new incident)

---

### 2. Live Console

**Purpose:** Central hub for conducting real-time incident reviews during an active match.

**What it does:**

- Live video preview panel showing current match feed
- Timeline scrubber to navigate through the video
- Two primary action buttons: **Offside Check** and **Goal Check**
- Real-time incident list (processing status updates)
- Match information header (match ID, teams, elapsed time)
- Connection status indicator for video feed

**How it works:**

1. Official watches the live video feed in the console
2. When an incident occurs, official clicks either "Offside Check" or "Goal Check"
3. System automatically captures a 5-15 second clip around the event
4. For offside: console transitions to frame-selection mode (see step 3 below)
5. For goal: system analyzes clip automatically and returns verdict within ~10 seconds
6. Incident appears in the incident list with processing status
7. Official can click on any incident to view details in the Incident Detail panel

---

### 3. Clip and Incident

**Purpose:** View all incidents captured during the match in real-time.

**What it does:**

- Chronological list of all incidents (offside checks, goal checks) from the current match
- Each incident shows:
  - Type (Offside / Goal)
  - Timestamp when triggered
  - Processing status (queued → extracting_clip → ai_analyzing → completed)
  - Brief verdict preview (if ready)
  - Color-coded status badges (yellow=processing, green=completed, red=flagged)
- Clicking an incident opens the Incident Detail view
- Real-time updates as clips are processed

**How it works:**

- Automatically populated as official triggers incident reviews
- Updates live as backend processes clips and AI analysis
- Shows processing timeline: when clip extraction started, when AI analysis began, when completed
- If AI analysis takes too long or confidence is low, flags for manual review
- No manual actions available here—incidents are view-only in this panel

---

### 4. Incidents Details

**Purpose:** Comprehensive review and documentation of a single incident.

**What it does:**

- Full playable incident clip with scrubber control
- AI verdict (Offside / Onside for offside incidents; Goal / No-Goal for goal incidents)
- Visual evidence placeholder:
  - For offside: 3D positional diagram showing last defender and attacking player
  - For goal: goal-line overlay showing ball crossing confirmation
- Confidence score (0-100%) from the AI analysis
- Referee notes field (max 300 characters) with:
  - Text input area
  - Character counter
  - Profanity filter (blocks offensive words)
  - Save button
- Action buttons:
  - **Download Clip**: generates signed URL for offline storage
  - **Delete Clip**: removes clip from storage (incident metadata preserved)
- Timestamp metadata (incident created, frame selected, analysis completed)

**How it works:**

1. Official reviews the playable clip with timeline scrubber
2. Official can pause, play, scrub to analyze the incident frame-by-frame
3. For offside incidents, official can click "Review This Frame" to re-analyze a specific moment
4. Official writes optional notes to document their decision or rationale
5. Notes are auto-saved (max 300 chars, no profanity allowed)
6. Official can download the clip for offline storage or delete it to save space
7. All changes are logged with timestamps

---

### 5. Match History

**Purpose:** Post-match archive and historical review of all incidents from completed matches.

**What it does:**

- Table/list of all past matches officialized by this user
- For each match:
  - Team names
  - Match date and duration
  - Total incidents reviewed
  - Total offside checks vs. goal checks
  - Link to view full incident archive
- Search and filter options:
  - By date range
  - By team name
  - By incident type
  - By verdict (offside/onside, goal/no-goal)
- Ability to view incident details from archived matches

**How it works:**

- Loads all completed matches from the official's history
- Clicking a match name opens the incident list from that match
- Can drill down into any incident to view clip, verdict, and notes again
- Read-only view for historical reference and dispute resolution
- Used for post-match analysis and record-keeping

---

## LEAGUE ADMIN

### 1. Dashboard

**Purpose:** Executive overview of the entire league's operations.

**What it does:**

- Summary statistics:
  - Total teams in league
  - Total matches (scheduled, in-progress, completed)
  - Total incidents reviewed across all matches
  - System health status (uptime, processing queue)
- Quick links to manage:
  - Create new league/season
  - Add new team
  - Schedule matches
  - View recent incidents across all teams
- Alerts section:
  - Pending moderations (flagged incidents)
  - Unusual incident patterns
  - User activity logs
  - System performance warnings

**How it works:**

- Admin logs in with League Admin credentials
- Dashboard loads aggregated data from all teams and matches
- Shows real-time statistics updating as matches occur
- Clicking any statistic or alert navigates to relevant management screen

---

### 2. Team List

**Purpose:** Create, manage, and monitor all teams in the league.

**What it does:**

- Table listing all teams with:
  - Team name
  - League(s) they belong to
  - Number of active players
  - Contact person/admin email
  - Status (active, inactive, suspended)
  - Last match date
- Action buttons per team:
  - **Edit**: update team information
  - **View Matches**: see all matches for this team
  - **View Incidents**: see all incidents involving this team
  - **Manage Users**: add/remove team members and officials
  - **Delete**: remove team from league (archived, not purged)
- Create New Team button
- Search and filter options

**How it works:**

1. Admin clicks "Create New Team" to add a team to the league
2. Fills in team info (name, city, contact info, players)
3. Assigns officials and team viewers to the team
4. Can edit team details at any time
5. Can view all matches and incidents associated with a team
6. Can deactivate or delete a team (data preserved for audit)
7. Users assigned to teams can only see their team's matches and incidents

---

### 3. Leagues

**Purpose:** Set up and manage multiple leagues/seasons.

**What it does:**

- List of all leagues/seasons:
  - League name
  - Season (2024, 2025, etc.)
  - Status (active, completed, archived)
  - Number of teams
  - Number of matches scheduled
  - Start and end dates
- Per-league actions:
  - **Edit**: update league settings (name, dates, rules)
  - **Add Teams**: assign teams to this league
  - **Schedule Matches**: create match calendar
  - **View Standings**: team rankings/statistics
  - **Archive**: close league for the season
- Create New League button
- Bulk operations:
  - Import teams from CSV
  - Import match schedule from CSV

**How it works:**

1. Admin creates a new league (name, season, dates)
2. Assigns teams to the league
3. Schedules matches (upload CSV or manually add)
4. Sets league rules (match duration, review rules, etc.)
5. As season progresses, league tracks incidents, verdicts, and standings
6. At season end, admin archives the league
7. Archived leagues remain in system for historical review

---

### 4. Live Console

**Purpose:** Monitor all live matches happening across the league simultaneously.

**What it does:**

- Grid/list view of all active matches in progress
- For each live match:
  - Teams and match status (time elapsed)
  - Current incident being reviewed (if any)
  - Recent incidents list (last 3-5)
  - Video feed preview (thumbnail or small player)
  - Current official handling the match
- Global incident queue showing all incidents across all matches being processed
- System load indicator (processing capacity)
- Ability to drill down into any match to see full console
- Alerts for:
  - Processing delays
  - Low confidence AI verdicts
  - Flagged incidents awaiting human review
  - Connection issues with video feeds

**How it works:**

- Admin dashboard displays all concurrent matches at league level
- Live updates as incidents occur in any match
- Admin can click on any match to view its detailed Live Console
- Can manually intervene if needed (override verdict, pause processing, etc.)
- Used for league-level monitoring and support

---

### 5. Clip and Incident

**Purpose:** Search and review all incidents across the entire league.

**What it does:**

- Search engine for all incidents in the league:
  - Filter by date range
  - Filter by team(s)
  - Filter by incident type (offside/goal)
  - Filter by verdict
  - Filter by confidence level
  - Search by official name
- Incident grid/table showing:
  - Incident ID
  - Match and teams
  - Type and verdict
  - Timestamp
  - Clip status (ready, deleted, archived)
  - Confidence score
  - Flag status (flagged for review, approved, disputed)
- Bulk actions:
  - Download multiple clips
  - Flag incidents for review
  - Export incident report (CSV/PDF)

**How it works:**

1. Admin uses search filters to find specific incidents
2. Clicks on an incident to view full details
3. Can monitor all clips in the league for compliance
4. Can flag incidents for further human review by moderation team
5. Can download clips for analysis or storage
6. Used for league governance and dispute resolution

---

### 6. Incidents Detail

**Purpose:** Review, moderate, and manage individual incidents at the league level.

**What it does:**

- Same content as Match Official's Incident Detail page, plus additional admin controls:
- Full incident review:
  - Playable clip
  - AI verdict and confidence
  - Visual evidence (3D diagram or goal-line overlay)
  - Official's notes and timestamp
  - Processing timeline
- Admin-specific actions:
  - **Override Verdict**: if admin disagrees with AI decision, can manually change verdict and document reason
  - **Flag for Human Review**: send to moderation queue for another official to review
  - **Archive Incident**: mark as resolved in league records
  - **View Audit Trail**: see all changes made to this incident
  - **Send Notification**: notify teams/officials of decision
- Moderation notes field:
  - For admin to document their review and reasoning
  - Cannot be edited by Match Official

**How it works:**

1. Admin reviews the incident clip and AI verdict
2. If verdict looks correct, admin approves (confirms it)
3. If verdict is questionable, admin can flag for another official to review
4. If admin disagrees with verdict, can manually override and document reason
5. All changes logged with timestamps and admin identification
6. Used for quality assurance and dispute resolution

---

### 7. Match History

**Purpose:** View and manage historical data for the entire league.

**What it does:**

- Archive of all completed matches in the league
- For each match:
  - Teams, date, final duration
  - Official assigned
  - Total incidents reviewed
  - Incidents breakdown (offside/goal split)
  - Total processing time
  - Any flagged or overridden verdicts
- Search and filter:
  - By date range
  - By teams
  - By official
  - By verdict patterns (e.g., all offside calls overridden)
- Export options:
  - Full incident report (PDF)
  - Statistics summary (CSV)
  - Audit trail (detailed log)
- Drill-down capability:
  - Click match to view all incidents
  - Click incident to view full details

**How it works:**

1. Admin accesses historical data for any completed match
2. Can analyze trends (e.g., which officials tend to override AI verdicts)
3. Can generate reports for league meetings or governance
4. Can export data for external analysis
5. Provides complete audit trail for compliance and dispute resolution

---

## TEAM VIEWER

### 1. Dashboard

**Purpose:** Quick access to team's recent match incidents and clip archive.

**What it does:**

- Display of recent matches from the team:
  - Match date and opponent
  - Match status (in-progress, completed)
  - Number of incidents in each match
- Quick stats:
  - This week's incidents
  - This month's incidents
  - Recent verdicts summary (X offside calls, Y goals allowed, etc.)
- Links to:
  - Most recent match incidents
  - Browse all past matches
  - Search incident archive

**How it works:**

- Team Viewer logs in (read-only access tied to their team only)
- Dashboard shows only their team's data
- Clicking a recent match loads that match's incident list
- Provides entry point to review clips after matches

---

### 2. Clip and Incident

**Purpose:** Browse and view all approved clips from the team's matches.

**What it does:**

- List of all incidents from the team's matches:
  - Filterable by date range
  - Filterable by match
  - Filterable by incident type (offside/goal)
  - Searchable by opponent team name
- Each incident entry shows:
  - Thumbnail (first frame of clip)
  - Incident type and verdict
  - Match date and opponent
  - Timestamp of incident
- Clicking an incident opens full Incident Detail view
- No editing or deletion capability (read-only mode)

**How it works:**

1. Team Viewer logs in and sees only their team's incidents
2. Browses list of all incidents from recent matches
3. Can filter by date, match, or type
4. Clicks on any incident to view details
5. Can download clips for personal review
6. Cannot edit verdicts, notes, or delete clips

---

### 3. Incidents Details and Match History (Combined View)

**Purpose:** Comprehensive post-match review and historical analysis.

**What it does:**

- Integrated view combining two functions:

**Incidents Details section:**

- Full playable clip with scrubber
- AI verdict (read-only)
- Confidence score
- Visual evidence (3D positional diagram or goal-line overlay)
- Official's notes (read-only)
- Processing timestamps
- Download clip button (no delete option for Team Viewer)

**Match History section:**

- Chronological list of all past matches
- For each match:
  - Opponent team
  - Match date and result (if applicable)
  - Total incidents
  - Quick summary (e.g., "2 offside calls, 1 goal reviewed")
- Click any past match to view its full incident list
- Can compare incidents across multiple matches
- Timeline view showing all incidents from the team's season

**How it works:**

1. Team Viewer clicks on a recent incident or searches for a past one
2. Views the full clip and AI verdict for that incident
3. Can scroll through full match history on same page
4. Can click any match to see all incidents from that match
5. Used for post-match analysis, understanding decisions, and record-keeping
6. All data is read-only—no editing or modification possible

---

## SUMMARY TABLE

| Feature             | Match Official                         | League Admin                                    | Team Viewer               |
| ------------------- | -------------------------------------- | ----------------------------------------------- | ------------------------- |
| Dashboard           | Recent matches + quick launch          | League overview + alerts                        | Team's recent incidents   |
| Live Console        | Active match review hub                | All league live matches                         | ❌ Not accessible         |
| Clip and Incident   | Match incidents (during live)          | All league incidents (search)                   | Team's incidents (browse) |
| Incidents Details   | Full review + edit notes + delete clip | Full review + override verdict + moderate       | Full review (read-only)   |
| Match History       | Past matches they officiated           | All league match archive                        | Team's match archive      |
| Additional Features | Create reviews, trigger checks         | Create leagues, manage teams, override verdicts | Download clips only       |
| Editing Permissions | ✅ Edit notes, delete clips            | ✅ Override verdicts, moderate                  | ❌ Read-only              |

---

## KEY WORKFLOWS

### Match Official During Live Match

1. Open Live Console
2. Watch video feed and timeline
3. Click "Offside Check" or "Goal Check"
4. System captures clip
5. For offside: Official scrubs to exact frame, clicks "Review This Frame"
6. System analyzes and returns verdict
7. Incident appears in Clip and Incident list
8. Official clicks incident to add notes if needed

### League Admin Post-Match Review

1. Open Clip and Incident (league-wide search)
2. Filter incidents by criteria
3. Click on suspicious incident
4. Review clip, AI verdict, and official's notes
5. If verdict seems wrong, override it and document reason
6. Archive incident or flag for further review
7. Generate report for governance

### Team Viewer After Match

1. Open Dashboard
2. Click on recently completed match
3. Browse Clip and Incident list
4. Click interesting incident
5. Review full clip, verdict, and evidence
6. Download clip if needed
7. Scroll through Match History to compare with past incidents
