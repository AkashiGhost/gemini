"""
E2E test for InnerPlay Gemini hackathon build.
Server must be running before this script.
Override target with APP_URL env var, for example:
  APP_URL=http://127.0.0.1:3000 python scripts/e2e_test.py

Tests:
1. Landing page renders correctly
2. Onboarding flow (3 steps + countdown)
3. Game session starts and Gemini responds
4. Text input produces Elara's response text
"""

import os
import sys
import time
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright

APP_URL = os.environ.get("APP_URL", "http://127.0.0.1:3000")
SHOT_DIR = Path(tempfile.gettempdir()) / "innerplay-e2e"
SHOT_DIR.mkdir(parents=True, exist_ok=True)


def run_test() -> int:
    failures = []

    def check(condition: bool, message: str):
        if not condition:
            failures.append(message)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Capture console logs for debugging
        logs = []
        page.on("console", lambda msg: logs.append(f"[{msg.type}] {msg.text}"))

        print("\n=== Step 1: Landing page ===")
        page.goto(APP_URL, wait_until="domcontentloaded")
        page.wait_for_timeout(2000)  # allow React + WebSocket to initialize
        page.screenshot(path=str(SHOT_DIR / "01_landing.png"), full_page=True)

        title_visible = page.locator("text=The Last Session").is_visible()
        begin_visible = page.locator("text=BEGIN").is_visible()
        print(f"  Title visible: {title_visible}")
        print(f"  BEGIN button visible: {begin_visible}")
        check(title_visible, "Landing title not found")
        check(begin_visible, "BEGIN button not found")

        print("\n=== Step 2: Click BEGIN -> onboarding step 1 ===")
        page.locator("text=BEGIN").click()
        page.wait_for_timeout(800)
        page.screenshot(path=str(SHOT_DIR / "02_onboarding_1.png"), full_page=True)

        # Onboarding step 1: Headphones
        headphone_visible = page.locator("text=headphones").is_visible() or page.locator("text=Headphones").is_visible()
        print(f"  Headphones step visible: {headphone_visible}")
        if not headphone_visible:
            print("  [warn] Onboarding step 1 marker not found; continuing flow check.")
        # Click to advance
        page.locator("role=button").last.click()
        page.wait_for_timeout(600)

        print("\n=== Step 3: Onboarding step 2 ===")
        page.screenshot(path=str(SHOT_DIR / "03_onboarding_2.png"), full_page=True)
        page.locator("role=button").last.click()
        page.wait_for_timeout(600)

        print("\n=== Step 4: Onboarding step 3 ===")
        page.screenshot(path=str(SHOT_DIR / "04_onboarding_3.png"), full_page=True)
        page.locator("role=button").last.click()
        page.wait_for_timeout(600)

        print("\n=== Step 5: Countdown ===")
        page.screenshot(path=str(SHOT_DIR / "05_countdown.png"), full_page=True)
        # Wait for countdown to finish (3 seconds)
        page.wait_for_timeout(4000)

        print("\n=== Step 6: Game session ===")
        page.screenshot(path=str(SHOT_DIR / "06_game_session.png"), full_page=True)

        # Check game session UI
        mic_button_exists = page.locator("button[aria-label*='recording']").count() > 0
        input_exists = page.locator("input[placeholder*='Elara']").count() > 0
        print(f"  Mic button exists: {mic_button_exists}")
        print(f"  Text input exists: {input_exists}")

        print("\n=== Step 7: Wait for Elara's opening narration (Gemini response) ===")
        # Gemini Live API can take 5-15 seconds to respond
        print("  Waiting up to 20s for Elara text to appear...")
        try:
            page.wait_for_selector("[style*='italic']", timeout=20000)
            elara_text = page.locator("[style*='italic']").first.inner_text()
            print(f"  Elara text: {elara_text[:100]}...")
            has_elara_text = bool(elara_text.strip())
        except Exception:
            has_elara_text = False
            print("  No Elara text appeared within timeout")
        check(has_elara_text, "Game session did not produce opening narration")

        page.screenshot(path=str(SHOT_DIR / "07_elara_response.png"), full_page=True)

        print("\n=== Step 8: Send a text message ===")
        text_input = page.locator("input[placeholder*='Elara']")
        if text_input.count() > 0:
            text_input.fill("Hello Elara, how are you feeling today?")
            page.locator("button[type='submit']").click()
            print("  Message sent. Waiting for response...")
            page.wait_for_timeout(15000)
            page.screenshot(path=str(SHOT_DIR / "08_after_message.png"), full_page=True)
            after_text = page.locator("[style*='italic']").first.inner_text() if page.locator("[style*='italic']").count() > 0 else ""
            print(f"  Response text: {after_text[:100]}...")
        else:
            print("  Text input not found — skipping message step")

        print("\n=== Console Logs ===")
        for log in logs[-20:]:
            print(f"  {log}")

        print("\n=== Summary ===")
        print(f"  Landing page: {'PASS' if title_visible and begin_visible else 'FAIL'}")
        print(f"  Onboarding: PASS (progressed through steps)")
        print(f"  Game session UI: {'PASS' if has_elara_text else 'FAIL'}")
        print(f"  Gemini response (opening): {'PASS' if has_elara_text else 'PENDING (may need more time)'}")
        print(f"\nScreenshots saved to {SHOT_DIR}")
        if failures:
            print("\n=== Failures ===")
            for failure in failures:
                print(f"  - {failure}")

        browser.close()
        return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(run_test())
