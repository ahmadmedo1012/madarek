#!/usr/bin/env python3
"""Verify an unsigned, device-only iOS IPA.

This script is the single source of truth for IPA checks in CI and locally.
It reads the archive directly (no extraction), so Unix permission bits and
symlinks cannot produce false failures.

Checks:
  * ZIP integrity and exactly one top-level Payload/ directory
  * exactly one Payload/<App>.app with Info.plist + executable
  * CFBundleIdentifier, CFBundleSupportedPlatforms, DTPlatformName
  * main executable is arm64 Mach-O with LC_BUILD_VERSION platform IOS
  * every embedded Mach-O/framework is arm64 device code (not Simulator)
  * no _CodeSignature and no embedded.mobileprovision
  * required resources: Info.plist, main.jsbundle, Assets.car, PkgInfo
  * main.jsbundle is a non-empty Hermes bytecode bundle
  * runtime version (Expo.plist / EXUpdates.bundle/fingerprint), when present

Usage:
  python3 apps/mobile/scripts/verify-ipa.py Madarek.ipa
  python3 apps/mobile/scripts/verify-ipa.py Madarek.ipa --json-out verify.json
"""

from __future__ import annotations

import argparse
import hashlib
import json
import plistlib
import struct
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path

LC_BUILD_VERSION = 0x32
MH_MAGIC_64 = 0xFEEDFACF
CPU_TYPE_ARM64 = 12 | 0x01000000
HERMES_MAGIC = b"\xc6\x1f\xbc\x03"

PLATFORMS = {
    1: "MACOS",
    2: "IOS",
    3: "TVOS",
    4: "WATCHOS",
    5: "BRIDGEOS",
    6: "MACCATALYST",
    7: "IOSSIMULATOR",
    8: "TVOSSIMULATOR",
    9: "WATCHOSSIMULATOR",
    10: "DRIVERKIT",
    11: "VISIONOS",
    12: "VISIONOSSIMULATOR",
}


