# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`gm` (Good Morning) is a CLI tool that monitors AI-related npm global packages and surfaces update notifications in your shell prompt. It tracks packages like `ccusage`, `@openai/codex`, and `@anthropic-ai/claude-code`, and provides a TUI for monitoring AI usage.

## Core Commands

### Development & Testing
```bash
# Install globally for development (re-run after making changes)
npm install -g .

# Manual cache regeneration
npm run check

# Generate prompt message from cached status
npm run render
```

### Testing the CLI
```bash
# Main status command
gm status --refresh

# AI usage TUI
gm usage --interval 60 --since 20251002

# Package management
gm packages add <name>
gm packages remove <name>

# Diagnostics
gm doctor
```

## Architecture

### Entry Point & Command Routing
- **`bin/gm`**: Main CLI entry point. Parses commands and routes to appropriate handlers. Core commands: `status`, `update`, `packages`, `usage`, `doctor`, `prompt`.

### Core Modules (lib/)
- **`lib/config.js`**: Package list management. Loads from `~/.config/gm/packages.json` (or `GM_CONFIG`), with fallback to `config/packages.json`. Handles add/remove operations with automatic deduplication.
- **`lib/status.js`**: Status file parsing and summarization. Reads cached JSON and categorizes packages into `updates`, `errors`, and `missing`.
- **`lib/claude.js`**: Special handling for the standalone `claude` binary. Probes via `which claude` and `claude --version`, allowing gm to treat it as the authoritative install for `@anthropic-ai/claude-code`.
- **`lib/doctor.js`**: Environment diagnostics (Node.js, npm, cache/config paths).
- **`lib/usage-watch.js`**: TUI implementation using `blessed` library for monitoring AI usage from `ccusage` and `ccusage-codex`.

### Background Scripts (scripts/)
- **`scripts/check-updates.js`**: Queries npm for installed versions (`npm ls -g`) and latest versions (`npm view`), then writes `~/.cache/gm/status.json` with update status for each tracked package.
- **`scripts/render-message.js`**: Reads the cached status and emits succinct prompt messages (e.g., `[gm] updates available: ccusage 1.4.0 → 1.5.0`).

### Prompt Integration (share/gm/)
- **`share/gm/prompt.sh`**: Bash/Zsh prompt hook that calls `gm prompt tick` on each prompt display. Respects TTL (default 6 hours) and only refreshes when cache is stale.
- **`share/gm/prompt.fish`**: Fish shell equivalent.

## Key Architectural Patterns

### Dual Claude Detection
When `@anthropic-ai/claude-code` is tracked, gm checks **both** npm globals and the standalone `claude` binary. If the binary exists, it's treated as the canonical install and updated via `claude update` instead of `npm install -g`.

### Caching & TTL
- Cache location: `~/.cache/gm/status.json` (override via `GM_CACHE`)
- Default TTL: 21600 seconds (6 hours, configurable via `GM_TTL_SECONDS`)
- The `ensureStatus()` function in `bin/gm` checks cache age before running `check-updates.js`

### Package Resolution Cascade
Config loading tries paths in order:
1. `$GM_CONFIG` (if set)
2. `~/.config/gm/packages.json`
3. `config/packages.json` (bundled fallback)

### Status JSON Structure
```javascript
{
  "generatedAt": "2025-10-10T12:00:00.000Z",
  "packages": [
    {
      "name": "ccusage",
      "installed": "1.4.0",
      "latest": "1.5.0",
      "status": "update_available",  // or "up_to_date", "not_installed", "error"
      "error": null,
      "via": null,  // or "claude-cli" for @anthropic-ai/claude-code
      "updateCommand": null
    }
  ],
  "summary": {
    "total": 3,
    "updatesAvailable": 1,
    "notInstalled": 0,
    "errors": 0
  }
}
```

## AI Usage TUI (`gm usage`)

The TUI (lib/usage-watch.js) merges and interlaces daily usage data from both `ccusage` and `ccusage-codex` by spawning each command with date filters, parsing their output, and rendering a combined table using `blessed`. Features:
- Auto-refresh at configurable intervals
- Color-coded by source (cyan for Claude, magenta for Codex)
- Keyboard navigation (q/ESC to quit, arrows/j/k to scroll)
- Options: `--interval <seconds>`, `--since <YYYYMMDD>`

## Environment Variables

- `GM_TTL_SECONDS`: Cache TTL in seconds (default: 21600)
- `GM_CACHE`: Path to status cache (default: `~/.cache/gm/status.json`)
- `GM_CONFIG`: Path to packages JSON (default: `~/.config/gm/packages.json`)
- `GM_BIN`: Override gm executable path used by prompt helper
- `GM_AUTO_REFRESH_ON_EDIT`: Set to `0` to skip auto-refresh after `gm packages add/remove`

## Testing Notes

- The project is intentionally dependency-free except for `blessed` (used only by `gm usage`)
- No test suite is included; test manually via `npm install -g .` + shell integration
- To test prompt integration without modifying your shell rc: evaluate `eval "$(gm prompt init zsh)"` in a throwaway shell
