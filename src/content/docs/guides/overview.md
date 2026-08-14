---
title: What is eggnet?
description: A tour of a self-hosted homelab — one all-flash box, or a compute node plus a storage node — and everything it serves.
---

eggnet is a **home server** — a mini PC (or a mini PC paired with a dedicated storage node) that runs the services a household actually uses, on hardware you own, with your data staying home.

It replaces a pile of subscriptions and cloud accounts with self-hosted equivalents, all reachable at clean `https://` addresses, all behind a single login, all backed up on a schedule.

## The one-paragraph version

A fanless mini PC runs **Proxmox** (a hypervisor) on a **mirrored ZFS** pool — all on one all-flash box, or split across a lean compute node and a dedicated storage node ([the two shapes](/guides/hardware/)). Services live in lightweight **containers**. A **reverse proxy** gives each one a real HTTPS name; a self-hosted **DNS server** resolves those names locally and blocks ads network-wide. A self-hosted **identity provider** puts every app behind one sign-on. Everything is private by default over a **mesh VPN**, with a few things exposed publicly through a **tunnel** — no ports forwarded, no home IP leaked. Secrets live in a **secrets manager**, not scattered in config files. Backups run to a separate drive, with an offsite copy.

## What it serves

| Category | What you get |
| --- | --- |
| **Media** | Stream a movie/TV library to any device; hardware-transcoded. |
| **Photos** | Phone auto-backup, timeline, sharing — a private Google Photos. |
| **Documents** | Scan-to-searchable archive with OCR; full-text search. |
| **Knowledge** | Bookmarks with archiving, notes, a résumé builder. |
| **Home** | Budgeting, home-automation bridge, file shares. |
| **Infra** | DNS + ad-blocking, reverse proxy, identity/SSO, secrets, monitoring, backups. |

## One box, or two?

You do **not** need a rack, a NAS, and three Raspberry Pis to run a serious homelab. A modern mini PC with multiple NVMe slots has more than enough CPU, RAM, and fast storage for a household's worth of services — while drawing a few watts, making no noise, and fitting on a shelf. That's the simplest shape, and often all you need.

Grow past a few TB, or want to stop compute and storage sharing one CPU, and the second shape is a **lean compute node beside a dedicated storage node** — cheap redundant bulk on HDDs, a strong CPU/GPU next to the media it serves, and the freedom to reboot one without downing the other. The [hardware guide](/guides/hardware/) lays both out side by side so you can pick.

Either way, the tradeoff to design around is **blast radius**: on one box, when it's down everything's down; splitting into two shrinks that but adds a network path and a second machine to keep alive. Most of these guides are about keeping whichever shape you pick reboot-tolerant and its data recoverable.

## How to read these guides

They're ordered roughly in build order, but each stands alone:

1. **[The philosophy](/guides/philosophy/)** — the handful of rules that keep a lab sane.
2. **[Hardware & Proxmox base](/guides/hardware/)** — one box or two, ZFS, the hypervisor.
3. **[LXC vs Docker](/guides/services/)** — where each service should actually run.
4. **[Networking](/guides/networking/)** — reverse proxy, split-horizon DNS, VPN, tunnel.
5. **[Single sign-on](/guides/auth/)** — one identity provider in front of everything.
6. **[Secrets](/guides/secrets/)** — get credentials out of your config files.
7. **[Storage & backups](/guides/backups/)** — the part people skip until it's too late.
8. **[Monitoring](/guides/monitoring/)** — know it broke before a family member tells you.

Nothing here is exotic. It's boring, well-worn tools wired together carefully — which is exactly what you want running your family's photos.
