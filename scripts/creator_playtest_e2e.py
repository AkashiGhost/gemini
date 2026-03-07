"""
Published story playtest E2E.

Seeds a published story manifest into browser storage and verifies `/play`
can load that draft via the normal live-session route.

Server must already be running. Override with APP_URL if needed.
"""

import json
import os
import sys
from pathlib import Path
import tempfile
from playwright.sync_api import sync_playwright

APP_URL = os.environ.get("APP_URL", "http://127.0.0.1:3000")
SHOT_DIR = Path(tempfile.gettempdir()) / "innerplay-creator-playtest"
SHOT_DIR.mkdir(parents=True, exist_ok=True)

STORY = {
    "id": "published-night-channel",
    "title": "Night Channel",
    "logline": "A radio voice drags you toward the water.",
    "playerRole": "You are the only person answering the radio.",
    "openingLine": "Stay on the line. The channel is changing.",
    "phaseOutline": [{"phase": "One", "goal": "Listen", "tone": "uneasy"}],
    "soundPlan": [{"id": "fog-horn", "moment": "dock", "reason": "Signals danger in the harbor."}],
    "systemPromptDraft": "Speak in short, escalating turns and always wait for the player.",
    "characterName": "Mara",
    "runtimeMode": "live",
    "soundStrategy": "ambient_first_live",
}


def run_test() -> int:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=[
            "--use-fake-ui-for-media-stream",
            "--use-fake-device-for-media-stream",
        ])
        context = browser.new_context(permissions=["microphone"])
        storage_key = f"innerplay.published-story:{STORY['id']}"
        storage_value = json.dumps(STORY)
        context.add_init_script(
            script=f"""
            window.localStorage.setItem({json.dumps(storage_key)}, {json.dumps(storage_value)});
            """
        )
        page = context.new_page()

        logs: list[str] = []
        page.on("console", lambda msg: logs.append(f"[{msg.type}] {msg.text}"))

        try:
            page.goto(f"{APP_URL.rstrip('/')}/play?published={STORY['id']}", wait_until="domcontentloaded")
            page.wait_for_timeout(1500)
            page.screenshot(path=str(SHOT_DIR / "01_published_onboarding.png"), full_page=True)

            body = page.locator("body").inner_text()
            if STORY["title"] not in body and STORY["logline"] not in body:
                print("Published story onboarding did not render the stored draft.")
                print(body[:1200])
                print("Recent console logs:")
                for log in logs[-30:]:
                    print(log.encode("ascii", "replace").decode("ascii"))
                return 1

            for _ in range(2):
                page.wait_for_timeout(4700)
                page.get_by_role("button", name="CONTINUE").click()

            page.wait_for_selector("text=PUT ON HEADPHONES", timeout=10000)
            page.get_by_role("button", name="BEGIN").click()
            page.wait_for_timeout(1500)
            page.screenshot(path=str(SHOT_DIR / "02_published_connecting.png"), full_page=True)

            connected = False
            for _ in range(25):
                body = page.locator("body").inner_text()
                lowered = body.lower()
                if "connection error" in lowered or "authentication failed" in lowered or "model/resource unavailable" in lowered:
                    print(body[:1200])
                    return 1
                if "connecting to the live session..." in lowered or "waiting for the opening line..." in lowered or STORY["characterName"] in body:
                    connected = True
                    break
                page.wait_for_timeout(1000)

            if not connected:
                print("Published story reached /play but did not enter the live-session startup path.")
                print(body[:1200])
                return 1

            print("PUBLISHED_STORY_PLAYTEST_E2E_OK")
            return 0
        finally:
            context.close()
            browser.close()


if __name__ == "__main__":
    sys.exit(run_test())
