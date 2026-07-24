---
title: Secrets management
description: Get database passwords, API keys, and OIDC secrets out of plaintext config and into a managed store.
---

By the time you've wired up a dozen apps, secrets are everywhere: database passwords in compose files, API keys in `.env`, OIDC client secrets duplicated between each app and the IdP. A **secrets manager** gives you one encrypted source of truth, with versioning and rotation, and injects values at runtime instead of committing them to disk.

This lab uses [Infisical] (self-hostable, free tier covers the essentials). [Vaultwarden] covers *human* credentials; a secrets manager covers *machine* ones — different jobs.

:::note[Be honest about the payoff]
For a solo homelab this is a "level-up," not a must. The real wins are: no secrets in files you might share or commit, one place to rotate, and an audit trail. If that's not a pain you feel yet, `.env` files with tight permissions are a defensible starting point.
:::

## The shape

1. A **secrets manager** container holds all values, encrypted, organized per app.
2. A **machine identity** (client ID + secret) lets automation read them.
3. A small **render step** pulls each app's secrets and writes them to the file the app already reads (its `.env`), then the app is (re)created.
4. A **timer** re-renders periodically so rotations propagate; the last rendered file stays on disk as an **outage fallback**.

```
secrets manager  ──(machine identity)──▶  render script  ──▶  /opt/app/.env  ──▶  container
        ▲                                      ▲
        │ organized per-app folders            │ timer: re-render + keep last as fallback
```

## Injecting into compose

Keep the plaintext out of `compose.yaml` by referencing variables, and render the `.env` the compose interpolates from:

```yaml
services:
  app:
    environment:
      DB_PASSWORD: ${DB_PASSWORD}     # value comes from the rendered .env
      OIDC_CLIENT_SECRET: ${OIDC_CLIENT_SECRET}
```

```bash
# render step (per app), run by a systemd timer
infisical export --path=/app --format=dotenv > /opt/app/.env
docker compose up -d app   # only recreates if the resolved config changed
```

Now `compose.yaml` is clean enough to commit or hand to a fleet manager; the secret only lands in a root-readable, runtime-generated `.env`.

## Hard-won details

:::caution
- **Never bootstrap circular dependencies.** Don't make the secrets manager depend on the auth it might gate, and don't fetch the *reverse proxy's* secret *through* the reverse proxy — hit the manager by its direct IP so a proxy outage can't lock you out.
- **Keep a fallback file.** If the manager is unreachable at render time, keep the last-rendered `.env` so containers still start. A secrets outage should degrade to "no rotations," not "nothing boots."
- **Rendered `.env` is still on disk.** File-based injection means the value lands in a file at runtime (root-only). That's fine and normal — the win is a single source of truth + clean configs, not zero-plaintext-anywhere.
- **Timers re-chmod files.** If a fleet manager needs to *read* those files, make sure your render step writes them world-readable (not `600`) — or the manager silently shows blank configs. Watch for a periodic timer resetting perms back.
:::

## Where to start

Migrate the highest-leverage secrets first:

1. **OIDC client secrets** — you've duplicated these across every app and the IdP.
2. **The DNS/ACME API token** — a single, high-value credential sitting in your proxy config.
3. **Database passwords** and app signing keys.

Do it app-by-app, verify each still starts, and keep the old `.env` as a backup until you're sure.

Next: [the part people skip until it's too late →](/guides/backups/)

[Infisical]: https://infisical.com/
[Vaultwarden]: https://github.com/dani-garcia/vaultwarden
