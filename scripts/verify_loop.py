"""
Close-the-loop verifier for agentic development.

Workflow:
1) Ensure app URL is reachable (or start local dev server automatically)
2) Run static checks and test suites
3) Run headless UI E2E
4) Return non-zero on any failure

Usage:
  python scripts/verify_loop.py

Optional env:
  APP_URL=http://127.0.0.1:3002
  APP_PORT=3000
"""

from __future__ import annotations

import os
import shutil
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from typing import Optional


def _health_url(base_url: str) -> str:
    return f"{base_url.rstrip('/')}/api/health"


def is_healthy(base_url: str, timeout_seconds: float = 2.0) -> bool:
    req = urllib.request.Request(_health_url(base_url), method="GET")
    try:
        with urllib.request.urlopen(req, timeout=timeout_seconds) as resp:
            return 200 <= resp.status < 300
    except (urllib.error.URLError, TimeoutError, ValueError):
        return False


def find_free_port(start: int = 3000, end: int = 3020) -> int:
    for port in range(start, end + 1):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            if sock.connect_ex(("127.0.0.1", port)) != 0:
                return port
    raise RuntimeError(f"No free port found in range {start}-{end}")


def run_step(name: str, command: list[str], env: Optional[dict[str, str]] = None) -> None:
    print(f"\n== {name} ==")
    print(" ".join(command))
    result = subprocess.run(command, env=env)
    if result.returncode != 0:
        raise RuntimeError(f"{name} failed with exit code {result.returncode}")


def wait_for_server(base_url: str, timeout_seconds: int = 120) -> bool:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        if is_healthy(base_url):
            return True
        time.sleep(1.5)
    return False


def resolve_npm_command() -> str:
    if os.name == "nt":
        return shutil.which("npm.cmd") or "npm.cmd"
    return shutil.which("npm") or "npm"


def start_dev_server(port: int) -> subprocess.Popen[str]:
    print(f"\n== Start Dev Server on {port} ==")
    return subprocess.Popen(  # noqa: S603
        [resolve_npm_command(), "run", "dev", "--", "--hostname", "127.0.0.1", "--port", str(port)],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
    )


def stop_process(proc: subprocess.Popen[str]) -> None:
    if proc.poll() is not None:
        return
    proc.terminate()
    try:
        proc.wait(timeout=10)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.wait(timeout=5)


def main() -> int:
    env = os.environ.copy()
    existing_url = env.get("APP_URL")
    base_url = existing_url if existing_url else "http://127.0.0.1:3000"

    server_proc: Optional[subprocess.Popen[str]] = None
    started_local_server = False

    try:
        npm = resolve_npm_command()

        if is_healthy(base_url):
            print(f"Using existing app server at {base_url}")
        else:
            if existing_url:
                raise RuntimeError(
                    f"APP_URL is set to {base_url}, but health check failed at {_health_url(base_url)}"
                )

            preferred_port = int(env.get("APP_PORT", "3000"))
            port = preferred_port

            if not is_healthy(f"http://127.0.0.1:{port}"):
                try:
                    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
                        sock.settimeout(0.5)
                        if sock.connect_ex(("127.0.0.1", port)) == 0:
                            port = find_free_port(3000, 3020)
                except OSError:
                    port = find_free_port(3000, 3020)

            server_proc = start_dev_server(port)
            base_url = f"http://127.0.0.1:{port}"
            started_local_server = True

            if not wait_for_server(base_url, timeout_seconds=150):
                log_tail = ""
                if server_proc.stdout:
                    try:
                        log_tail = "".join(server_proc.stdout.readlines()[-80:])
                    except Exception:
                        log_tail = ""
                raise RuntimeError(
                    f"Dev server did not become healthy at {_health_url(base_url)}.\nRecent logs:\n{log_tail}"
                )

            print(f"Dev server is healthy at {base_url}")

        env["APP_URL"] = base_url
        if env.get("PLAY_STORY") == "the-call" and "EXPECT_CONSOLE_MARKER" not in env:
            env["EXPECT_CONSOLE_MARKER"] = "sound.the_call_state_director.ai_actions_applied"

        run_step("Lint (creator scope)", [npm, "run", "lint:creator"], env=env)
        run_step("Contract tests", [npm, "run", "test:creator:contract"], env=env)
        run_step("Closed-loop scenario", [npm, "run", "test:scenario"], env=env)
        run_step("The Call audio contract", [npm, "run", "test:the-call:audio"], env=env)
        run_step("UI E2E (headless)", [npm, "run", "test:e2e:ui"], env=env)

        print("\nAll verification steps passed.")
        return 0
    except Exception as exc:  # noqa: BLE001
        print(f"\nVerification failed: {exc}")
        return 1
    finally:
        if started_local_server and server_proc is not None:
            stop_process(server_proc)


if __name__ == "__main__":
    sys.exit(main())
