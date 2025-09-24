# shellcheck shell=bash
# gm prompt helper for bash/zsh. Source via eval "$(gm prompt init bash)" or "$(gm prompt init zsh)".

if [ -n "${GM_PROMPT_LOADED:-}" ]; then
  return 0
fi

_gm_detect_source() {
  if [ -n "${BASH_SOURCE[0]:-}" ]; then
    printf '%s\n' "${BASH_SOURCE[0]}"
  elif [ -n "${ZSH_VERSION:-}" ]; then
    printf '%s\n' "${(%):-%N}"
  else
    printf '%s\n' "$0"
  fi
}

_gm_source_file="$(_gm_detect_source)"
GM_ROOT="${GM_ROOT:-$(cd "$(dirname "$_gm_source_file")/../.." 2>/dev/null && pwd)}"
GM_CACHE="${GM_CACHE:-$HOME/.cache/gm/status.json}"
GM_TTL_SECONDS="${GM_TTL_SECONDS:-21600}"
GM_CONFIG="${GM_CONFIG:-}"
GM_BIN="${GM_BIN:-$GM_ROOT/bin/gm}"

_gm_tick_quiet() {
  if [ ! -x "$GM_BIN" ]; then
    return
  fi
  if [ "$1" = "--force" ]; then
    GM_CACHE="$GM_CACHE" GM_CONFIG="$GM_CONFIG" GM_TTL_SECONDS="$GM_TTL_SECONDS" "$GM_BIN" prompt tick --quiet --force
  else
    GM_CACHE="$GM_CACHE" GM_CONFIG="$GM_CONFIG" GM_TTL_SECONDS="$GM_TTL_SECONDS" "$GM_BIN" prompt tick --quiet
  fi
}

_gm_precmd() {
  local _gm_message
  _gm_message="$(_gm_tick_quiet)"
  if [ -n "$_gm_message" ]; then
    printf '%s\n' "$_gm_message"
  fi
}

_gm_install_prompt_hook() {
  if [ -n "${ZSH_VERSION:-}" ]; then
    if command -v add-zsh-hook >/dev/null 2>&1; then
      add-zsh-hook precmd _gm_precmd
    else
      if ! typeset -p precmd_functions >/dev/null 2>&1; then
        typeset -ga precmd_functions
      fi
      if [[ ! " ${precmd_functions[@]} " =~ " _gm_precmd " ]]; then
        precmd_functions+=( _gm_precmd )
      fi
    fi
  elif [ -n "${BASH_VERSION:-}" ]; then
    case ";${PROMPT_COMMAND:-};" in
      *"_gm_precmd"*) ;;
      *)
        if [ -n "${PROMPT_COMMAND:-}" ]; then
          PROMPT_COMMAND="_gm_precmd;${PROMPT_COMMAND}"
        else
          PROMPT_COMMAND="_gm_precmd"
        fi
        export PROMPT_COMMAND
        ;;
    esac
  fi
}

gm_refresh_status() {
  if [ ! -x "$GM_BIN" ]; then
    printf '%s\n' 'gm: executable missing. Check GM_ROOT.'
    return 1
  fi
  if [ "$1" = "--force" ]; then
    GM_CACHE="$GM_CACHE" GM_CONFIG="$GM_CONFIG" GM_TTL_SECONDS="$GM_TTL_SECONDS" "$GM_BIN" prompt tick --force
  else
    GM_CACHE="$GM_CACHE" GM_CONFIG="$GM_CONFIG" GM_TTL_SECONDS="$GM_TTL_SECONDS" "$GM_BIN" prompt tick
  fi
}

alias gm-update='GM_CACHE="$GM_CACHE" GM_CONFIG="$GM_CONFIG" GM_TTL_SECONDS="$GM_TTL_SECONDS" "$GM_BIN" update'
alias gm-refresh='gm_refresh_status --force'

_gm_install_prompt_hook

# Initial refresh so first prompt reflects current status
_gm_tick_quiet --force >/dev/null 2>&1

GM_PROMPT_LOADED=1
