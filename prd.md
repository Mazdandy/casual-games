# PRD — Pixel Arcade (Casual Browser Games Portal)

**Version:** 1.0
**Status:** Draft
**Author:** (Owner)
**Last Updated:** 2026-10-20

---

## 1. Overview

**Pixel Arcade** adalah portal game berbasis browser yang menampilkan koleksi
game HTML5 kasual berukuran kecil yang bisa langsung dimainkan. Pengguna membuka
situs, memilih game, dan mulai bermain dalam waktu kurang dari 3 detik — tanpa
unduhan, tanpa instalasi, tanpa akun.

Situs ini adalah **static web app** yang di-hosting di **GitHub Pages**, dibangun
dengan **vanilla HTML/CSS/JavaScript**. Semua data pemain (progress, achievement,
high score) disimpan secara lokal di browser via `localStorage`, sehingga produk
ini **tidak memerlukan backend, database, maupun langganan berbayar**.

## 2. Goals & Objectives

### Primary Goals
- Meluncurkan portal game yang polished dan dapat diakses publik.
- Menghadirkan pengalaman "play instantly" dengan waktu muat cepat (< 2s).
- Menciptakan produk profesional yang cocok untuk portfolio dan trafik organik nyata.

### Success Metrics
| Metric | Target (3 bulan pertama) |
| --- | --- |
| Game tersedia | ≥ 5 |
| Avg. session duration | ≥ 3 menit |
| Returning visitor rate | ≥ 20% |
| Lighthouse Performance score | ≥ 90 |
| Mobile usability score | ≥ 90 |

### Non-Goals (v1)
- Akun pengguna nyata / autentikasi.
- Global online leaderboard.
- Multiplayer real-time.
- Monetisasi / iklan.
- Pembayaran atau fitur premium.

## 3. Target Users

- **Casual players** — ingin hiburan cepat dan gratis saat istirahat; main di mobile atau desktop.
- **Students / commuters** — sesi bermain singkat di perjalanan.
- **Recruiters / reviewers** — menilai skill teknis dan desain developer (angle portfolio).

## 4. Tech Stack & Constraints

| Layer | Choice |
| --- | --- |
| Markup | HTML5 |
| Styling | CSS3 (custom, Flexbox/Grid) |
| Logic | Vanilla JavaScript (ES6+, tanpa framework) |
| Rendering | HTML5 Canvas 2D API |
| Persistence | `localStorage` |
| Hosting | GitHub Pages (static) |
| Build | Tidak diperlukan (plain files) — bundler sederhana opsional nanti |

### Constraints
- **Tanpa kode server-side.** Semua harus berjalan di browser.
- **Tanpa layanan pihak ketiga berbayar atau langganan.**
- Harus tetap bisa jalan offline setelah pemuatan pertama (service worker opsional, nice to have).
- Harus sepenuhnya responsif (mobile-first).

## 5. Feature Scope

### 5.1 In Scope (v1)

**A. Game Portal / Hub**
- Landing page menampilkan semua game sebagai kartu (ikon, judul, deskripsi singkat).
- Tombol Play mengarah ke halaman game.
- Kategori/tag (mis. Puzzle, Arcade, Reflex).

**B. Games (minimal 5)**
Lineup peluncuran yang diusulkan (semua vanilla JS / Canvas):
1. **Snake** — game refleks klasik berbasis grid.
2. **2048** — puzzle angka swipe/keyboard.
3. **Memory Match** — game memori membalik kartu.
4. **Tetris-style block dropper** — puzzle blok jatuh.
5. **Flappy-style endless runner** — tap untuk terbang, hindari rintangan.

**C. Player Progress & Achievements (lokal)**
- Best score per game disimpan di `localStorage`.
- XP / level pemain global dihitung dari total game dimainkan + skor.
- Badge achievement (mis. "First Win", "Score 1000", "Play 5 games") tampil di halaman profil.
- Skin/tema warna yang bisa di-unlock sebagai reward progres.

**D. Local Leaderboards**
- Tabel "Personal Best" per game (top 5 skor lokal).
- Halaman "Your Stats" global merangkum semua game yang dimainkan.

**E. UX / Polish**
- Layout responsif (mobile-first).
- UI bersama: header, footer, komponen game card, score HUD.
- Sound effects (opsional, bisa di-toggle) via Web Audio API.
- Toggle tema Dark / Light (persisted).

**F. Settings**
- Sound on/off.
- Toggle tema.
- Reset progress (dengan konfirmasi).

### 5.2 Out of Scope (v1)
- Akun, login, cloud sync.
- Leaderboard online/global.
- Multiplayer.
- Iklan, donasi, monetisasi.

### 5.3 Future / v2 (Backlog)
- Global leaderboard (butuh backend gratis seperti Firebase — ditunda).
- Share skor sebagai gambar (ekspor canvas client-side).
- Game tambahan.
- Mode daily challenge.
- PWA install + offline caching.

## 6. User Flows

1. **Play a game:** Home → pilih kartu game → game dimuat di Canvas → bermain → game over
   → skor disimpan lokal → achievement dievaluasi → "Play again" / "Back to hub".
2. **View progress:** Home → Profile/Stats → lihat level, XP, achievement, best per game.
3. **Change settings:** Home → Settings → toggle sound/tema → perubahan tersimpan.

## 7. Data Model (localStorage)

```json