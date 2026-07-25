---
title: Media automation without filling the disk
description: Quality profiles that actually cap size, hardlinks that don't lie, and a seeding lifecycle that cleans up after itself.
---

An automated media stack — a couple of \*arr apps, a torrent client, a request frontend — will quietly eat every byte you give it. Not because it's broken, but because the defaults optimise for *quality*, and nobody optimises for *your disk*. This guide is the set of settings that keep a library from ballooning, learned the day a pool hit 89%.

## Where the space actually goes

Three culprits, in order of damage:

1. **Remux and 2160p grabs.** A 1080p Remux is 30–45 GB for one film — a full Blu-ray disc rip with lossless audio. Multiply by a library and you're out of disk in a weekend.
2. **Copy-imports.** If hardlinks aren't set up, importing a download *copies* it into the library — so the file now exists **twice**: once seeding, once in the library. Your 40 GB film is 80 GB.
3. **Orphaned seeds.** Delete a film in the library and the torrent keeps seeding the file. Space isn't freed until the *torrent* is removed too.

Fix all three and a library shrinks by more than half without losing a thing you wanted.

## Quality: the tier is not a size cap

The instinct is to set the quality profile to "1080p" and move on. That's not enough. A quality *tier* like `Bluray-1080p` spans a **3 GB x265 encode and a 25 GB x264-with-lossless-audio encode** — both are "Bluray-1080p". Picking the tier does nothing to bound size.

Three settings, together, are what actually work:

### 1. Disallow the bloat tiers

In the quality profile, turn **off**:

- **Remux** (all resolutions)
- **all 2160p / UHD**
- BR-DISK, Raw-HD

Leave `WEBDL-1080p` and `Bluray-1080p` (these are *encodes*, not disc rips). That alone kills the 40 GB grabs.

### 2. Set a real size ceiling

This is the lever people miss. In **Quality Definitions**, every tier has a **max size in MB per minute** — and the defaults are enormous. Cap the 1080p tiers at roughly **50 MB/min**:

- a ~2-hour film → **~9 GB max**
- a ~45-min episode → **~2.3 GB max**

Now the 25 GB x264-lossless release is *rejected at grab time* — it physically can't be selected. This is the setting that turns "prefer smaller" from a wish into a rule.

### 3. Prefer x265, penalise lossless

Custom Formats nudge the picker among releases that pass the cap:

```text
x265 (HEVC)     ReleaseTitle  (?i)\b(x265|h265|hevc)\b     score +100
Lossless Audio  ReleaseTitle  (?i)(DTS-HD|TrueHD|FLAC|PCM|Atmos)   score −80
```

Keep the minimum-format-score at 0 so these are *preferences*, not gates — you still get a grab if only x264 exists, it's just the last resort.

:::tip[The result]
Remux 44 GB → x264 encode 24 GB → **x265 encode 6 GB**. Same film, ~7× smaller, and the size cap makes it automatic for every future grab.
:::

## Hardlinks: make imports free

By default, importing a completed download **copies** it into your library — two copies, double the space. Turn on **"Use hardlinks instead of copy"** in the \*arr's media-management settings, and keep the download and library folders **on the same filesystem** (this is why the classic layout mounts one shared `/data` with `torrents/` and `media/` as subfolders — a hardlink can't cross filesystems).

With hardlinks on, the library entry and the seeding file are the **same bytes on disk** with two names. The film counts once. Seeding continues. Deleting one name leaves the other untouched.

:::caution[Check it's actually working]
A hardlinked file shows a **link count of 2** (`ls -l` second column, or `stat`). If your imports show link count 1, hardlinks aren't happening — usually because the paths are on different mounts, or the setting was flipped on *after* those files were imported (it doesn't apply retroactively).
:::

### Re-importing without breaking the seed

If you ever delete a library file but the download is still seeding it, the \*arr's database goes **stale** — it thinks the file exists, and on the next scan it re-downloads it. To fix without a re-download: refresh the item (clears the stale record), then **manually import from the still-seeding file using "Copy" mode**. With hardlinks on, "Copy" makes a hardlink — the library gets the file back, the seed keeps running, zero extra space. ("Move" would relocate the file and break seeding — don't.)

## The seeding lifecycle

Seeding is good manners, but infinite seeding is a slow disk leak. Give the torrent client a **share limit**: stop at a ratio *or* a time, whichever comes first, and **remove the torrent and its files** when it hits.

A reasonable public-tracker policy: **ratio 1.0 or 14 days**. You've given back what you took, and the file clears itself.

:::caution[Private trackers need protecting]
Private trackers enforce minimum seed times — an aggressive ratio limit can trigger a **hit-and-run** and get you warned or banned. If you use any, either raise their threshold, exclude them from the auto-remove, or maintain a ratio buffer elsewhere. Public trackers have no such obligation — drain freely.
:::

## Deleting things properly

The golden rule: **the \*arr is the source of truth. Delete there, not in the player.**

- **Delete in the media manager (\*arr), with "delete files".** That removes the library copy. But remember culprit #3 — if a torrent still seeds that file, the space isn't back until you remove the **torrent** too.
- **Don't delete from the player** (Jellyfin/Plex). The file vanishes but every other service still thinks it exists — you get "missing episode" states and confused re-downloads.
- **Failed grabs:** turn on **"Remove failed downloads"** on the download-client config so a stalled or rejected grab is cleaned from the client automatically — otherwise it sits there downloading to nowhere. Leave **"Remove completed"** *off*, or you'll kill your own seeding the moment a file imports.
- **The request frontend caches availability.** After you remove media, the requester (Overseerr/Jellyseerr) still shows it as available until its **availability-sync** job runs — daily by default. Trigger it manually if you want the status correct immediately; otherwise it reconciles overnight. Not a bug, just a schedule.

## The mindset

Storage discipline in a media stack isn't a one-time cleanup, it's a few defaults that make the *automation* respect your disk:

- a **size cap**, so quality can't run away,
- **hardlinks**, so nothing is stored twice,
- a **seeding limit**, so torrents clean up after themselves,
- and one place to delete from.

Set those once and the library stops being a thing you firefight. The extra drive you were about to buy becomes a nice-to-have instead of an emergency.
