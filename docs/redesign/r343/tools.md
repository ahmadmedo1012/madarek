# R343 tools log (setup ≤20 min, honest)
- **gstack**: cloned to ~/.claude/skills/gstack, `./setup` ran OK (claude tier install). Claude CLI absent on this box → its plan/eng-review/design-review/QA/ship role prompts are used as *reading guidance* for orchestrator + reviewer prompts. No faked invocation.
- **ruflo**: unavailable: requires the claude CLI (`claude mcp add …`); no runtime here. Native Task-tool sub-agents (hierarchical, 6-8 concurrent) substitute.
- **ponytail / impeccable / ui-ux-pro-max / frontend-design / web-design-guidelines / expo-skills / react-native-skills**: unavailable: not present in this runtime's skill registry. Substitutes: the VLM vision reviewer (z-ai-web-dev-sdk) for visual review; expo CLI via npx for Phase F; task files carry the standards.
- **knip / jscpd / dependency-cruiser / stylelint / lightningcss / ast-grep / ts-morph**: via npx on demand; verify each first use (`npx -y stylelint@16 --version`).
- **Playwright 1.60**: chromium_headless_shell-1223 + chromium-1223 present at /home/z/.cache/ms-playwright (PLAYWRIGHT_BROWSERS_PATH exported in env file). ✓
- **Vision model**: GLM vision via VLM skill (backend z-ai-web-dev-sdk) — every visual review (Phases C/E/F) uses it.
- **Expo/EAS**: EXPO_TOKEN + project id in env; EAS build quota dead until ≈Dec 1 → Phase F is OTA-only (`eas update --branch production`).
- **gh CLI**: absent; GitHub API via curl + GITHUB_TOKEN; pushes via `madarek_push` (http.extraHeader Basic x-access-token).
- **Cron/scheduling**: not needed.