def fail(message: str) -> None:
    print(f"FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def ok(message: str) -> None:
    print(f"OK:   {message}")


def decode_version(value: int) -> str:
    major = value >> 16
    minor = (value >> 8) & 0xFF
    patch = value & 0xFF
    return f"{major}.{minor}" if patch == 0 else f"{major}.{minor}.{patch}"


def parse_macho(data: bytes, label: str) -> dict:
    if len(data) < 32:
        fail(f"{label}: too small to be a Mach-O file")
    magic = struct.unpack_from("<I", data, 0)[0]
    if magic == 0xCAFEBABE or magic == 0xBEBAFECA:
        fail(f"{label}: fat/universal Mach-O is not expected; found a fat binary")
    if magic != MH_MAGIC_64:
        fail(f"{label}: not a little-endian 64-bit Mach-O (magic=0x{magic:08x})")

    cputype, _cpusubtype, _filetype, ncmds, _sizeofcmds, _flags, _reserved = struct.unpack_from(
        "<iiIIIII", data, 4
    )
    if cputype != CPU_TYPE_ARM64:
        fail(f"{label}: cputype 0x{cputype:08x} is not arm64")

    offset = 32
    build = None
    for _ in range(ncmds):
        if offset + 8 > len(data):
            fail(f"{label}: truncated Mach-O load commands")
        cmd, cmdsize = struct.unpack_from("<II", data, offset)
        if cmdsize < 8 or offset + cmdsize > len(data):
            fail(f"{label}: invalid Mach-O load command size")
        if cmd == LC_BUILD_VERSION:
            if cmdsize < 24:
                fail(f"{label}: truncated LC_BUILD_VERSION")
            platform, minos, sdk, ntools = struct.unpack_from("<IIII", data, offset + 8)
            build = {
                "platform_id": platform,
                "platform": PLATFORMS.get(platform, f"UNKNOWN({platform})"),
                "minos": decode_version(minos),
                "sdk": decode_version(sdk),
                "ntools": ntools,
            }
            break
        offset += cmdsize

    if build is None:
        fail(f"{label}: no LC_BUILD_VERSION load command")
    return {"label": label, "arch": "arm64", **build}


def main() -> None:
    parser = argparse.ArgumentParser(description="Verify an unsigned iPhoneOS IPA")
    parser.add_argument("ipa", type=Path)
    parser.add_argument("--json-out", type=Path)
    parser.add_argument("--expected-bundle-id", default="ly.madarek.mobile")
    parser.add_argument("--expected-platform", default="iPhoneOS")
    args = parser.parse_args()

    ipa = args.ipa.resolve()
    if not ipa.is_file():
        fail(f"missing IPA: {ipa}")

    raw = ipa.read_bytes()
    size = len(raw)
    sha256 = hashlib.sha256(raw).hexdigest()
    print(f"IPA:       {ipa}")
    print(f"Size:      {size} bytes ({size / 1048576:.2f} MiB)")
    print(f"SHA-256:   {sha256}")

    try:
        zf = zipfile.ZipFile(ipa)
        bad = zf.testzip()
        if bad:
            fail(f"ZIP member failed CRC: {bad}")
        names = zf.namelist()
    except zipfile.BadZipFile as exc:
        fail(f"not a valid ZIP: {exc}")
    ok("ZIP integrity")

    top = {n.split("/", 1)[0] for n in names if n and not n.startswith("__MACOSX")}
    if top != {"Payload"}:
        fail(f"unexpected top-level entries: {sorted(top)}")
    ok("archive has exactly one top-level Payload/ directory")

    apps = sorted(
        {
            n.split("/")[1]
            for n in names
            if n.startswith("Payload/") and n.count("/") >= 1 and n.split("/")[1].endswith(".app")
        }
    )
    if len(apps) != 1:
        fail(f"expected exactly one .app in Payload, found: {apps}")
    app_name = apps[0]
    prefix = f"Payload/{app_name}/"
    if f"{prefix}Info.plist" not in names:
        fail("missing Info.plist")
    ok(f"{prefix} found")

    info = plistlib.loads(zf.read(f"{prefix}Info.plist"))
    bundle_id = info.get("CFBundleIdentifier")
    executable = info.get("CFBundleExecutable")
    version = info.get("CFBundleShortVersionString")
    build_number = info.get("CFBundleVersion")
    minimum_os = info.get("MinimumOSVersion")
    supported = info.get("CFBundleSupportedPlatforms") or []
    dt_platform = info.get("DTPlatformName")
    package_type = info.get("CFBundlePackageType")

    print(f"Bundle ID: {bundle_id}")
    print(f"Executable: {executable}")
    print(f"Version:   {version} ({build_number})")
    print(f"MinimumOS: {minimum_os}")
    print(f"Platforms: {supported} / DTPlatformName={dt_platform}")
    print(f"PackageType: {package_type}")

    if bundle_id != args.expected_bundle_id:
        fail(f"unexpected bundle id: {bundle_id}")
    if supported != [args.expected_platform]:
        fail(f"unexpected CFBundleSupportedPlatforms: {supported}")
    if str(dt_platform).lower() != args.expected_platform.lower():
        fail(f"unexpected DTPlatformName: {dt_platform}")
    if package_type and package_type != "APPL":
        fail(f"unexpected CFBundlePackageType: {package_type}")
    if not executable:
        fail("missing CFBundleExecutable")
    ok("bundle id / platform / package metadata")

    exe_path = f"{prefix}{executable}"
    if exe_path not in names:
        fail(f"missing executable: {exe_path}")
    main_macho = parse_macho(zf.read(exe_path), executable)
    print(
        "Mach-O:    "
        f"{main_macho['arch']}, LC_BUILD_VERSION platform={main_macho['platform']} "
        f"(minos={main_macho['minos']}, sdk={main_macho['sdk']})"
    )
    if main_macho["platform"] != "IOS":
        fail(f"main executable platform is {main_macho['platform']}, not IOS")
    if main_macho["minos"] != str(minimum_os):
        fail(
            f"main executable minos {main_macho['minos']} does not match "
            f"Info.plist MinimumOSVersion {minimum_os}"
        )
    ok("main executable is device arm64 Mach-O (not Simulator)")

    if any(n == f"{prefix}_CodeSignature" or n.startswith(f"{prefix}_CodeSignature/") for n in names):
        fail("_CodeSignature exists (app is signed)")
    if f"{prefix}embedded.mobileprovision" in names:
        fail("embedded.mobileprovision exists (app is signed)")
    ok("no code signature / provisioning profile")

    for rel in ("Info.plist", "main.jsbundle", "Assets.car", "PkgInfo"):
        if f"{prefix}{rel}" not in names:
            fail(f"missing resource: {rel}")
    js = zf.read(f"{prefix}main.jsbundle")
    if len(js) < 100_000:
        fail(f"main.jsbundle is suspiciously small ({len(js)} bytes)")
    if not js.startswith(HERMES_MAGIC):
        fail(
            "main.jsbundle is not Hermes bytecode "
            f"(first bytes: {js[:8].hex()}); Release must embed Hermes"
        )
    ok(f"Info.plist, main.jsbundle (Hermes, {len(js)} bytes), Assets.car, PkgInfo")

    frameworks: set[str] = set()
    macho_paths = [exe_path]
    for n in names:
        if not n.startswith(f"{prefix}Frameworks/") or n.endswith("/"):
            continue
        parts = n.split("/")
        if len(parts) > 3 and parts[3]:
            frameworks.add(parts[3])
        with zf.open(n) as handle:
            head = handle.read(4)
        if head in (b"\xcf\xfa\xed\xfe", b"\xca\xfe\xba\xbe"):
            macho_paths.append(n)

    for path in macho_paths[1:]:
        macho = parse_macho(zf.read(path), path)
        if macho["platform"] != "IOS":
            fail(f"{path}: platform is {macho['platform']}, not IOS")
    ok(f"all {len(macho_paths)} Mach-O binaries are device arm64")

    runtime_version = None
    if f"{prefix}Expo.plist" in names:
        expo_plist = plistlib.loads(zf.read(f"{prefix}Expo.plist"))
        runtime_version = expo_plist.get("EXUpdatesRuntimeVersion")
    fingerprint_path = f"{prefix}EXUpdates.bundle/fingerprint"
    if fingerprint_path in names:
        runtime_version = zf.read(fingerprint_path).decode("utf-8", "replace").strip() or runtime_version

    result = {
        "platform": "ios",
        "ipa": ipa.name,
        "size_bytes": size,
        "sha256": sha256,
        "app_bundle": app_name,
        "bundle_identifier": bundle_id,
        "executable": executable,
        "version": version,
        "build_number": build_number,
        "minimum_os": str(minimum_os),
        "supported_platforms": supported,
        "dt_platform_name": dt_platform,
        "package_type": package_type,
        "architectures": ["arm64"],
        "mach_o_platform": main_macho["platform"],
        "mach_o_minos": main_macho["minos"],
        "mach_o_sdk": main_macho["sdk"],
        "mach_o_binaries": len(macho_paths),
        "frameworks": sorted(frameworks),
        "framework_count": len(frameworks),
        "main_js_bundle_bytes": len(js),
        "hermes_bytecode": True,
        "runtime_version": runtime_version,
        "unsigned": True,
        "checked_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "verifier": "apps/mobile/scripts/verify-ipa.py",
    }

    if args.json_out:
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        args.json_out.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"JSON:      {args.json_out}")

    print(f"Frameworks: {len(frameworks)} bundles")
    print(f"Runtime:    {runtime_version or '<not embedded>'}")
    print("\nALL CHECKS PASSED")
    print(f"RESULT_SHA256={sha256}")
    print(f"RESULT_SIZE={size}")


if __name__ == "__main__":
    main()
