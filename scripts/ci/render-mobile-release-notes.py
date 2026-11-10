#!/usr/bin/env python3
"""Render the rolling GitHub Release notes for a verified mobile artifact.

Reads build-info.json produced by the iOS or Android verify job and writes
Markdown to stdout. Kept in one place so both release trains have the same
structure, evidence, and install instructions.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def human_size(value) -> str:
    try:
        size = int(value)
    except (TypeError, ValueError):
        return "unknown"
    if size >= 1024 * 1024:
        return f"{size:,} bytes ({size / 1048576:.2f} MiB)"
    if size >= 1024:
        return f"{size:,} bytes ({size / 1024:.1f} KiB)"
    return f"{size:,} bytes"


def value(info: dict, key: str, default: str = "—") -> str:
    item = info.get(key)
    if item is None or item == "":
        return default
    if isinstance(item, list):
        return ", ".join(str(x) for x in item)
    if isinstance(item, bool):
        return "yes" if item else "no"
    return str(item)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--platform", choices=["ios", "android"], required=True)
    parser.add_argument("--build-info", type=Path, required=True)
    parser.add_argument("--repo", required=True)
    parser.add_argument("--tag", required=True)
    parser.add_argument("--run-url", required=True)
    args = parser.parse_args()

    info = json.loads(args.build_info.read_text(encoding="utf-8"))
    base = f"https://github.com/{args.repo}/releases/download/{args.tag}"
    commit = value(info, "commit")
    short = commit[:7] if commit != "—" else "unknown"
    commit_link = f"https://github.com/{args.repo}/commit/{commit}" if commit != "—" else "—"

    if args.platform == "ios":
        ipa = value(info, "ipa", "Madarek.ipa")
        print(f"# مدارك — iOS unsigned build ({short})\n")
        print(
            "**Stable download:** "
            f"[{ipa}]({base}/{ipa})  \n"
            f"**Checksums:** [SHA256SUMS.txt]({base}/SHA256SUMS.txt)  \n"
            f"**Build metadata:** [build-info.json]({base}/build-info.json)  \n"
            f"**Workflow run:** {args.run_url}\n"
        )
        print("This IPA is **unsigned** and built for a real iPhone (`iphoneos`, arm64); "
              "it is not a Simulator build. SideStore re-signs it on-device with a free Apple ID. "
              "No paid Apple Developer account is required.\n")
        print("| Field | Value |")
        print("|---|---|")
        print(f"| Version | `{value(info, 'version')}` (`{value(info, 'build_number')}`) |")
        print(f"| Bundle ID | `{value(info, 'bundle_identifier')}` |")
        print(f"| Minimum iOS | `{value(info, 'minimum_os')}` |")
        print(f"| Architectures | `{value(info, 'architectures')}` |")
        print(f"| Runtime version | `{value(info, 'runtime_version')}` |")
        print(f"| OTA channel | `{value(info, 'updates_channel')}` |")
        print(f"| Size | {human_size(info.get('size_bytes'))} |")
        print(f"| SHA-256 | `{value(info, 'sha256')}` |")
        print(f"| Mach-O binaries | {value(info, 'mach_o_binaries')} (app + frameworks) |")
        print(f"| Frameworks | {value(info, 'framework_count')} |")
        print(f"| Xcode / SDK | `{value(info, 'xcode')}` / `{value(info, 'ios_sdk')}` |")
        print(f"| Verified | {value(info, 'verified')} at `{value(info, 'verified_at')}` |")
        print(f"| Commit | [{short}]({commit_link}) |\n")
        print("## Install with SideStore\n")
        print("1. Download the IPA on the iPhone (or AirDrop/Files it to the device).")
        print("2. Open SideStore → **My Apps** → **+** → choose the IPA.")
        print("3. Sign in with the free Apple ID SideStore already uses, then sign/install.")
        print("4. If iOS asks, trust the developer certificate under Settings → General → VPN & Device Management.")
        print("5. Refresh the app before the 7-day free-signing window expires.\n")
        print("> The same IPA is also attached to the latest workflow run artifact (verified, 30-day retention).")
    else:
        apk = value(info, "apk", "Madarek.apk")
        aab = value(info, "aab", "Madarek.aab")
        signing_mode = value(info, "signing_mode")
        print(f"# مدارك — Android release build ({short})\n")
        print(
            f"**Installable APK:** [{apk}]({base}/{apk})  \n"
            f"**Play upload AAB:** [{aab}]({base}/{aab})  \n"
            f"**Checksums:** [SHA256SUMS.txt]({base}/SHA256SUMS.txt)  \n"
            f"**Build metadata:** [build-info.json]({base}/build-info.json)  \n"
            f"**Workflow run:** {args.run_url}\n"
        )
        if signing_mode == "release":
            print("This build is **release-signed**; it can be installed directly and updated "
                  "with later builds from this workflow. The AAB is for a Play Console upload.\n")
        else:
            print("> **Internal build — debug-signed.** This APK installs on real devices, but it is "
                  "signed with Expo's template debug keystore, so do **not** publish it to Google Play. "
                  "Add the `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, "
                  "and `ANDROID_KEY_PASSWORD` repository secrets to produce a release-signed APK/AAB.\n")
        print("| Field | Value |")
        print("|---|---|")
        print(f"| Version | `{value(info, 'version')}` (code `{value(info, 'version_code')}`) |")
        print(f"| Package | `{value(info, 'package')}` |")
        print(f"| Min / target SDK | `{value(info, 'min_sdk')}` / `{value(info, 'target_sdk')}` |")
        print(f"| Architectures | `{value(info, 'architectures')}` |")
        print(f"| Signing | `{signing_mode}` |")
        print(f"| Certificate SHA-256 | `{value(info, 'certificate_sha256')}` |")
        print(f"| OTA channel | `{value(info, 'updates_channel')}` |")
        print(f"| APK size | {human_size(info.get('size_bytes'))} |")
        print(f"| APK SHA-256 | `{value(info, 'sha256')}` |")
        print(f"| AAB size | {human_size(info.get('aab_size_bytes'))} |")
        print(f"| AAB SHA-256 | `{value(info, 'aab_sha256')}` |")
        print(f"| JDK / SDK / build-tools | `{value(info, 'jdk')}` / `{value(info, 'android_sdk')}` / `{value(info, 'build_tools')}` |")
        print(f"| Verified | {value(info, 'verified')} at `{value(info, 'verified_at')}` |")
        print(f"| Commit | [{short}]({commit_link}) |\n")
        print("## Install the APK\n")
        print("1. Download the APK on the Android device.")
        print("2. Allow **Install unknown apps** for the browser/Files app when prompted.")
        print("3. Open the APK and install. If an older build with a different signature is installed, uninstall it first.")
        print("4. The AAB is **not** directly installable on a phone; upload it to Google Play or use `bundletool`.\n")
        if signing_mode != "release":
            print("> Configure release signing secrets before treating this as a production artifact. "
                  "The workflow will switch to release signing automatically.")

    print(f"\n---\nBuilt from `{commit}` by GitHub Actions on `{value(info, 'runner', 'GitHub-hosted runner')}`. "
          f"Verified by `{value(info, 'verifier', 'the repository verifier')}` in a separate job.")


if __name__ == "__main__":
    try:
        main()
    except BrokenPipeError:
        sys.exit(0)
