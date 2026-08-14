---
title: Hardware & Proxmox base
description: Two shapes for a homelab — one all-flash box, or a compute node plus a storage node — and the Proxmox + ZFS base they share.
---

## Two shapes — pick one

There isn't one right box. There are **two** well-worn shapes, and which fits comes down to how much bulk storage you want and how much you value simplicity over separation. Both run the same Proxmox + ZFS base described further down — they differ only in *where the disks live and which CPU does the heavy lifting.*

### Path A — One all-flash box

Everything on a **single mini PC** with multiple M.2 NVMe slots. Compute and storage share the machine; a mirrored NVMe pool holds both your containers and your media.

- **Multiple M.2 NVMe slots** — the key spec. A mini PC marketed as an "all-flash NAS" gives you several, so you can run a mirrored, expandable pool of fast, silent, low-power storage. No spinning disks, no separate box.
- **A modern low-power CPU with an iGPU** — enough for a dozen services plus hardware media transcoding. You do not need a Xeon.
- **16–32 GB RAM.**

This is the simplest thing that can possibly work, and for a household's photos, docs, and a reasonable media library — a few TB — it's often *all* you need.

### Path B — Two boxes: compute + storage

Split the two jobs across **two purpose-built machines**:

- A **lean compute node** — a small, low-power mini PC that runs your infrastructure plane (DNS, reverse proxy, identity, management) and your lighter apps. It doesn't need much; it needs to stay boring and up.
- A **dedicated storage node** — a NAS box with **HDD bays for cheap, redundant bulk capacity** *and* a **capable CPU + iGPU**, so the heavy media/photo apps (streaming transcode, photo ML) run **on the storage box, right next to the data**. Bulk data is served to the compute node's apps over the LAN.

The move that makes Path B pay off: put the strong silicon where the big data lives, so streaming and photo-indexing read locally instead of dragging terabytes across the network — while the compute box stays lean and independently reboot-able.

## Pros & cons

| | **Path A — one all-flash box** | **Path B — compute + storage** |
| --- | --- | --- |
| **Simplicity** | One machine to manage, back up, reboot. Least to go wrong. | Two machines, two OSes, two update cycles. More surface. |
| **Noise & power** | Fanless, a few watts, silent. | HDDs spin — some noise, more watts, more heat. |
| **Capacity & $/TB** | NVMe is dear per TB → practical ceiling a few TB. | HDDs win $/TB at scale → tens of TB of redundant bulk. |
| **Failure isolation** | None — the box is down, *everything* is down. | Reboot/upgrade compute without touching storage; the appliance stays stable. Infra survives a storage reboot; media doesn't, and vice-versa. |
| **CPU / transcode headroom** | One CPU does everything; a heavy app (photo ML, transcode) can starve the box. | Right-size each: a strong CPU/iGPU on the storage box for media, a lean one for infra. |
| **Data ↔ app locality** | Trivial — same filesystem, hardlinks and atomic moves just work. | Apps that write bulk reach it over the network; hardlinks only work *within one export*, and UID mapping needs care. Keep media-writing apps and their files on the same box or the same share. |
| **Networking** | Irrelevant — it's all local. | Bulk crosses the LAN → want **2.5GbE or better**; a 1GbE link becomes the bottleneck under load. |
| **Cost shape** | Cheaper at small scale (no enclosure, no extra PSU). | Higher upfront, better $/TB once you're past ~single-digit TB. |
| **Backup surface** | One pool to snapshot and ship offsite. | Two data locations to include in the backup plan. |

## When to pick which

- **Path A** if you want the simplest, quietest, lowest-power thing, your library is a few TB, and you'd rather not run a second machine. Simplicity is a real feature.
- **Path B** if you're hoarding tens of TB, want cheap redundant bulk on HDDs, value being able to reboot compute without taking storage down, and want a proper CPU/GPU sitting next to the media it serves.

Neither is more "correct." Path B is what you grow *into* when an all-flash box runs out of cheap capacity or you want to stop compute and storage fighting over one CPU — not a place you have to start.

:::tip[All-flash is fine at household scale]
The "you need HDDs for bulk" advice is for hoarders with tens of TB. For a family's photos, docs, and a reasonable library, all-NVMe (Path A) is often cheaper in *total cost* once you count a NAS enclosure, its power, and its noise. HDDs only win on $/TB at large capacity — which is exactly when Path B starts making sense. See [Storage & backups](/guides/backups/).
:::

## Proxmox as the base

*(Both paths — on the compute node in Path B.)*

[Proxmox VE](https://www.proxmox.com/) is a Debian-based hypervisor with a web UI. It gives you:

- **LXC containers** — near-native-speed, low-overhead OS containers (the default home for most services).
- **VMs** — full isolation when you need it.
- **ZFS** built in — snapshots, mirrors, send/receive, checksummed integrity.
- **`vzdump`** — point-in-time backups of any container/VM.

Install it to the smallest drive, or carve a slice of your pool for the OS. Keep the OS install boring and separate from your data. On Path B, the storage node runs its own appliance OS (a NAS distribution) rather than Proxmox — it has one job.

## ZFS: mirror your pool

Whichever path, put your data on a **ZFS mirror** (or a pool of mirror pairs) — NVMe on the all-flash box, HDDs on the storage node. Two reasons, in priority order:

1. **Bit-rot protection.** ZFS checksums every block; with a mirror it can *self-heal* silent corruption. For irreplaceable family photos accumulating over years, this alone justifies it.
2. **Uptime.** A disk dies, you keep running and replace it — no restore, no downtime.

```bash
# a two-way mirror across two drives (NVMe or HDD)
zpool create tank mirror /dev/disk/by-id/DISK_A /dev/disk/by-id/DISK_B
```

Grow it later by **adding mirror pairs** — the pool stripes across vdevs and capacity is the sum:

```bash
# add a second mirror pair; pool grows, stays redundant
zpool add tank mirror /dev/disk/by-id/DISK_C /dev/disk/by-id/DISK_D
```

At six or more bulk disks (a Path B storage node), prefer **RAIDZ2** over striped mirrors — two-drive redundancy matters when a resilver of a full multi-TB disk takes many hours and a second failure during it would be fatal.

:::caution[The one-command footgun]
Always `zpool add tank mirror A B`. A bare `zpool add tank <singledisk>` adds a **non-redundant** vdev — and since losing any one vdev loses the *entire* pool, that silently destroys your redundancy. Match drive sizes *within* a mirror; sizes can differ *across* vdevs.
:::

## Hot and cold tiers

Keep a line — mental and dataset — between:

- **Hot data** — container/VM root disks, databases, app working data. Fast, snapshotted often.
- **Cold / bulk** — media libraries, archives. Big, snapshotted rarely.

On **Path A** both tiers live on the one NVMe pool; separating them into *datasets* keeps snapshots, quotas, and backup policies sane. On **Path B** the split is physical: hot data on the compute node's fast storage, cold bulk on the storage node's HDD pool. Either way — never put a database on slow storage, and never let bulk media fill a pool past ~80% (ZFS slows down when full).

## What you end up with

Either a single silent box drawing a handful of watts, or a lean compute node beside a dedicated storage appliance — both with a redundant, self-healing, snapshot-able pool, and a hypervisor ready to hold a couple dozen containers. Everything after this is software.

Next: [where each service should actually run →](/guides/services/)
