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

function __gm_prompt_prefix
    if not test -f $GM_CACHE
        return
    end
    set -l status (cat $GM_CACHE 2>/dev/null)
    if test -z "$status"
        return
    end

    # Check if there are any updates available
    if string match -q '*"status":"update_available"*' -- $status
        printf '⬆️ '
    else
        printf '🤖 '
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

function __gm_update_candidates --description 'gm packages with updates'
    if not test -x $GM_BIN
        return
    end
    __gm_env $GM_BIN prompt complete update 2>/dev/null
end

complete -c gm -n '__fish_use_subcommand' -a 'check doctor packages prompt render status update version help'
complete -c gm -n '__fish_seen_subcommand_from update' -a '(__gm_update_candidates)'
complete -c gm-update -a '(__gm_update_candidates)'

function __gm_prompt_notice --on-event fish_prompt
    set -l msg (__gm_tick_quiet | string collect)
    if test -n "$msg"
        printf '%s\n' "$msg"
    end
end

# Save original fish_prompt if it exists
if not functions -q __fish_prompt_gm_original
    if functions -q fish_prompt
        functions -c fish_prompt __fish_prompt_gm_original
    end
end

function fish_prompt --description 'gm-enhanced prompt'
    # Show gm status emoji
    __gm_prompt_prefix

    # Call the original prompt function if it exists
    if functions -q __fish_prompt_gm_original
        __fish_prompt_gm_original
    else
        # Default minimal prompt
        set -l last_status $status
        printf '%s%s@%s %s%s%s> ' (set_color bryellow) (whoami) (prompt_hostname) (set_color brblue) (prompt_pwd) (set_color normal)
    end
end

set -l _gm_initial (__gm_tick_quiet --force 2>/dev/null | string collect)
if test -n "$_gm_initial"
    printf '%s\n' "$_gm_initial"
end
set -gx GM_PROMPT_LOADED 1
