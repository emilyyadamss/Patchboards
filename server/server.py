#!/usr/bin/env python3
"""
PatchBoards — local server
Queries Homebrew (and optionally winget) for installed/outdated packages,
then serves the data to the dashboard on http://localhost:4242
"""

import json
import subprocess
import sys
import os
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

PORT = 4242

# ── Homebrew ────────────────────────────────────────────────────────────────

def brew_installed():
    """Return list of all installed Homebrew formulae + casks with versions."""
    packages = []

    # Formulae
    try:
        result = subprocess.run(
            ["brew", "list", "--formula", "--versions"],
            capture_output=True, text=True, timeout=30
        )
        for line in result.stdout.strip().splitlines():
            parts = line.split()
            if len(parts) >= 2:
                packages.append({
                    "name":    parts[0],
                    "version": parts[-1],
                    "manager": "homebrew",
                    "type":    "formula",
                })
    except Exception as e:
        print(f"[brew formulae] {e}")

    # Casks
    try:
        result = subprocess.run(
            ["brew", "list", "--cask", "--versions"],
            capture_output=True, text=True, timeout=30
        )
        for line in result.stdout.strip().splitlines():
            parts = line.split()
            if len(parts) >= 2:
                packages.append({
                    "name":    parts[0],
                    "version": parts[-1],
                    "manager": "homebrew-cask",
                    "type":    "cask",
                })
    except Exception as e:
        print(f"[brew casks] {e}")

    return packages


def brew_outdated():
    """Return dict of {name: {latest, isSecurity}} for outdated packages."""
    outdated = {}

    try:
        result = subprocess.run(
            ["brew", "outdated", "--json=v2"],
            capture_output=True, text=True, timeout=60
        )
        data = json.loads(result.stdout)

        for f in data.get("formulae", []):
            name = f.get("name", "")
            current_versions = f.get("installed_versions", [])
            current = current_versions[-1] if current_versions else "?"
            latest  = f.get("current_version", "?")
            outdated[name] = {
                "version": current,
                "latest":  latest,
                "isSecurity": False,   # Homebrew doesn't flag CVEs in this endpoint
                "note":    f"Update available via Homebrew.",
                "sourceUrl": f"https://formulae.brew.sh/formula/{name}",
            }

        for c in data.get("casks", []):
            name = c.get("name", "")
            current = c.get("installed_versions", "?")
            latest  = c.get("current_version", "?")
            outdated[name] = {
                "version": current,
                "latest":  latest,
                "isSecurity": False,
                "note":    f"Update available via Homebrew Cask.",
                "sourceUrl": f"https://formulae.brew.sh/cask/{name}",
            }

    except Exception as e:
        print(f"[brew outdated] {e}")

    return outdated


def brew_security_advisories():
    """
    Pull security advisories from the Homebrew audit.
    Returns set of package names that have known vulnerabilities.
    """
    vulnerable = set()
    try:
        result = subprocess.run(
            ["brew", "audit", "--json", "--only-cops=vulnerabilities"],
            capture_output=True, text=True, timeout=60
        )
        data = json.loads(result.stdout or "{}")
        for name in data:
            if data[name].get("errors") or data[name].get("warnings"):
                vulnerable.add(name)
    except Exception:
        pass   # brew audit may not support this flag on all versions
    return vulnerable


def get_homebrew_packages():
    """Merge installed + outdated + security into a unified package list."""
    installed  = brew_installed()
    outdated   = brew_outdated()
    vulnerable = brew_security_advisories()

    result = []
    for pkg in installed:
        name = pkg["name"]
        if name in outdated:
            info = outdated[name]
            is_sec = name in vulnerable
            result.append({
                **pkg,
                "status":     "security" if is_sec else "update",
                "latest":     info["latest"],
                "isSecurity": is_sec,
                "note":       info["note"],
                "sourceUrl":  info["sourceUrl"],
            })
        else:
            result.append({
                **pkg,
                "status":     "ok",
                "latest":     pkg["version"],
                "isSecurity": False,
                "note":       "",
                "sourceUrl":  f"https://formulae.brew.sh/{'cask' if pkg['type']=='cask' else 'formula'}/{name}",
            })
    return result


# ── winget (stub — runs on Windows only) ────────────────────────────────────

def get_winget_packages():
    """
    Query winget for installed + outdated packages.
    Only functional on Windows; returns [] on macOS/Linux.
    """
    if sys.platform != "win32":
        return []

    packages = []
    try:
        result = subprocess.run(
            ["winget", "list", "--accept-source-agreements"],
            capture_output=True, text=True, timeout=60
        )
        lines = result.stdout.strip().splitlines()
        # Skip header rows (winget output has 2 header lines + separator)
        data_lines = [l for l in lines if l.strip() and not l.startswith("-") and not l.lower().startswith("name")]
        for line in data_lines:
            parts = line.split()
            if len(parts) >= 3:
                packages.append({
                    "name":    parts[0],
                    "version": parts[2] if len(parts) > 2 else "?",
                    "manager": "winget",
                    "type":    "winget",
                    "status":  "unscanned",
                    "latest":  None,
                    "isSecurity": False,
                    "note":    "",
                    "sourceUrl": "",
                })
    except Exception as e:
        print(f"[winget list] {e}")

    # Check outdated
    try:
        result = subprocess.run(
            ["winget", "upgrade", "--accept-source-agreements"],
            capture_output=True, text=True, timeout=60
        )
        outdated_names = set()
        for line in result.stdout.splitlines():
            parts = line.split()
            if len(parts) >= 4:
                outdated_names.add(parts[0].lower())
        for pkg in packages:
            if pkg["name"].lower() in outdated_names:
                pkg["status"] = "update"
    except Exception as e:
        print(f"[winget upgrade] {e}")

    return packages


# ── HTTP handler ─────────────────────────────────────────────────────────────

class Handler(BaseHTTPRequestHandler):

    def log_message(self, fmt, *args):
        print(f"  {self.address_string()} {fmt % args}")

    def send_json(self, data, status=200):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", len(body))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)

        # GET /packages — full merged list
        if parsed.path == "/packages":
            try:
                brew = get_homebrew_packages()
                winget = get_winget_packages()
                all_pkgs = brew + winget
                # Assign stable IDs
                for i, pkg in enumerate(all_pkgs):
                    pkg["id"] = i + 1
                self.send_json({"packages": all_pkgs, "error": None})
            except Exception as e:
                self.send_json({"packages": [], "error": str(e)}, 500)

        # GET /health — sanity check
        elif parsed.path == "/health":
            brew_ok = subprocess.run(["which", "brew"], capture_output=True).returncode == 0
            self.send_json({
                "status": "ok",
                "homebrew": brew_ok,
                "winget": sys.platform == "win32",
                "platform": sys.platform,
            })

        else:
            self.send_json({"error": "Not found"}, 404)


# ── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print(f"\n  PatchBoards local server")
    print(f"  Listening on http://localhost:{PORT}")
    print(f"  Press Ctrl+C to stop\n")

    brew_ok = subprocess.run(["which", "brew"], capture_output=True).returncode == 0
    if not brew_ok:
        print("  ⚠️  Homebrew not found — install it from https://brew.sh")
    else:
        print("  ✓  Homebrew detected")

    if sys.platform == "win32":
        winget_ok = subprocess.run(["where", "winget"], capture_output=True).returncode == 0
        print(f"  {'✓' if winget_ok else '⚠️'} winget {'detected' if winget_ok else 'not found'}")

    print()
    server = HTTPServer(("localhost", PORT), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Server stopped.")
