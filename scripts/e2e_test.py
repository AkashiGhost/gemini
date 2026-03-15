"""
E2E test for InnerPlay Gemini hackathon build.
Server must be running before this script.
Override target with APP_URL env var, for example:
  APP_URL=http://127.0.0.1:3000 python scripts/e2e_test.py

This script goes straight to the playable route, drives onboarding, grants a
fake microphone, and verifies that a real transcript line appears after the
live session starts. It avoids false greens from onboarding copy.
"""

import os
import sys
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright

APP_URL = os.environ.get("APP_URL", "http://127.0.0.1:3000")
STORY_ID = os.environ.get("PLAY_STORY", "the-last-session")
EXPECT_CONSOLE_MARKER = os.environ.get("EXPECT_CONSOLE_MARKER", "")
SHOT_DIR = Path(tempfile.gettempdir()) / "innerplay-e2e"
SHOT_DIR.mkdir(parents=True, exist_ok=True)

STORY_CONFIGS = {
    "the-last-session": {
        "scene_text": [
            "You are a therapist. It's late. Your last patient has arrived.",
            "She sits across from you. Something about her feels... familiar.",
            "The door locks behind her. The session has begun.",
        ],
        "transcript_label": "ELARA",
        "wait_iterations": 25,
        "console_marker": "",
    },
    "the-call": {
        "scene_text": [
            "Your phone rings. An unknown number. You answer.",
            "On the other end — someone trapped in a concrete room underground. They need your help to escape.",
            "'Please don't hang up. I don't know where I am.' Guide them out. Your voice is all they have.",
        ],
        "transcript_label": "ALEX",
        "wait_iterations": 45,
        "console_marker": "sound.the_call_state_director.ai_actions_applied",
    },
}
STORY_CONFIG = STORY_CONFIGS.get(STORY_ID, STORY_CONFIGS["the-last-session"])
SCENE_TEXT = STORY_CONFIG["scene_text"]
TRANSCRIPT_LABEL = str(STORY_CONFIG["transcript_label"])
WAIT_ITERATIONS = int(STORY_CONFIG["wait_iterations"])
REQUIRED_CONSOLE_MARKER = EXPECT_CONSOLE_MARKER or str(STORY_CONFIG["console_marker"])
ERROR_MARKERS = [
    "MICROPHONE BLOCKED",
    "SESSION DELAYED",
    "MODEL/RESOURCE UNAVAILABLE",
    "AUTHENTICATION FAILED",
    "CONNECTION ERROR",
]
NON_TRANSCRIPT_LINES = {
    "Skip to content",
    "TAP ANYWHERE FOR CONTROLS",
    "PUT ON HEADPHONES",
    "BEGIN",
    "Retry",
    "Return home",
    "preparing the session...",
}


def safe_print(message: str):
    print(message.encode("ascii", "replace").decode("ascii"))


def normalize_line(value: str) -> str:
    return " ".join(value.strip().split()).upper()


def extract_opening_line(body_text: str, transcript_label: str) -> str:
    lines = [line.strip() for line in body_text.splitlines() if line.strip()]
    transcript_label_normalized = normalize_line(transcript_label)
    ignored_lines = {normalize_line(line) for line in NON_TRANSCRIPT_LINES}
    ignored_lines.update(normalize_line(line) for line in SCENE_TEXT)
    for index, line in enumerate(lines):
        if normalize_line(line) != transcript_label_normalized:
            continue
        for candidate in lines[index + 1:]:
            candidate_normalized = normalize_line(candidate)
            if candidate_normalized in ignored_lines:
                continue
            if candidate_normalized == transcript_label_normalized:
                continue
            return candidate
    return ""


def run_test() -> int:
    failures = []

    def check(condition: bool, message: str):
        if not condition:
            failures.append(message)

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--use-fake-ui-for-media-stream",
                "--use-fake-device-for-media-stream",
            ],
        )
        context = browser.new_context(permissions=["microphone"])
        page = context.new_page()

        # Capture console logs for debugging
        logs = []
        page.on("console", lambda msg: logs.append(f"[{msg.type}] {msg.text}"))

        play_url = f"{APP_URL.rstrip('/')}/play?story={STORY_ID}"
        print("\n=== Step 1: Play route ===")
        page.goto(play_url, wait_until="domcontentloaded")
        page.wait_for_timeout(1500)
        page.screenshot(path=str(SHOT_DIR / "01_play_route.png"), full_page=True)
        check(page.url.startswith(play_url), "Play route did not load")

        print("\n=== Step 2: Onboarding scenes ===")
        for index, scene_text in enumerate(SCENE_TEXT, start=1):
            page.wait_for_selector(f"text={scene_text}", timeout=10000)
            page.screenshot(path=str(SHOT_DIR / f"02_scene_{index}.png"), full_page=True)
            page.get_by_role("button", name="CONTINUE").click()
            page.wait_for_timeout(400)

        print("\n=== Step 3: Headphones step ===")
        page.wait_for_selector("text=PUT ON HEADPHONES", timeout=10000)
        page.screenshot(path=str(SHOT_DIR / "03_headphones.png"), full_page=True)
        page.get_by_role("button", name="BEGIN").click()

        print("\n=== Step 4: Wait for live opening turn ===")
        page.screenshot(path=str(SHOT_DIR / "04_session_starting.png"), full_page=True)
        page.wait_for_timeout(1000)
        has_error_marker = False
        for _ in range(WAIT_ITERATIONS):
            body_text = page.locator("body").inner_text()
            has_error_marker = any(marker in body_text for marker in ERROR_MARKERS)
            if has_error_marker:
                break
            if normalize_line(TRANSCRIPT_LABEL) in normalize_line(body_text) and "preparing the session..." not in body_text:
                break
            page.wait_for_timeout(1000)

        body_text = page.locator("body").inner_text()
        print(body_text[:800])
        check(not has_error_marker, f"Session entered error state: {body_text[:200]}")
        opening_line = extract_opening_line(body_text, TRANSCRIPT_LABEL)
        check(
            normalize_line(TRANSCRIPT_LABEL) in normalize_line(body_text),
            f"Live transcript label {TRANSCRIPT_LABEL!r} did not appear",
        )
        check(bool(opening_line), "Opening narration did not appear in the transcript")
        check(
            all(scene_text not in body_text for scene_text in SCENE_TEXT[-1:]),
            "E2E result still appears to be reading onboarding copy instead of live transcript",
        )
        if opening_line:
            safe_print(f"  Opening line: {opening_line}")
        if REQUIRED_CONSOLE_MARKER:
            page.wait_for_timeout(500)
            check(
                any(REQUIRED_CONSOLE_MARKER in log for log in logs),
                f"Console marker {REQUIRED_CONSOLE_MARKER!r} did not appear",
            )

        page.screenshot(path=str(SHOT_DIR / "05_live_opening_turn.png"), full_page=True)

        print("\n=== Console Logs ===")
        for log in logs[-40:]:
            safe_print(f"  {log}")

        print("\n=== Summary ===")
        print("  Play route: PASS")
        print("  Onboarding: PASS")
        print(f"  Gemini opening turn: {'PASS' if not failures else 'FAIL'}")
        print(f"\nScreenshots saved to {SHOT_DIR}")
        if failures:
            print("\n=== Failures ===")
            for failure in failures:
                print(f"  - {failure}")

        context.close()
        browser.close()
        return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(run_test())
