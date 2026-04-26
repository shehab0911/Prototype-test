import json
import sys
import time
from pathlib import Path

import requests


API_BASE = "http://127.0.0.1:8000"
TEAM_ID = "team-demo-001"
MATCH_ID = f"match-check-{int(time.time())}"
LIVE_MATCH_ID = f"{MATCH_ID}-live"
GENERATED_VIDEO_PATH = Path(__file__).resolve().parent / "checker_sample.mp4"
DEFAULT_VIDEO_PATH = Path(__file__).resolve().parents[1] / "test.mp4"
FALLBACK_VIDEO_PATH = Path(__file__).resolve().parent / "storage" / "source" / "match-demo-001_Goal.mp4"


class CheckRunner:
    def __init__(self) -> None:
        self.results: list[tuple[str, bool, str]] = []
        self.incident_id: str | None = None
        self.video_path = self._resolve_video()

    def _resolve_video(self) -> Path:
        if GENERATED_VIDEO_PATH.exists():
            return GENERATED_VIDEO_PATH
        if DEFAULT_VIDEO_PATH.exists():
            return DEFAULT_VIDEO_PATH
        return FALLBACK_VIDEO_PATH

    def log(self, name: str, ok: bool, detail: str) -> None:
        self.results.append((name, ok, detail))
        mark = "PASS" if ok else "FAIL"
        print(f"[{mark}] {name}: {detail}")

    def headers(self, role: str) -> dict:
        return {"X-Role": role, "X-Team-Id": TEAM_ID}

    def req(self, method: str, path: str, role: str, **kwargs):
        return requests.request(method, f"{API_BASE}{path}", headers=self.headers(role), timeout=120, **kwargs)

    def wait_for_terminal(self, incident_id: str, max_wait: int = 25) -> dict | None:
        deadline = time.time() + max_wait
        while time.time() < deadline:
            res = self.req("GET", f"/api/incidents/{incident_id}", "match_official")
            if not res.ok:
                return None
            payload = res.json()
            if payload.get("status") in {"completed", "flagged_for_human_review"}:
                return payload
            time.sleep(1.0)
        return None

    def run(self) -> int:
        try:
            health = requests.get(f"{API_BASE}/health", timeout=15)
            self.log("Service health", health.ok and health.json().get("status") == "ok", f"status={health.status_code}")
        except Exception as exc:
            self.log("Service health", False, str(exc))
            return 1

        # FR-30/31 auth and role guard
        no_role = requests.get(f"{API_BASE}/api/matches/{MATCH_ID}/incidents", timeout=10)
        self.log("Auth required", no_role.status_code in {401, 422}, f"status={no_role.status_code}")

        # Create upload match
        match_payload = {"source_type": "upload", "source_label": "check_upload.mp4"}
        create_match = self.req("POST", f"/api/matches/{MATCH_ID}", "match_official", json=match_payload)
        self.log("Create upload match", create_match.ok, f"status={create_match.status_code}")

        # Upload with metadata validation
        if self.video_path.exists():
            with self.video_path.open("rb") as f:
                upload = self.req(
                    "POST",
                    f"/api/matches/{MATCH_ID}/source",
                    "match_official",
                    files={"file": (self.video_path.name, f, "video/mp4")},
                )
            upload_ok = upload.ok and isinstance(upload.json().get("metadata"), dict)
            self.log("Upload + metadata validation", upload_ok, f"status={upload.status_code}")
        else:
            self.log("Upload + metadata validation", False, f"missing video: {self.video_path}")

        # Role restriction check (team viewer cannot create incidents)
        viewer_create = self.req(
            "POST",
            f"/api/matches/{MATCH_ID}/incidents",
            "team_viewer",
            json={"type": "offside", "event_ts": 1.2},
        )
        self.log("Team viewer cannot trigger reviews", viewer_create.status_code == 403, f"status={viewer_create.status_code}")

        # Offside incident flow + review-frame
        create_incident = self.req(
            "POST",
            f"/api/matches/{MATCH_ID}/incidents",
            "match_official",
            json={"type": "offside", "event_ts": 1.2},
        )
        offside_ok = create_incident.ok
        self.log("Create offside incident", offside_ok, f"status={create_incident.status_code}")
        if offside_ok:
            incident = create_incident.json()
            self.incident_id = incident["id"]
            review = self.req(
                "POST",
                f"/api/incidents/{self.incident_id}/review-frame",
                "match_official",
                json={"frame_ts": 1.5},
            )
            self.log("Review this frame action", review.ok, f"status={review.status_code}")
            terminal = self.wait_for_terminal(self.incident_id)
            terminal_ok = bool(terminal and terminal.get("verdict") in {"Offside", "Onside"} and terminal.get("confidence", 0) > 0)
            self.log("Offside verdict + confidence", terminal_ok, f"status={terminal.get('status') if terminal else 'timeout'}")
            self.log("Offside visual type", bool(terminal and terminal.get("visual_type") == "3d_offside_diagram"), terminal.get("visual_type", "none") if terminal else "none")

        # Note save and sanitization
        if self.incident_id:
            note = self.req(
                "PATCH",
                f"/api/incidents/{self.incident_id}/note",
                "match_official",
                json={"note": "<script>alert(1)</script> clean note"},
            )
            note_ok = note.ok and "&lt;script&gt;" in note.json().get("note", "")
            self.log("Referee note save + sanitization", note_ok, f"status={note.status_code}")

            bad_note = self.req(
                "PATCH",
                f"/api/incidents/{self.incident_id}/note",
                "match_official",
                json={"note": "This is stupid"},
            )
            self.log("Profanity block", bad_note.status_code == 400, f"status={bad_note.status_code}")

            # Download / delete metadata retention
            dl = self.req("GET", f"/api/incidents/{self.incident_id}/download", "team_viewer")
            self.log("Clip download allowed for viewer", dl.ok, f"status={dl.status_code}")

            delete = self.req("DELETE", f"/api/incidents/{self.incident_id}/clip", "match_official")
            delete_ok = delete.ok and delete.json().get("clip_deleted") is True and delete.json().get("verdict")
            self.log("Delete clip keeps metadata", delete_ok, f"status={delete.status_code}")

            dl_after = self.req("GET", f"/api/incidents/{self.incident_id}/download", "team_viewer")
            self.log("Deleted clip no longer downloadable", dl_after.status_code == 404, f"status={dl_after.status_code}")

        # Goal review flow
        goal = self.req(
            "POST",
            f"/api/matches/{MATCH_ID}/incidents",
            "match_official",
            json={"type": "goal", "event_ts": 2.0},
        )
        self.log("Create goal incident", goal.ok, f"status={goal.status_code}")
        if goal.ok:
            g_inc = goal.json()
            g_terminal = self.wait_for_terminal(g_inc["id"])
            self.log(
                "Goal verdict",
                bool(g_terminal and g_terminal.get("verdict") in {"Goal", "No Goal"}),
                f"verdict={g_terminal.get('verdict') if g_terminal else 'timeout'}",
            )
            self.log(
                "Goal visual type",
                bool(g_terminal and g_terminal.get("visual_type") == "goal_line_overlay"),
                g_terminal.get("visual_type", "none") if g_terminal else "none",
            )

        # Incident list access
        list_incidents = self.req("GET", f"/api/matches/{MATCH_ID}/incidents", "team_viewer")
        lst = list_incidents.json() if list_incidents.ok else []
        self.log("Incident list available", list_incidents.ok and len(lst) > 0, f"count={len(lst)}")

        # Live source connect/disconnect/reconnect
        live_match = self.req(
            "POST",
            f"/api/matches/{LIVE_MATCH_ID}",
            "match_official",
            json={"source_type": "live", "source_label": "rtmp://camera/live"},
        )
        self.log("Create live match", live_match.ok, f"status={live_match.status_code}")

        live_connect = self.req(
            "POST",
            f"/api/matches/{LIVE_MATCH_ID}/live/connect",
            "match_official",
            json={"stream_url": "rtmp://camera/live"},
        )
        live_disconnect = self.req("POST", f"/api/matches/{LIVE_MATCH_ID}/live/disconnect", "match_official")
        live_reconnect = self.req(
            "POST",
            f"/api/matches/{LIVE_MATCH_ID}/live/connect",
            "match_official",
            json={"stream_url": "rtmp://camera/live"},
        )
        live_ok = live_connect.ok and live_disconnect.ok and live_reconnect.ok
        self.log("Live connect/disconnect/reconnect", live_ok, f"codes={live_connect.status_code}/{live_disconnect.status_code}/{live_reconnect.status_code}")

        # Cross-team isolation
        if self.incident_id:
            cross = requests.get(
                f"{API_BASE}/api/incidents/{self.incident_id}",
                headers={"X-Role": "team_viewer", "X-Team-Id": "team-other-999"},
                timeout=15,
            )
            self.log("Cross-team isolation", cross.status_code == 403, f"status={cross.status_code}")

        passed = len([r for r in self.results if r[1]])
        total = len(self.results)
        print(f"\nResult: {passed}/{total} checks passed")
        return 0 if passed == total else 2


if __name__ == "__main__":
    code = CheckRunner().run()
    sys.exit(code)
