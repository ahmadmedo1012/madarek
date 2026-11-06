#!/usr/bin/env bash
# T-15 (R339) — user-space WebKit system libs for Playwright, NO root needed.
#
# The sandbox cannot `apt-get install` (no sudo), but `apt-get download` +
# `dpkg -x` into a prefix works. Playwright's WebKit (webkit-2287 / pw 1.60)
# needs system libs the base image lacks; this script fetches them into
# /tmp/webkit-prefix and prints the exports the browser launch needs:
#
#   LD_LIBRARY_PATH                        — the extracted libs
#   __EGL_VENDOR_LIBRARY_DIRS              — GLVND vendor dir (note the double
#                                             underscore; this libglvnd build
#                                             does NOT read the un-prefixed
#                                             EGL_VENDOR_LIBRARY_DIRS!)
#   PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS — pw's dep check greps
#                                             `ldconfig -p` only, which cannot
#                                             see the prefix (dlopen DOES
#                                             honour LD_LIBRARY_PATH, so this
#                                             skip is cosmetic, not a lie)
#
# It also patches the two MiniBrowser wrapper scripts inside the playwright
# cache: they REPLACE LD_LIBRARY_PATH instead of appending the inherited one,
# which would drop the prefix. The patch makes them append. Re-running
# `npx playwright install webkit` restores the wrappers — run this script
# again afterwards (it is idempotent).
#
# Usage:
#   bash scripts/conformance/webkit-libs.sh          # build/check prefix, print exports
#   eval "$(bash scripts/conformance/webkit-libs.sh)" # build + apply exports in one go
#   PLAYWRIGHT_WEBKIT_LD_PREFIX=/tmp/webkit-prefix node scripts/conformance/run.mjs \
#       --engine webkit --sections footer --bps 1440,390   # run.mjs applies them itself
set -euo pipefail

PREFIX="${PLAYWRIGHT_WEBKIT_LD_PREFIX:-/tmp/webkit-prefix}"
DEBDIR="${PLAYWRIGHT_WEBKIT_DEB_DIR:-/tmp/webkit-debs}"
# multiarch triplet for the lib dir (dpkg arch amd64 ≠ dir x86_64-linux-gnu)
ARCH="$(gcc -print-multiarch 2>/dev/null || echo x86_64-linux-gnu)"

# Every package the WebKit GTK+WPE bundle needs that the base image lacks
# (found by iterative `ldd` on MiniBrowser/WebKitWebProcess — libs depend on
# libs: gtk-4 pulls graphene/egl, gst pulls codecparsers, manette pulls
# evdev/gudev/hidapi, egl pulls glvnd+mesa...).
PACKAGES=(
  libgtk-4-1                       # libgtk-4.so.1          (MiniBrowser GTK)
  libgraphene-1.0-0                # libgraphene-1.0.so.0
  libgstreamer-gl1.0-0             # libgstgl-1.0.so.0
  libgstreamer-plugins-bad1.0-0    # libgstcodecparsers-1.0.so.0
  libmanette-0.2-0                 # libmanette-0.2.so.0    (gamepads)
  libenchant-2-2                   # libenchant-2.so.2      (spelling)
  libsecret-1-0                    # libsecret-1.so.0
  libwoff1                         # libwoff2dec.so.1.0.2
  libgles2                         # libGLESv2.so.2         (dlopen'd)
  libegl1                          # libEGL.so.1            (GLVND)
  libegl-mesa0                     # libEGL_mesa.so.0 + vendor json (surfaceless)
  libevdev2                        # libevdev.so.2
  libgudev-1.0-0                   # libgudev-1.0.so.0
  libhidapi-hidraw0                # libhidapi-hidraw.so.0
)

mkdir -p "$DEBDIR" "$PREFIX"

# 1) download + extract anything not present yet (idempotent per-package)
for pkg in "${PACKAGES[@]}"; do
  if ls "$PREFIX/usr/share/doc/$pkg" >/dev/null 2>&1; then
    continue # already extracted
  fi
  echo "· fetching $pkg" >&2
  (cd "$DEBDIR" && apt-get download "$pkg" >/dev/null 2>&1)
  deb=$(ls -t "$DEBDIR/${pkg}"_*.deb | head -1)
  dpkg -x "$deb" "$PREFIX"
done
echo "· prefix ready: $PREFIX" >&2

# 2) patch the MiniBrowser wrappers (REPLACE -> APPEND LD_LIBRARY_PATH)
WK="${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}"/webkit-*/
for wrapper in $WK/minibrowser-gtk/MiniBrowser $WK/minibrowser-wpe/MiniBrowser; do
  [ -f "$wrapper" ] || continue
  if grep -q 'sys/lib${LD_LIBRARY_PATH' "$wrapper"; then
    continue # already patched
  fi
  sed -i 's|export LD_LIBRARY_PATH="${MYDIR}/lib:${MYDIR}/sys/lib"|export LD_LIBRARY_PATH="${MYDIR}/lib:${MYDIR}/sys/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"|' "$wrapper"
  echo "· patched $wrapper (append LD_LIBRARY_PATH)" >&2
done

# 3) sanity: ldd must be clean on the headless (WPE) MiniBrowser
LIBDIR="$PREFIX/usr/lib/$ARCH"
WKWPE=$(ls -d "$HOME"/.cache/ms-playwright/webkit-*/minibrowser-wpe 2>/dev/null | sort | tail -1 || true)
if [ -n "$WKWPE" ] && command -v ldd >/dev/null; then
  missing=$(LD_LIBRARY_PATH="$LIBDIR:$WKWPE/lib:$WKWPE/sys/lib" \
    ldd "$WKWPE/bin/MiniBrowser" 2>/dev/null | grep -c "not found" || true)
  if [ "${missing:-0}" -gt 0 ]; then
    echo "WARNING: $missing libs still unresolved — extend PACKAGES and re-run" >&2
  else
    echo "· ldd clean: WPE MiniBrowser resolves fully" >&2
  fi
fi

# 4) print the exports (the script's stdout contract — everything else >&2)
cat <<EOF
export LD_LIBRARY_PATH="$LIBDIR:$PREFIX/usr/lib\${LD_LIBRARY_PATH:+:\$LD_LIBRARY_PATH}"
export __EGL_VENDOR_LIBRARY_DIRS="$PREFIX/usr/share/glvnd/egl_vendor.d"
export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1
EOF
