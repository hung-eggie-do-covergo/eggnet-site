#!/usr/bin/env bash
# Build the site and deploy it to the caddy box (eggnet.dev).
set -euo pipefail
cd "$(dirname "$0")"
echo "==> building"
npm run build
echo "==> deploying to caddy:/srv/eggnet-site"
# COPYFILE_DISABLE avoids macOS ._* AppleDouble junk in the tar
COPYFILE_DISABLE=1 tar czf - -C dist . | tailscale ssh root@caddy '
  rm -rf /srv/eggnet-site && mkdir -p /srv/eggnet-site &&
  tar xzf - -C /srv/eggnet-site &&
  chown -R caddy:caddy /srv/eggnet-site 2>/dev/null || true
  chmod -R a+rX /srv/eggnet-site'
echo "==> done: https://eggnet.dev"
