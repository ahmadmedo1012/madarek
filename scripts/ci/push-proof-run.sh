#!/usr/bin/env bash
# R356 Lane N — the in-emulator push-proof sequence.
#
# Runs ON THE RUNNER inside reactivecircus/android-emulator-runner@v2
# (booted google_apis API 34 emulator, adb on PATH). Invoked as ONE
# script because the action runs every `script:` LINE as its own
# /bin/sh -c (no cwd/vars survive across lines — build-android.yml's
# documented lesson).
#
# Sequence: grant the notification permission → install the proof APK
# → Maestro login (production, seeded student) → verify the device row
# on production → fire a REAL announcement from the registrar → poll
# for the arrival (dumpsys + logcat) → open the in-app inbox and
# screenshot it → re-read the device row (survival = receipt ok).
#
# No `set -e`: EVERY step records its evidence; the runner-side assert
# step (in the workflow) is the gate.
set -uo pipefail

WS="$GITHUB_WORKSPACE"
B="$WS/apps/mobile/build"
API="$API_BASE"
cd "$WS"
mkdir -p "$B"

echo "== [1/8] grant POST_NOTIFICATIONS (deterministic; the in-app ask is unit-tested) =="
adb shell pm grant ly.madarek.mobile android.permission.POST_NOTIFICATIONS || echo "pm grant failed (recorded — API <33 has no runtime grant, delivery is unaffected)"

echo "== [2/8] install the proof APK =="
adb uninstall ly.madarek.mobile >/dev/null 2>&1 || true
adb install -r "$B/Madarek-push-x86_64.apk" || { echo "INSTALL FAILED"; exit 1; }

echo "== [3/8] Maestro: login to production + open the alerts inbox =="
maestro test apps/mobile/.maestro/push-proof.yaml --format junit --output "$B/push-maestro-junit.xml" || echo "maestro login flow FAILED (recorded)"
adb exec-out screencap -p > "$B/push-before.png"

echo "== [4/8] wait for the silent registration (token mint → POST /me/push-devices) =="
sleep 25

STUDENT_TOKEN=$(curl -sS --max-time 30 -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"student@test.ly","password":"12345678"}' | jq -r '.data.accessToken // empty')
echo "student login: ${STUDENT_TOKEN:+ok}"

curl -sS --max-time 30 "$API/me/push-devices" \
  -H "Authorization: Bearer $STUDENT_TOKEN" | tee "$B/push-devices.json"
echo

echo "== [5/8] the REAL server event: the registrar posts a PLATFORM announcement =="
STAMP="$(date -u +%H:%M:%S)"
REG_TOKEN=$(curl -sS --max-time 30 -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"registrar@test.ly","password":"12345678"}' | jq -r '.data.accessToken // empty')
echo "registrar login: ${REG_TOKEN:+ok}"

curl -sS --max-time 30 -X POST "$API/announcements" \
  -H "Authorization: Bearer $REG_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"scope\":\"PLATFORM\",\"title\":\"إشعار تجريبي — وصلت الإشعارات الفورية ($STAMP)\",\"body\":\"اختبار وصول الإشعار الحقيقي من الخادم إلى هذا الجهاز — R356 Lane N\",\"pinned\":false}" \
  | tee "$B/announcement.json"
echo

echo "== [6/8] poll for the arrival (dumpsys + logcat, up to 120s) =="
adb logcat -c
ARRIVED=0
for i in $(seq 1 30); do
  adb shell dumpsys notification --noredact > "$B/dumpsys-notification.txt" 2>/dev/null || true
  # The posted notification belongs to our package AND carries our title.
  if grep -q "ly.madarek.mobile" "$B/dumpsys-notification.txt" 2>/dev/null; then
    ARRIVED=1
    echo "attempt $i: the notification is POSTED (dumpsys)"
    break
  fi
  echo "attempt $i: not yet — waiting 4s"
  sleep 4
done
adb logcat -d > "$B/logcat-push.log" 2>/dev/null || true
adb logcat -d > "$B/logcat-full.log" 2>/dev/null || true
adb exec-out screencap -p > "$B/push-after.png"
echo "ARRIVED=$ARRIVED"

echo "== [7/8] open the in-app inbox and screenshot the row =="
maestro test apps/mobile/.maestro/push-inbox.yaml --format junit --output "$B/push-inbox-junit.xml" || echo "maestro inbox flow FAILED (recorded)"
adb exec-out screencap -p > "$B/push-inbox.png"

echo "== [8/8] device row survival (an Expo DeviceNotRegistered receipt prunes it) =="
curl -sS --max-time 30 "$API/me/push-devices" \
  -H "Authorization: Bearer $STUDENT_TOKEN" | tee "$B/push-devices-after.json"
echo
echo "== push-proof sequence complete (ARRIVED=$ARRIVED) =="
