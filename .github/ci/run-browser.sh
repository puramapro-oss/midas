#!/usr/bin/env bash
set -euo pipefail
test "$#" -eq 1
case "$1" in gain|all) ;; *) exit 2 ;; esac
test "$(id -u)" != 0
mode="$1"
browser_path="${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}"
sandbox_home=$(mktemp -d "$RUNNER_TEMP/midas-browser-XXXXXXXX")
trap 'rm -rf -- "$sandbox_home"' EXIT
node_path=$(command -v node)
node_bin=$(dirname "$node_path")
parent_net=$(readlink /proc/self/ns/net)
sudo -n -- /usr/bin/unshare --net -- /bin/sh -eu -c '
  test "$(readlink /proc/self/ns/net)" != "$1"
  /usr/sbin/ip link set dev lo up
  exec /usr/bin/setpriv --reuid "$2" --regid "$3" --clear-groups --bounding-set=-all \
    --inh-caps=-all --ambient-caps=-all --no-new-privs /usr/bin/env -i \
    PATH="$4:/usr/bin:/bin" HOME="$5" TMPDIR="$5" LANG=C.UTF-8 CI=true \
    PLAYWRIGHT_BROWSERS_PATH="$6" "$7" .github/ci/browser.mjs "$8" "$9" "${10}"
' midas "$parent_net" "$(id -u)" "$(id -g)" "$node_bin" "$sandbox_home" "$browser_path" \
  "$node_path" "$GITHUB_WORKSPACE/ci-tools" "$RUNNER_TEMP/midas-browser-fonts" "$mode"
