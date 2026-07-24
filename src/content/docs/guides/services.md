---
title: 'LXC vs Docker: where things run'
description: A decision rule for running a service as its own container versus consolidating it into a Docker host.
---

The recurring question on a single box: does this new service get its **own LXC**, or does it become another **Docker container** in a shared "docker host" LXC?

Getting this wrong in either direction hurts — a VM per service wastes resources and multiplies maintenance; cramming *everything* into one Docker host means one bad `compose up` takes out your whole lab.

## The rule

**Default to Docker.** Keep a service as its own LXC only if one of these pillars applies (checked top-down, first match wins):

1. **Availability / blast-radius** — you need it alive *while the Docker host is down*, or it must not die with its siblings. This is the infra plane: **DNS, reverse proxy, identity provider, management tooling, the backup target.** *What you need to fix a broken host can't live on that host.*
2. **Security boundary** — a compromise is catastrophic, or it holds crown-jewel secrets: a **password vault, the identity provider, an auth gateway.** Isolate it regardless of anything else.
3. **Stateful disaster recovery** — heavy, precious running state you want foolproof point-in-time `vzdump` restore + live migration for (a large **photo service**, a **media server's** metadata).

Everything else → a Docker container in the shared host, grouped by concern (an `arr` stack, a `monitoring` stack), never one mega-compose.

## What is *not* a reason

These feel like reasons and aren't:

- **"Public-facing"** — nearly everything is public-facing; that's what the reverse proxy and auth are for. It's not a placement axis.
- **"Hardware passthrough"** — an iGPU (`/dev/dri`) passes into a Docker-host LXC and is shareable across containers just as it is across LXCs. Hardware doesn't force a service to be its own LXC.
- **"Independent restart"** — Docker already recreates one container without touching its siblings.
- **"Resource limits / overhead"** — the per-LXC overhead is marginal, and you can cap Docker containers too.

Strip those away and the real pillars are just: *availability, security boundary, stateful DR.*

## The socket question

The usual objection to a shared Docker host is the Docker socket — a container escape there is bad. The fix isn't "one LXC per app," it's to **scope socket access at the source**: put a read-only **`docker-socket-proxy`** in front of anything that needs the API (your fleet manager, your monitoring), and never mount the raw socket into an app container. Then lightweight apps co-locate fine.

## Consolidating cleanly

When you do move a service into the Docker host:

- **App image/runtime** → the host's root disk (it's cheap and grows easily).
- **Persistent data** → its *own* dataset, bind-mounted in — so it's independently snapshot-able and movable, not buried in a shared volume.

```yaml
# each app gets a dedicated data mount, not a shared blob
services:
  myapp:
    image: example/myapp:1.2.3   # pin real versions; ':latest' bites
    volumes:
      - /srv/myapp:/data
    restart: unless-stopped
```

:::caution[Pin your tags]
`:latest` will one day pull a major version with a breaking migration and take the app down at the worst moment. Pin to a known-good version and bump deliberately.
:::

## Pre-flight before every migration

Before moving a service into the Docker host, **check headroom**: free RAM and free disk on that host. A browser-based app (headless Chrome) can spike RAM hard; a fat image can fill a small root disk. Expand *first*. Starving the shared host mid-migration is how you turn a 10-minute job into a load-100 meltdown.

Next: [giving every service a real HTTPS name →](/guides/networking/)
