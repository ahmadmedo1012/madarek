#!/usr/bin/env bash
# =============================================================================
# R333 WebKit user-space fixer (NO root required) — PROVEN WORKING 2026-11-03
# Verdict: Playwright WebKit 26.4 launches headless (WPE MiniBrowser) after:
#   1. user-space .deb extraction into /home/z/pw-libs
#   2. symlinking those .so files into the WPE bundle's sys/lib/
#      (reason: minibrowser-wpe/MiniBrowser wrapper script OVERWRITES
#       LD_LIBRARY_PATH with "$MYDIR/lib:$MYDIR/sys/lib", so bundle-local
#       symlinks are the only reliable injection point)
#   3. launching with software-EGL env vars (no /dev/dri in sandbox)
#
# Usage:
#   bash /home/z/madarek/scripts/r333/webkit-userland.sh fix    # download+extract+symlink
#   bash /home/z/madarek/scripts/r333/webkit-userland.sh test   # launch probe (exit 0 = OK)
#   bash /home/z/madarek/scripts/r333/webkit-userland.sh env    # print launch env vars
#
# Required launch env (also printed by `... env`):
#   LIBGL_ALWAYS_SOFTWARE=1
#   __EGL_VENDOR_LIBRARY_FILENAMES=/home/z/pw-libs/usr/share/glvnd/egl_vendor.d/50_mesa.json
#   PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1
#
# NOTE: symlinks live inside ~/.cache/ms-playwright/webkit-2287/ — re-run
# `fix` after any `npx playwright install webkit` (cache is wiped on reinstall).
# =============================================================================

LIBDIR="/home/z/pw-libs"
DEBDIR="/tmp/r333-debs"
CONTENTS="$DEBDIR/Contents-amd64.gz"
WEBKIT_ROOT="${WEBKIT_ROOT:-/home/z/.cache/ms-playwright/webkit-2287}"
BUNDLE_LIB="$WEBKIT_ROOT/minibrowser-wpe/sys/lib"
MAX_ITER=8

# Sonames known to be missing on the host (trixie container), mapped to Debian packages.
KNOWN_SONAME_PKGS="
  libwoff2dec.so.1.0.2 libwoff1
  libgstgl-1.0.so.0 libgstreamer-gl1.0-0
  libgstcodecparsers-1.0.so.0 libgstreamer-plugins-bad1.0-0
  libgudev-1.0.so.0 libgudev-1.0-0
  libEGL.so.1 libegl1
  libEGL_mesa.so.0 libegl-mesa0
  libGLESv2.so.2 libgles2
"

_webkit_launch_probe() {
  cd /tmp && LIBGL_ALWAYS_SOFTWARE=1 \
    __EGL_VENDOR_LIBRARY_FILENAMES="$LIBDIR/usr/share/glvnd/egl_vendor.d/50_mesa.json" \
    PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 \
    timeout 90 node -e '
      const { webkit } = require("/home/z/madarek/node_modules/playwright-core");
      (async () => {
        const b = await webkit.launch();
        const p = await b.newPage();
        await p.setContent("<h1>probe</h1>");
        console.log("WEBKIT_LAUNCH_OK version=" + b.version() + " text=" + await p.textContent("h1"));
        await b.close(); process.exit(0);
      })().catch(e => { console.error("LAUNCH_FAIL: " + e.message.split("\n").slice(0,6).join(" | ")); process.exit(2); });
    ' 2>&1
}

webkit-userland-test() { _webkit_launch_probe; }

webkit-userland-env() {
  echo "export LIBGL_ALWAYS_SOFTWARE=1"
  echo "export __EGL_VENDOR_LIBRARY_FILENAMES=$LIBDIR/usr/share/glvnd/egl_vendor.d/50_mesa.json"
  echo "export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1"
}

_soname_to_pkg() {
  local so="$1" p
  # 1) known mapping table
  p=$(printf '%s\n' "$KNOWN_SONAME_PKGS" | awk -v s="$so" '$1==s{print $2}')
  # 2) fallback: Debian Contents index (last whitespace field, strip section/ prefix)
  if [ -z "$p" ] && [ -s "$CONTENTS" ]; then
    p=$(zgrep -m1 -F "/$so " "$CONTENTS" 2>/dev/null | awk '{print $NF}' | awk -F/ '{print $NF}' | cut -d, -f1)
  fi
  echo "$p"
}

_ensure_contents() {
  mkdir -p "$DEBDIR" "$LIBDIR" "$BUNDLE_LIB"
  if [ ! -s "$CONTENTS" ]; then
    echo "[webkit-userland] fetching Debian Contents index (~45MB, one-time)..."
    curl -sSL -o "$CONTENTS" "https://deb.debian.org/debian/dists/trixie/main/Contents-amd64.gz" || return 1
  fi
}

_install_symlinks() {
  local n=0 src b
  for src in "$LIBDIR"/usr/lib/x86_64-linux-gnu/lib*.so* "$LIBDIR"/lib/x86_64-linux-gnu/lib*.so*; do
    [ -e "$src" ] || continue
    b=$(basename "$src")
    [ -e "$BUNDLE_LIB/$b" ] || { ln -s "$src" "$BUNDLE_LIB/$b"; n=$((n+1)); }
  done
  echo "[webkit-userland] symlinked $n libs into $BUNDLE_LIB (cumulative: $(ls "$BUNDLE_LIB" | wc -l))"
}

webkit-userland-fix() {
  _ensure_contents || { echo "[webkit-userland] cannot fetch Contents index"; return 1; }
  local iter out missing so p pkgs
  for iter in $(seq 1 "$MAX_ITER"); do
    out=$(_webkit_launch_probe); rc=$?
    [ $rc -eq 0 ] && { echo "[webkit-userland] $out"; return 0; }
    # grab unresolved sonames from the raw loader/browser stderr
    missing=$(printf '%s\n' "$out" | grep -oE 'lib[A-Za-z0-9_.+-]+\.so(\.[0-9]+)*' | sort -u)
    [ -z "$missing" ] && { echo "[webkit-userland] launch failed, no sonames parseable:"; echo "$out"; return 1; }
    pkgs=""
    for so in $missing; do
      p=$(_soname_to_pkg "$so")
      if [ -n "$p" ]; then echo "[webkit-userland] iter $iter: $so -> $p"; pkgs="$pkgs $p"
      else echo "[webkit-userland] iter $iter: $so -> NO PACKAGE FOUND"; fi
    done
    [ -z "${pkgs// }" ] && { echo "[webkit-userland] no packages resolvable; BLOCKED"; return 1; }
    for p in $pkgs; do
      ( cd "$DEBDIR" && apt-get download "$p" >/dev/null 2>&1 ) \
        || echo "[webkit-userland] iter $iter: download failed: $p (skipping)"
    done
    for f in "$DEBDIR"/*.deb; do dpkg -x "$f" "$LIBDIR" 2>/dev/null; done
    _install_symlinks
  done
  echo "[webkit-userland] exhausted $MAX_ITER iterations"; return 1
}

case "$1" in
  fix)  webkit-userland-fix ;;
  test) webkit-userland-test ;;
  env)  webkit-userland-env ;;
  *)    echo "usage: $0 {fix|test|env}"; exit 1 ;;
esac
