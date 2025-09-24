# gm prompt helper for fish. Source via `gm prompt init fish | source`.

if set -q GM_PROMPT_LOADED
    return
end

set -l script_path (status -f)
set -l script_dir (command dirname $script_path)
set -l share_dir (command dirname $script_dir)
set -l root_dir (command dirname $share_dir)

if not set -q GM_ROOT
    set -gx GM_ROOT $root_dir
end
if not set -q GM_CACHE
    set -gx GM_CACHE "$HOME/.cache/gm/status.json"
end
if not set -q GM_TTL_SECONDS
    set -gx GM_TTL_SECONDS 21600
end
if not set -q GM_CONFIG
    set -gx GM_CONFIG ""
end
if not set -q GM_BIN
    set -gx GM_BIN "$GM_ROOT/bin/gm"
end

function __gm_env
    env GM_CACHE="$GM_CACHE" GM_CONFIG="$GM_CONFIG" GM_TTL_SECONDS="$GM_TTL_SECONDS" $argv
end

function __gm_tick_quiet
    if not test -x $GM_BIN
        return
    end
    if test (count $argv) -gt 0 -a "$argv[1]" = "--force"
        __gm_env $GM_BIN prompt tick --quiet --force
    else
        __gm_env $GM_BIN prompt tick --quiet
    end
end

function gm_refresh_status --description 'Refresh gm status cache'
    if not test -x $GM_BIN
        echo 'gm: executable missing. Check GM_ROOT.'
        return 1
    end
    if test (count $argv) -gt 0 -a "$argv[1]" = "--force"
        __gm_env $GM_BIN prompt tick --force
    else
        __gm_env $GM_BIN prompt tick
    end
end

function gm-update --description 'Update tracked AI npm tooling'
    __gm_env $GM_BIN update
end

function gm-refresh --description 'Force refresh of gm status cache'
    gm_refresh_status --force
end

function __gm_prompt_notice --on-event fish_prompt
    set -l msg (__gm_tick_quiet | string collect)
    if test -n "$msg"
        printf '%s\n' "$msg"
    end
end

__gm_tick_quiet --force >/dev/null 2>&1
set -gx GM_PROMPT_LOADED 1
