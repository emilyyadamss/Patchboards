#!/usr/bin/env python3
"""
PatchBoards — local server
Queries Homebrew (and optionally winget) for installed/outdated packages,
then serves the data to the dashboard on http://localhost:4242
"""

import json
import mimetypes
import os
import re
import subprocess
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

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


# ── winget (runs on Windows only) ───────────────────────────────────────────

def parse_winget_table(text):
    """
    Parse winget's fixed-width table output into a list of dicts.
    Uses the separator line (-----  -----  -----) to determine column positions,
    which is the only reliable way to handle names and IDs that contain spaces.
    """
    lines = text.splitlines()

    # Find the separator line — a line composed almost entirely of dashes and spaces
    sep_idx = None
    for i, line in enumerate(lines):
        stripped = line.strip()
        if len(stripped) > 20:
            non_space = stripped.replace(" ", "")
            if non_space and non_space.count("-") / len(non_space) > 0.8:
                sep_idx = i
                break

    if sep_idx is None or sep_idx == 0:
        return []

    sep_line = lines[sep_idx]
    # Each dash-run marks one column's character span
    spans = [(m.start(), m.end()) for m in re.finditer(r"-+", sep_line)]
    if not spans:
        return []

    def extract(line, col_idx):
        if col_idx >= len(spans):
            return ""
        s, e = spans[col_idx]
        return line[s : min(e, len(line))].strip()

    result = []
    for line in lines[sep_idx + 1 :]:
        if not line.strip() or re.match(r"^\d+ package", line.strip(), re.I):
            continue
        name    = extract(line, 0)
        pkg_id  = extract(line, 1)
        version = extract(line, 2)
        avail   = extract(line, 3) if len(spans) > 3 else ""
        if name and version and version not in ("Version", "Unknown", "<Unknown>"):
            result.append({
                "name":      name,
                "pkgId":     pkg_id,
                "version":   version,
                "available": avail or None,
            })
    return result


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
            capture_output=True, text=True,
            encoding="utf-8", errors="replace", timeout=60,
        )
        for p in parse_winget_table(result.stdout):
            pkg_id = p["pkgId"]
            packages.append({
                "name":       p["name"],
                "wingetId":   pkg_id,
                "version":    p["version"],
                "manager":    "winget",
                "type":       "winget",
                "status":     "ok",
                "latest":     None,
                "isSecurity": False,
                "note":       "",
                "sourceUrl":  (
                    f"https://winget.run/pkg/{pkg_id.replace('.', '/', 1)}"
                    if pkg_id and "." in pkg_id else ""
                ),
            })
    except Exception as e:
        print(f"[winget list] {e}")

    # Mark packages that have updates available
    try:
        result = subprocess.run(
            ["winget", "upgrade", "--accept-source-agreements"],
            capture_output=True, text=True,
            encoding="utf-8", errors="replace", timeout=60,
        )
        # Build a lookup by winget ID (IDs never contain spaces, so they're reliable)
        upgradeable = {
            p["pkgId"].lower(): p["available"]
            for p in parse_winget_table(result.stdout)
            if p["pkgId"]
        }
        for pkg in packages:
            wid = pkg["wingetId"].lower()
            if wid in upgradeable:
                pkg["status"] = "update"
                pkg["latest"] = upgradeable[wid]
    except Exception as e:
        print(f"[winget upgrade] {e}")

    return packages


# ── winget version lookup ────────────────────────────────────────────────────

def get_winget_version(package_id):
    """Return the latest available version string for a winget package, or None."""
    if sys.platform != "win32":
        return None
    try:
        result = subprocess.run(
            ["winget", "show", package_id, "--accept-source-agreements"],
            capture_output=True, text=True, timeout=30
        )
        for line in result.stdout.splitlines():
            stripped = line.strip()
            if stripped.lower().startswith("version:"):
                return stripped.split(":", 1)[1].strip()
    except Exception as e:
        print(f"[winget show] {e}")
    return None


# ── HTTP handler ─────────────────────────────────────────────────────────────

class Handler(BaseHTTPRequestHandler):

    def log_message(self, fmt, *args):
        print(f"  {self.address_string()} {fmt % args}")

    def _serve_file(self, path, content_type="text/plain"):
        try:
            with open(path, "rb") as f:
                body = f.read()
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", len(body))
            self.end_headers()
            self.wfile.write(body)
        except FileNotFoundError:
            self.send_json({"error": "Not found"}, 404)

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
        params = parse_qs(parsed.query)
        path = parsed.path

        # Static files — serve index.html, css/, js/ from the project root
        if path in ("", "/", "/index.html"):
            self._serve_file(os.path.join(BASE_DIR, "index.html"), "text/html; charset=utf-8")
            return

        if path.startswith("/css/") or path.startswith("/js/"):
            rel = path.lstrip("/").replace("/", os.sep)
            abs_path = os.path.normpath(os.path.join(BASE_DIR, rel))
            # Block path traversal
            if not abs_path.startswith(os.path.normpath(BASE_DIR)):
                self.send_json({"error": "Forbidden"}, 403)
                return
            # Fall back to config.example.js when config.js is absent
            if rel == os.path.join("js", "config.js") and not os.path.exists(abs_path):
                abs_path = os.path.join(BASE_DIR, "js", "config.example.js")
            mime = mimetypes.guess_type(abs_path)[0] or "text/plain"
            self._serve_file(abs_path, mime)
            return

        # GET /packages — full merged list (installed packages)
        if path == "/packages":
            try:
                brew = get_homebrew_packages()
                winget = get_winget_packages()
                all_pkgs = brew + winget
                for i, pkg in enumerate(all_pkgs):
                    pkg["id"] = i + 1
                self.send_json({"packages": all_pkgs, "error": None})
            except Exception as e:
                self.send_json({"packages": [], "error": str(e)}, 500)

        # GET /winget-version?package=<id> — latest available version for a winget package
        elif path == "/winget-version":
            package_id = params.get("package", [None])[0]
            if not package_id:
                self.send_json({"error": "Missing package parameter"}, 400)
                return
            if sys.platform != "win32":
                self.send_json({"error": "winget only available on Windows", "version": None})
                return
            version = get_winget_version(package_id)
            if version:
                self.send_json({
                    "version": version,
                    "sourceUrl": f"https://winget.run/pkg/{package_id.replace('.', '/')}",
                    "error": None,
                })
            else:
                self.send_json({"version": None, "error": f"Could not find version for {package_id}"})

        # GET /health — sanity check
        elif path == "/health":
            which = "where" if sys.platform == "win32" else "which"
            brew_ok = subprocess.run([which, "brew"], capture_output=True).returncode == 0
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

    which = "where" if sys.platform == "win32" else "which"
    brew_ok = subprocess.run([which, "brew"], capture_output=True).returncode == 0
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
