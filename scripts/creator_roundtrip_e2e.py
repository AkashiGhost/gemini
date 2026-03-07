"""
Creator roundtrip E2E.

Drives the real creator UI: generate a Story Pack, click Publish & Play,
and verify the generated draft reaches the live play route.
"""

import os
import sys
from pathlib import Path
import tempfile
from playwright.sync_api import sync_playwright

APP_URL = os.environ.get("APP_URL", "http://127.0.0.1:3000")
SHOT_DIR = Path(tempfile.gettempdir()) / "innerplay-creator-roundtrip"
SHOT_DIR.mkdir(parents=True, exist_ok=True)


def run_test() -> int:
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
        )
        context = browser.new_context(permissions=["microphone"])
        page = context.new_page()
        logs: list[str] = []
        page.on("console", lambda msg: logs.append(f"[{msg.type}] {msg.text}"))

        try:
            page.goto(f"{APP_URL.rstrip('/')}/create", wait_until="domcontentloaded")
            page.wait_for_timeout(1200)
            page.locator("#creator-story-draft").fill(
                "The player answers a ringing phone. The caller is trapped in a room filling with water and may be manipulating the player."
            )
            page.get_by_role("button", name="Generate Story Pack").click()
            page.wait_for_selector("#story-pack-title", timeout=60000)
            title = page.locator("#story-pack-title").input_value().strip()
            page.screenshot(path=str(SHOT_DIR / "01_story_pack_ready.png"), full_page=True)

            page.get_by_role("button", name="Publish & Play").click()
            page.wait_for_url("**/play?published=**", timeout=15000)
            page.wait_for_timeout(1500)
            page.screenshot(path=str(SHOT_DIR / "02_roundtrip_play.png"), full_page=True)

            body = page.locator("body").inner_text()
            if title and title not in body:
                print("Creator publish route did not render the generated story title on /play.")
                print(body[:1400])
                return 1

            for _ in range(2):
                page.wait_for_timeout(4700)
                page.get_by_role("button", name="CONTINUE").click()

            page.wait_for_selector("text=PUT ON HEADPHONES", timeout=10000)
            page.get_by_role("button", name="BEGIN").click()
            page.wait_for_timeout(1500)

            connected = False
            for _ in range(25):
                body = page.locator("body").inner_text()
                lowered = body.lower()
                if "connection error" in lowered or "authentication failed" in lowered or "model/resource unavailable" in lowered:
                    print(body[:1400])
                    return 1
                if "connecting to the live session..." in lowered or "waiting for the opening line..." in lowered:
                    connected = True
                    break
                page.wait_for_timeout(1000)

            if not connected:
                print("Creator roundtrip reached /play but did not start the live-session flow.")
                print(body[:1400])
                return 1

            print("CREATOR_ROUNDTRIP_E2E_OK")
            return 0
        finally:
            context.close()
            browser.close()


if __name__ == "__main__":
    sys.exit(run_test())
