---
title: Hardware & Proxmox base
description: Picking a single-box, all-flash mini PC and laying down Proxmox on mirrored ZFS.
---

## The hardware

The whole lab runs on **one mini PC**. The specs that matter for a household:

- **Multiple M.2 NVMe slots** — this is the key one. A mini PC marketed as an "all-flash NAS" gives you several slots, so you can run a mirrored, expandable pool of fast, silent, low-power storage. No spinning disks, no separate NAS.
- **A modern low-power CPU** with an iGPU — enough for a dozen services plus hardware media transcoding. You do not need a Xeon.
- **16–32 GB RAM** — comfortable for the stack described here.

:::tip[All-flash is fine at household scale]
The "you need HDDs for bulk" advice is for data hoarders with tens of TB. For a family's photos, docs, and a reasonable media library — a few TB — all-NVMe is cheaper in *total cost* once you count a NAS enclosure + its power + noise. HDDs only win on $/TB at large capacity. See [Storage & backups](/guides/backups/).
:::

## Proxmox as the base

[Proxmox VE](https://www.proxmox.com/) is a Debian-based hypervisor with a web UI. It gives you:

- **LXC containers** — near-native-speed, low-overhead OS containers (the default home for most services).
- **VMs** — full isolation when you need it.
- **ZFS** built in — snapshots, mirrors, send/receive, checksummed integrity.
- **`vzdump`** — point-in-time backups of any container/VM.

Install it to the smallest drive, or carve a slice of your pool for the OS. Keep the OS install boring and separate from your data.

## ZFS: mirror your pool

Put your data on a **ZFS mirror** (or a pool of mirror pairs). Two reasons, in priority order:

1. **Bit-rot protection.** ZFS checksums every block; with a mirror it can *self-heal* silent corruption. For irreplaceable family photos accumulating over years, this alone justifies it.
2. **Uptime.** A disk dies, you keep running and replace it — no restore, no downtime.

```bash
# a two-way mirror across two NVMe drives
zpool create tank mirror /dev/disk/by-id/nvme-DISK_A /dev/disk/by-id/nvme-DISK_B
```

Grow it later by **adding mirror pairs** — the pool stripes across vdevs and capacity is the sum:

```bash
# add a second mirror pair; pool grows, stays redundant
zpool add tank mirror /dev/disk/by-id/nvme-DISK_C /dev/disk/by-id/nvme-DISK_D
```

:::caution[The one-command footgun]
Always `zpool add tank mirror A B`. A bare `zpool add tank <singledisk>` adds a **non-redundant** vdev — and since losing any one vdev loses the *entire* pool, that silently destroys your redundancy. Match drive sizes *within* a mirror; sizes can differ *across* vdevs.
:::

## Two tiers on one pool

Keep a mental (and dataset) line between:

- **Hot data** — container/VM root disks, databases, app working data. Fast, snapshotted often.
- **Cold/bulk** — media libraries, archives. Big, snapshotted rarely.

Both live on the NVMe pool here (it's all flash), but separating them into datasets makes snapshots, quotas, and backup policies sane. Never put a database on slow storage; never let bulk media fill the pool past ~80% (ZFS slows down when full).

## What you end up with

A silent box drawing a handful of watts, with a redundant, self-healing, snapshot-able pool, and a hypervisor ready to hold a couple dozen containers. Everything after this is software.

Next: [where each service should actually run →](/guides/services/)
