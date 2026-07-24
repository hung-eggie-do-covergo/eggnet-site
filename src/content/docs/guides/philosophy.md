---
title: The philosophy
description: The handful of rules that keep a single-box homelab maintainable instead of a house of cards.
---

A homelab lives or dies by a few principles you commit to early. These are the ones that matter on a single box.

## 1. Boring beats clever

Every service is a well-worn, widely-run tool. Every pattern is the documented one. Cleverness is what you're decoding at 3am when the family can't watch anything. Optimize for *the future you who forgot how this works.*

## 2. Backups first, redundancy second

**RAID is not a backup.** A mirror keeps you running when a disk dies; it does nothing against a fat-fingered delete, a bad update, ransomware, or the house flooding. Those are what actually lose data.

So the order is: **snapshots** (free, local, instant undo) → **a backup on separate media** → **an offsite copy**. Only *then* is a mirror worth adding, for uptime and bit-rot protection. If you can only do one thing, back up. See [Storage & backups](/guides/backups/).

## 3. Default to consolidation, isolate on purpose

On one box, the instinct to give every service its own VM is expensive and pointless. Most things are just containers sharing the host. You isolate deliberately — for a real security boundary, for something that must stay up while the rest is down, or for heavy state you want to restore point-in-time — not by reflex. See [LXC vs Docker](/guides/services/).

## 4. What fixes a broken host can't live on that host

DNS, the reverse proxy, the identity provider, your management tooling — the things you'd reach for when everything's on fire — get extra isolation so a single bad `compose up` can't take them out with everything else.

## 5. Private by default, public by exception

Nothing is exposed to the internet unless it has a reason to be. The baseline is a **mesh VPN** you can reach from anywhere. Public access, when needed, goes through a **tunnel** — so you never forward a port or reveal your home IP. See [Networking](/guides/networking/).

## 6. Config is data you can rebuild from

Reverse proxy, DNS zones, auth clients, container definitions — all live as text/records you could recreate the whole lab from. Secrets are the one thing that *doesn't* live in that text; they live in a [secrets manager](/guides/secrets/) and get injected at runtime.

## 7. Keep the reboot tolerable

The single-box tax is shared blast radius. So: don't over-consolidate the critical plane, keep services independently restartable, and make sure the box coming back up cleanly is a thing you've actually tested. A homelab you're afraid to reboot is already broken.

---

None of this is dogma. But every time this lab drifted from one of these rules, it bit back — usually at the worst time. Steal the ones that fit your situation.
