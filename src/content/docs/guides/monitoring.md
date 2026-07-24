---
title: Monitoring
description: Know a service broke before a family member does — uptime, metrics, logs, and the checks that catch silent failures.
---

On a single box serving a household, the failure mode you dread is a *silent* one — something's been broken for a day and you find out when someone can't watch a movie. A little monitoring turns that into a notification.

Three complementary layers, all lightweight:

## 1. Uptime & health — is it up?

Run an uptime monitor ([Uptime Kuma] is the household favourite) that checks each service and alerts (push, email, chat) when one goes down.

Two kinds of check, and you want **both**:

- **HTTP checks** — "does the web app answer 200?" Good for the app itself.
- **Docker/container checks** — "is the container running and *healthy*?" via the Docker API.

:::caution[HTTP 200 does not mean healthy]
This is the trap. A web app can return `200` while a *dependency* it needs is dead — the classic case is a VPN sidecar (media downloaders route through it): the app's UI stays up and green while the tunnel is down and nothing actually works. An HTTP check never notices. A **container health check** on the sidecar does. Add health checks to the things whose failure is invisible from the front door.
:::

Give the uptime monitor **read-only** access to the Docker API through a **socket proxy** — never mount the raw Docker socket into it:

```yaml
# read-only docker-socket-proxy; the monitor points at tcp://docker-socket-proxy:2375
docker-socket-proxy:
  image: tecnativa/docker-socket-proxy
  environment:
    CONTAINERS: 1     # allow listing/inspecting
    POST: 0           # deny everything that mutates
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock:ro
```

A container monitor only reflects health if the container **defines a health check** — so add `HEALTHCHECK`s to the critical backends (databases, the VPN sidecar) rather than settling for "running."

## 2. Metrics — how is it doing?

Run a lightweight metrics agent ([Beszel] is tiny and pleasant) for CPU, RAM, disk, and network trends per host and container. This is how you catch the *slow* problems — a disk filling, a memory leak, a runaway container — before they become outages. (Full [Prometheus] + [Grafana] is available if you want dashboards to build; it's overkill for one box.)

## 3. Logs — why did it break?

Run a log viewer ([Dozzle] streams container logs in a browser) so that when something *is* down, you can see why without SSHing in and hunting. It reads the same Docker API — put it behind the socket proxy too.

## What to actually watch

Prioritise the **silent** failures over the obvious ones:

- The **VPN sidecar** and anything routed through it (the #1 blind spot).
- **Databases** and search/cache backends — no web UI, app dies without them.
- **Headless-browser** sidecars (scraping/PDF) — app stays 200, feature silently breaks.
- **Backup jobs** — a backup that quietly stopped running is worse than none.
- **Certificate renewal** — split-horizon DNS can break ACME quietly (see [Networking](/guides/networking/)); catch it before certs expire, not after.

The web apps you already reach every day will announce their own failures. Spend your monitoring effort on the plumbing nobody looks at until it's too late.

---

That's the tour. Boring tools, wired carefully, watched quietly — a private cloud for a household that mostly just works, and tells you when it doesn't. Go build one.
