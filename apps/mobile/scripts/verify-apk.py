#!/usr/bin/env python3
"""Verify an Android release APK (and optionally its AAB).

This is the single source of truth for Android artifact checks in CI and
locally. It uses the Android SDK build-tools (aapt2/apksigner) plus direct
ZIP inspection, so it validates the actual installable bytes rather than
trusting Gradle's output paths.

Checks:
  * ZIP integrity and required APK/AAB members
  * package id, versionName, versionCode, minSdk, targetSdk via aapt2
  * release build is not debuggable
  * native libraries exist for every expected ABI, and only those ABIs
  * APK is signed; certificate digest and signing mode are recorded
  * APK Signature Scheme v2 or v3 is present
  * AAB has a manifest, BundleConfig.pb, native libs, and a JAR signature

Usage:
  ANDROID_HOME=$ANDROID_HOME python3 apps/mobile/scripts/verify-apk.py \
    --apk build/Madarek.apk \
    --aab build/Madarek.aab \
    --json-out build/verify.json \
    --expected-signing-mode release
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path

DEFAULT_BUILD_TOOLS = "37.0.0"
DEFAULT_ARCHITECTURES = "arm64-v8a,armeabi-v7a"


def fail(message: str) -> None:
    print(f"FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def ok(message: str) -> None:
    print(f"OK:   {message}")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def find_build_tools(sdk_root: Path, requested: str | None) -> Path:
    root = sdk_root / "build-tools"
    if not root.is_dir():
        fail(f"missing Android build-tools directory: {root}")
    if requested:
        candidate = root / requested
        if not (candidate / "aapt2").is_file() or not (candidate / "apksigner").is_file():
            fail(f"build-tools {requested} does not contain aapt2 + apksigner: {candidate}")
        return candidate

    def version_key(path: Path) -> tuple[int, ...]:
        return tuple(int(part) for part in re.findall(r"\d+", path.name))

    candidates = [
        path
        for path in root.iterdir()
        if path.is_dir() and (path / "aapt2").is_file() and (path / "apksigner").is_file()
    ]
    if not candidates:
        fail(f"no usable build-tools under {root}")
    return sorted(candidates, key=version_key)[-1]


def run(command: list[str], label: str) -> str:
    print(f"$ {' '.join(command)}")
    proc = subprocess.run(command, text=True, capture_output=True)
    output = (proc.stdout or "") + (proc.stderr or "")
    if proc.returncode != 0:
        print(output, file=sys.stderr)
        fail(f"{label} failed (exit {proc.returncode})")
    return output


def parse_badging(output: str) -> dict:
    package_match = re.search(
        r"package: name='([^']+)' versionCode='([^']+)' versionName='([^']+)'",
        output,
    )
    if not package_match:
        fail("aapt2 badging: could not parse package line")
    package, version_code, version = package_match.groups()

    # build-tools 37 labels the minimum SDK "minSdkVersion" while older
    # aapt2 releases emit "sdkVersion". Accept both so the verifier remains
    # valid across runner images.
    min_sdk_match = re.search(r"(?:^|\n)(?:minSdkVersion|sdkVersion):'(\d+)'", output)
    target_sdk_match = re.search(r"(?:^|\n)targetSdkVersion:'(\d+)'", output)
    if not min_sdk_match or not target_sdk_match:
        fail("aapt2 badging: could not parse minSdkVersion/targetSdkVersion")

    native_match = re.search(r"native-code: (.*)", output)
    native = re.findall(r"'([^']+)'", native_match.group(1)) if native_match else []
    compile_sdk_match = re.search(r"compileSdkVersion='(\d+)'", output)

    return {
        "package": package,
        "version_code": int(version_code),
        "version": version,
        "min_sdk": int(min_sdk_match.group(1)),
        "target_sdk": int(target_sdk_match.group(1)),
        "compile_sdk": int(compile_sdk_match.group(1)) if compile_sdk_match else None,
        "native_code": native,
        "debuggable": bool(re.search(r"^application-debuggable$", output, re.MULTILINE)),
    }


def read_runtime_version(apk: Path) -> str:
    """Read the expo-updates fingerprint embedded in the built APK.

    For a fingerprint runtime policy, expo-updates stores the 40-hex runtime
    version in assets/fingerprint. This is the value an OTA update must match.
    """
    try:
        with zipfile.ZipFile(apk) as zf:
            try:
                raw = zf.read("assets/fingerprint")
            except KeyError:
                fail("APK is missing assets/fingerprint (expo-updates runtime version)")
    except zipfile.BadZipFile as exc:
        fail(f"APK is not a valid ZIP: {exc}")

    try:
        value = raw.decode("utf-8").strip()
    except UnicodeDecodeError:
        fail("assets/fingerprint is not valid UTF-8")
    if not re.fullmatch(r"[0-9a-f]{40}", value):
        fail(f"assets/fingerprint is not a 40-hex runtime version: {value!r}")
    return value


def parse_apksigner(output: str) -> dict:
    # build-tools 37 reports "V2 Signer: certificate ..." while older
    # releases use "Signer #1 certificate ...". Match either format, then
    # require a single signer so the digest is unambiguous.
    signers_match = re.search(r"Number of signers: (\d+)", output)
    if signers_match and int(signers_match.group(1)) != 1:
        fail(f"apksigner: expected exactly 1 signer, got {signers_match.group(1)}")

    digest_match = re.search(
        r"(?:V[0-9.]+ Signer:?|Signer #1) certificate SHA-256 digest: ([0-9a-fA-F:]+)",
        output,
    )
    if not digest_match:
        fail("apksigner: could not parse signer certificate SHA-256 digest")
    digest = digest_match.group(1).replace(":", "").lower()

    dn_match = re.search(r"(?:V[0-9.]+ Signer:?|Signer #1) certificate DN: (.+)", output)
    dn = dn_match.group(1).strip() if dn_match else ""

    schemes = [
        match.group(1)
        for match in re.finditer(
            r"Verified using v([0-9.]+) scheme .*?: true", output
        )
    ]
    return {
        "certificate_sha256": digest,
        "certificate_dn": dn,
        "signing_mode": "debug" if "Android Debug" in dn else "release",
        "signature_schemes": schemes,
    }


def inspect_apk_zip(apk: Path, expected_architectures: set[str]) -> None:
    try:
        zf = zipfile.ZipFile(apk)
        bad = zf.testzip()
        if bad:
            fail(f"APK member failed CRC: {bad}")
        names = zf.namelist()
    except zipfile.BadZipFile as exc:
        fail(f"APK is not a valid ZIP: {exc}")

    required = {"AndroidManifest.xml", "classes.dex", "resources.arsc"}
    missing = required - set(names)
    if missing:
        fail(f"APK is missing required members: {sorted(missing)}")

    apk_abis = set()
    for name in names:
        match = re.match(r"lib/([^/]+)/.+\.so$", name)
        if match:
            apk_abis.add(match.group(1))
    if not apk_abis:
        fail("APK has no native libraries under lib/")
    if apk_abis != expected_architectures:
        fail(
            f"APK native ABIs {sorted(apk_abis)} do not match expected "
            f"{sorted(expected_architectures)}"
        )
    for abi in expected_architectures:
        if not any(name.startswith(f"lib/{abi}/") and name.endswith(".so") for name in names):
            fail(f"APK has no .so files for ABI {abi}")
    ok(f"APK ZIP members; native ABIs={sorted(apk_abis)}")


def inspect_aab_zip(aab: Path, expected_architectures: set[str]) -> None:
    try:
        zf = zipfile.ZipFile(aab)
        bad = zf.testzip()
        if bad:
            fail(f"AAB member failed CRC: {bad}")
        names = zf.namelist()
    except zipfile.BadZipFile as exc:
        fail(f"AAB is not a valid ZIP: {exc}")

    required = {"base/manifest/AndroidManifest.xml", "BundleConfig.pb"}
    missing = required - set(names)
    if missing:
        fail(f"AAB is missing required members: {sorted(missing)}")

    aab_abis = set()
    for name in names:
        match = re.match(r"base/lib/([^/]+)/.+\.so$", name)
        if match:
            aab_abis.add(match.group(1))
    if aab_abis != expected_architectures:
        fail(
            f"AAB native ABIs {sorted(aab_abis)} do not match expected "
            f"{sorted(expected_architectures)}"
        )

    if "META-INF/MANIFEST.MF" not in names:
        fail("AAB has no META-INF/MANIFEST.MF (not JAR-signed)")
    if not any(re.fullmatch(r"META-INF/[^/]+\.(SF|RSA|EC|DSA)", name) for name in names):
        fail("AAB has no JAR signature block (META-INF/*.SF or *.RSA)")

    jarsigner = shutil.which("jarsigner")
    if jarsigner:
        output = run([jarsigner, "-verify", str(aab)], "jarsigner -verify")
        if "jar verified" not in output.lower():
            print(output, file=sys.stderr)
            fail("jarsigner did not report 'jar verified' for the AAB")
    else:
        print("WARN: jarsigner not found; skipping AAB JAR signature command")
    ok(f"AAB structure + signature; native ABIs={sorted(aab_abis)}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Verify a signed Android release APK/AAB")
    parser.add_argument("--apk", type=Path, required=True)
    parser.add_argument("--aab", type=Path)
    parser.add_argument("--json-out", type=Path)
    parser.add_argument("--expected-package", default="ly.madarek.mobile")
    parser.add_argument("--expected-version", default="1.0.0")
    parser.add_argument("--expected-version-code", type=int, default=1)
    parser.add_argument(
        "--expected-signing-mode", choices=["auto", "debug", "release"], default="auto"
    )
    parser.add_argument("--expected-architectures", default=DEFAULT_ARCHITECTURES)
    parser.add_argument("--min-sdk", type=int, default=24)
    parser.add_argument("--target-sdk", type=int, default=36)
    parser.add_argument(
        "--expected-runtime-version",
        help="Fail if assets/fingerprint differs from this expo-updates runtime version",
    )
    parser.add_argument(
        "--build-tools-version",
        default=os.environ.get("BUILD_TOOLS_VERSION", DEFAULT_BUILD_TOOLS),
    )
    args = parser.parse_args()

    apk = args.apk.resolve()
    aab = args.aab.resolve() if args.aab else None
    if not apk.is_file():
        fail(f"missing APK: {apk}")
    if aab is not None and not aab.is_file():
        fail(f"missing AAB: {aab}")

    sdk_root_value = os.environ.get("ANDROID_HOME") or os.environ.get("ANDROID_SDK_ROOT")
    if not sdk_root_value:
        fail("ANDROID_HOME/ANDROID_SDK_ROOT is not set")
    sdk_root = Path(sdk_root_value)
    build_tools = find_build_tools(sdk_root, args.build_tools_version)
    aapt2 = build_tools / "aapt2"
    apksigner = build_tools / "apksigner"
    expected_abis = {item.strip() for item in args.expected_architectures.split(",") if item.strip()}

    print(f"APK:          {apk}")
    print(f"SDK root:     {sdk_root}")
    print(f"Build tools:  {build_tools.name}")
    print(f"Expected ABIs: {sorted(expected_abis)}")

    apk_size = apk.stat().st_size
    apk_sha = sha256_file(apk)
    print(f"APK size:     {apk_size} bytes ({apk_size / 1048576:.2f} MiB)")
    print(f"APK SHA-256:  {apk_sha}")

    badging = parse_badging(run([str(aapt2), "dump", "badging", str(apk)], "aapt2 dump badging"))
    print(
        "Badging:      "
        f"package={badging['package']} version={badging['version']} "
        f"({badging['version_code']}) minSdk={badging['min_sdk']} "
        f"targetSdk={badging['target_sdk']} compileSdk={badging['compile_sdk']} "
        f"native={badging['native_code']}"
    )
    if badging["package"] != args.expected_package:
        fail(f"unexpected package: {badging['package']}")
    if badging["version"] != args.expected_version:
        fail(f"unexpected versionName: {badging['version']}")
    if badging["version_code"] != args.expected_version_code:
        fail(f"unexpected versionCode: {badging['version_code']}")
    if badging["min_sdk"] < args.min_sdk:
        fail(f"minSdk {badging['min_sdk']} is below expected {args.min_sdk}")
    if badging["target_sdk"] < args.target_sdk:
        fail(f"targetSdk {badging['target_sdk']} is below expected {args.target_sdk}")
    if badging["debuggable"]:
        fail("release APK is marked android:debuggable=true")
    if set(badging["native_code"]) != expected_abis:
        fail(
            f"aapt2 native-code {badging['native_code']} does not match "
            f"expected {sorted(expected_abis)}"
        )
    if apk_size < 5 * 1024 * 1024:
        fail(f"APK is suspiciously small ({apk_size} bytes)")
    ok("package / version / SDK / native-code metadata")

    apksigner_info = parse_apksigner(
        run(
            [str(apksigner), "verify", "--verbose", "--print-certs", str(apk)],
            "apksigner verify",
        )
    )
    print(
        "Signature:    "
        f"mode={apksigner_info['signing_mode']} "
        f"schemes={apksigner_info['signature_schemes']} "
        f"cert={apksigner_info['certificate_sha256']}"
    )
    print(f"Signer DN:    {apksigner_info['certificate_dn']}")
    if args.expected_signing_mode != "auto" and apksigner_info["signing_mode"] != args.expected_signing_mode:
        fail(
            f"signing mode is {apksigner_info['signing_mode']}, expected "
            f"{args.expected_signing_mode}"
        )
    if not ({"2", "3", "3.1"} & set(apksigner_info["signature_schemes"])):
        fail(f"APK lacks a v2/v3 signature scheme: {apksigner_info['signature_schemes']}")
    ok("APK signature verifies (v2/v3)")

    inspect_apk_zip(apk, expected_abis)
    runtime_version = read_runtime_version(apk)
    print(f"Runtime:      {runtime_version}")
    if args.expected_runtime_version and runtime_version != args.expected_runtime_version:
        fail(
            f"runtime version {runtime_version} does not match expected "
            f"{args.expected_runtime_version}"
        )

    aab_size = None
    aab_sha = None
    if aab is not None:
        aab_size = aab.stat().st_size
        aab_sha = sha256_file(aab)
        print(f"AAB size:     {aab_size} bytes ({aab_size / 1048576:.2f} MiB)")
        print(f"AAB SHA-256:  {aab_sha}")
        if aab_size < 5 * 1024 * 1024:
            fail(f"AAB is suspiciously small ({aab_size} bytes)")
        inspect_aab_zip(aab, expected_abis)

    result = {
        "platform": "android",
        "apk": apk.name,
        "aab": aab.name if aab else None,
        "size_bytes": apk_size,
        "sha256": apk_sha,
        "aab_size_bytes": aab_size,
        "aab_sha256": aab_sha,
        "package": badging["package"],
        "version": badging["version"],
        "version_code": badging["version_code"],
        "min_sdk": badging["min_sdk"],
        "target_sdk": badging["target_sdk"],
        "compile_sdk": badging["compile_sdk"],
        "runtime_version": runtime_version,
        "architectures": sorted(expected_abis),
        "native_code": badging["native_code"],
        "debuggable": badging["debuggable"],
        "signing_mode": apksigner_info["signing_mode"],
        "certificate_sha256": apksigner_info["certificate_sha256"],
        "certificate_dn": apksigner_info["certificate_dn"],
        "signature_schemes": apksigner_info["signature_schemes"],
        "build_tools": build_tools.name,
        "checked_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "verifier": "apps/mobile/scripts/verify-apk.py",
    }

    if args.json_out:
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        args.json_out.write_text(
            json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )
        print(f"JSON:         {args.json_out}")

    print("\nALL CHECKS PASSED")
    print(f"RESULT_SHA256={apk_sha}")
    print(f"RESULT_SIZE={apk_size}")
    if aab_sha:
        print(f"RESULT_AAB_SHA256={aab_sha}")
        print(f"RESULT_AAB_SIZE={aab_size}")
    print(f"RESULT_SIGNING_MODE={apksigner_info['signing_mode']}")
    print(f"RESULT_RUNTIME_VERSION={runtime_version}")


if __name__ == "__main__":
    main()
