# gm

gm keeps a lightweight eye on global AI tooling updates. Hook it into your prompt and you will see reminders whenever your tracked npm globals (by default `ccusage`, `@openai/codex`, and `@anthropic-ai/claude-code`) have newer versions available. When an update is detected, the next prompt prints a notice and provides shortcuts to upgrade everything in one go.

## Quick start

1. Clone or copy this repository somewhere permanent, e.g.: `~/gm`.
2. From the repository root, run `npm install -g .` to expose the `gm` command on your `PATH` (repeat this after pulling updates).
3. Add the initialization snippet to your shell start-up file:

   ```bash
   # ~/.zshrc (replace zsh with bash or fish as needed)
   eval "$(gm prompt init zsh)"
   ```

4. Open a new shell (or `source` your shell rc) and gm will print notices whenever tracked tools have updates.

### What you get

- A background check (default every 6 hours) that writes status to `~/.cache/gm/status.json`.
- Prompt notifications like `[gm] updates available: ccusage 1.4.0 → 1.5.0` whenever a newer version is published.
- Aliases defined by the prompt helper:
  - `gm-update` — runs `npm install -g` for every tracked package using the latest tag by default.
  - `gm-refresh` — forces an immediate status refresh (ignoring the cache TTL).

The scripts only rely on Node.js and work across macOS and Linux.

## Configuration knobs

Set any of these environment variables before evaluating the snippet from `gm prompt init`:

- `GM_TTL_SECONDS` — default `21600` (6 hours). Lower it if you want more frequent checks.
- `GM_CACHE` — path to the status cache (defaults to `~/.cache/gm/status.json`).
- `GM_CONFIG` — path to a packages JSON file if you want to track additional global npm tools.
- `GM_BIN` — override the gm executable used by the prompt helper (defaults to `"$GM_ROOT/bin/gm"`).

### Tracking more packages

Manage the list directly from the CLI:

```bash
gm packages add midjourney-cli
gm packages remove ccusage
gm packages          # prints the current list
```

gm stores the list at `~/.config/gm/packages.json` (override with `GM_CONFIG`). If you prefer editing by hand, create that file with a JSON array:

```json
[
  "ccusage",
  "@openai/codex",
  "@anthropic-ai/claude-code",
  "another-global-package"
]
```

gm automatically picks up changes the next time it refreshes the cache.

## How it works

- `scripts/check-updates.js` resolves the currently installed global versions (via `npm ls -g`) and the latest published versions (via `npm view`). Results are cached as JSON and reused until the TTL expires.
- `scripts/render-message.js` is invoked on each prompt to surface succinct notices when updates are pending. With `--verbose`, it can also list missing packages.
- `bin/gm` glues everything together, exposes `gm prompt init`, and powers the helper aliases.

Because the check script uses `npm view`, it requires network access the first time it runs after the TTL expires. Subsequent prompts stay fast and rely on the cached status file.

## Suggested companion tooling

A few optional additions can round out your AI development environment:

1. Install a Node version manager (`mise`, `asdf`, or `fnm`) so the `node` binary your shell uses is consistent across projects.
2. Enable `corepack` (`corepack enable`) to get modern package managers (`pnpm`, `yarn`, `bun`) without separate global installs.
3. Add `npm install -g npm-check-updates` for quick diffing of global & local package versions.
4. Consider installing [`copier`](https://github.com/copier-org/copier) or [`cookiecutter`](https://github.com/cookiecutter/cookiecutter) templates for bootstrapping AI projects, plus `just` or `task` for reproducible workflows.
5. If you work with multiple AI CLIs, a credentials helper like [`direnv`](https://direnv.net/) keeps API keys scoped per project.

These extras are optional; the prompt hook runs fine with nothing more than Node.js and npm available.

## Repository housekeeping

- The project is intentionally dependency-free; `npm install -g .` (or `npm link`) is enough to expose the `gm` command.
- `.gitignore` ignores `node_modules/`, though none are needed by default.
- Use `npm run check` to manually regenerate the cache from the repo root.

Happy shipping!
