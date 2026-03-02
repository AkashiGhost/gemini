"""
Systematic diagnostic for InnerPlay - finds root causes of broken behavior.
Run: PYTHONIOENCODING=utf-8 python scripts/diagnose.py
"""
import sys
import time
sys.stdout.reconfigure(encoding='utf-8')

from playwright.sync_api import sync_playwright

URL = "https://innerplay-gemini-443171020325.us-central1.run.app"

issues = []

def log(msg): print(msg)
def issue(msg): print(f"  [ISSUE] {msg}"); issues.append(msg)
def ok(msg): print(f"  [OK] {msg}")
def info(msg): print(f"  [INFO] {msg}")


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(
            permissions=["microphone"],
            viewport={"width": 390, "height": 844},
        )
        page = ctx.new_page()

        console_errors = []
        console_logs = []
        ws_received = []
        ws_sent = []

        page.on("console", lambda m: (
            console_errors.append(m.text) if m.type == "error"
            else console_logs.append(f"[{m.type}] {m.text}")
        ))

        # Playwright WS events pass data directly as string/bytes
        def on_ws(ws):
            ws.on("framereceived", lambda data: ws_received.append(str(data)[:300]))
            ws.on("framesent", lambda data: ws_sent.append(str(data)[:300]))
        page.on("websocket", on_ws)

        # ── TEST 1: Landing page ──
        log("\n=== TEST 1: Landing Page ===")
        resp = page.goto(URL, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(3000)
        ok(f"Page loaded — HTTP {resp.status}")
        page.screenshot(path="/tmp/diag_01_landing.png")

        title_ok = page.locator("text=The Last Session").count() > 0
        begin_ok = page.locator("text=BEGIN").count() > 0
        ok("Title visible") if title_ok else issue("Title NOT visible")
        ok("BEGIN button visible") if begin_ok else issue("BEGIN button NOT visible")

        for e in console_errors:
            issue(f"JS error on landing: {e}")
        console_errors.clear()

        # ── TEST 2: WebSocket on landing (before game) ──
        log("\n=== TEST 2: WebSocket — connects on landing? ===")
        info(f"WS messages after landing: {len(ws_received)} received, {len(ws_sent)} sent")
        if ws_received:
            ok("WebSocket connected before game start")
            for m in ws_received[:2]:
                info(f"  recv: {m[:120]}")
        else:
            info("No WS messages yet (WS connects after BEGIN click — may be OK)")

        # ── TEST 3: Onboarding ──
        log("\n=== TEST 3: Onboarding ===")
        page.locator("text=BEGIN").click()
        page.wait_for_timeout(800)
        page.screenshot(path="/tmp/diag_02_ob1.png")

        for step in range(3):
            btns = page.locator("role=button").all()
            info(f"  Step {step+1} buttons: {[b.inner_text()[:15] for b in btns]}")
            if btns:
                btns[-1].click()
                page.wait_for_timeout(700)

        # Countdown: 3-2-1
        info("Waiting for countdown (3s)...")
        page.wait_for_timeout(4000)
        page.screenshot(path="/tmp/diag_03_game.png")

        # ── TEST 4: Game session UI ──
        log("\n=== TEST 4: Game Session UI Audit ===")

        mic_btn = page.locator("button[aria-label*='recording']")
        text_input = page.locator("input[placeholder*='Elara']")
        send_btn = page.locator("button[type='submit']")

        if mic_btn.count() > 0:
            ok(f"Mic button found (label: '{mic_btn.get_attribute('aria-label')}')")
            issue("Mic is CLICK-TO-TALK — user must press button to speak. Should be always-on with VAD.")
        else:
            issue("Mic button NOT found at all")

        if text_input.count() > 0:
            issue("Text input IS visible — ruins immersion for a voice-first eyes-closed game")
        else:
            ok("Text input not visible (good for immersion)")

        if send_btn.count() > 0:
            issue("Send button IS visible — should not exist in final game UI")

        # ── TEST 5: WS messages after game starts ──
        log("\n=== TEST 5: WebSocket — Game Messages ===")
        page.wait_for_timeout(5000)

        has_session_ready = any("SESSION_READY" in m for m in ws_received)
        has_audio_chunk = any("AUDIO_CHUNK" in m for m in ws_received)
        has_state_update = any("STATE_UPDATE" in m for m in ws_received)
        has_init_sent = any("INIT" in m for m in ws_sent)

        ok("INIT sent to server") if has_init_sent else issue("INIT never sent — game never started")
        ok("SESSION_READY received") if has_session_ready else issue("SESSION_READY not received — server-side failure")
        ok("AUDIO_CHUNK received (Elara spoke)") if has_audio_chunk else issue("No AUDIO_CHUNK — Elara never spoke or Gemini failed")
        ok("STATE_UPDATE received") if has_state_update else issue("No STATE_UPDATE")

        info(f"Total WS: {len(ws_received)} received, {len(ws_sent)} sent")
        log("  First 5 received:")
        for m in ws_received[:5]:
            info(f"    {m[:150]}")
        log("  First 3 sent:")
        for m in ws_sent[:3]:
            info(f"    {m[:150]}")

        # ── TEST 6: Elara text (wait longer for Gemini) ──
        log("\n=== TEST 6: Elara Opening Narration (waiting up to 20s) ===")
        page.wait_for_timeout(15000)
        page.screenshot(path="/tmp/diag_04_elara.png")

        elara_el = page.locator("[style*='italic']")
        if elara_el.count() > 0:
            text = elara_el.first.inner_text()
            ok(f"Elara text appeared: '{text[:100]}'")
        else:
            issue("Elara text NEVER appeared — either Gemini not responding or AudioContext blocked audio")

        # ── TEST 7: AudioContext autoplay issue ──
        log("\n=== TEST 7: AudioContext — Autoplay Policy ===")
        audio_ctx_state = page.evaluate("""() => {
            try {
                const ctx = new AudioContext();
                return ctx.state;
            } catch(e) { return 'error: ' + e.message; }
        }""")
        info(f"AudioContext state: '{audio_ctx_state}'")
        if audio_ctx_state == "suspended":
            issue("AudioContext is SUSPENDED — browser blocked audio autoplay. Audio won't play until user gesture. This is why audio is intermittent.")
        elif audio_ctx_state == "running":
            ok("AudioContext is running (audio should play)")
        else:
            issue(f"AudioContext state unexpected: {audio_ctx_state}")

        # ── TEST 8: Mic permissions and MediaDevices ──
        log("\n=== TEST 8: Microphone Access ===")
        mic_check = page.evaluate("""async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const mics = devices.filter(d => d.kind === 'audioinput');
                return { count: mics.length, labels: mics.map(m => m.label || 'unlabeled') };
            } catch(e) { return { error: e.message }; }
        }""")
        info(f"Microphone devices: {mic_check}")

        # ── TEST 9: Check if audio is actually playing ──
        log("\n=== TEST 9: Audio Playback State ===")
        audio_check = page.evaluate("""() => {
            // Check if AudioPlayback created a context
            const ctxs = [];
            try {
                // Check the window for any AudioContext instances
                return {
                    speechSynthesis: 'speechSynthesis' in window,
                    webAudio: 'AudioContext' in window || 'webkitAudioContext' in window,
                };
            } catch(e) { return { error: e.message }; }
        }""")
        info(f"Audio APIs: {audio_check}")

        # ── TEST 10: Console errors during game ──
        log("\n=== TEST 10: Console Errors During Game ===")
        if console_errors:
            for e in console_errors:
                issue(f"JS error: {e}")
        else:
            ok("No JS errors during game")

        info("All console logs:")
        for l in console_logs[-15:]:
            info(f"  {l}")

        # ── SUMMARY ──
        log("\n" + "="*55)
        log("ROOT CAUSE FINDINGS")
        log("="*55)
        for i, iss in enumerate(issues, 1):
            log(f"  {i}. {iss}")
        log(f"\nScreenshots: /tmp/diag_0*.png")

        browser.close()


if __name__ == "__main__":
    run()
