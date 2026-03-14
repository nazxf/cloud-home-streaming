/**
 * constants.ts
 *
 * File konfigurasi terpusat untuk seluruh nilai konstanta aplikasi.
 * Ubah cukup di sini — berlaku di seluruh aplikasi secara otomatis.
 */

// ─── Format Video yang Diizinkan ───────────────────────────────────────────
export const ALLOWED_VIDEO_EXTENSIONS = [
  'mp4', 'mkv', 'avi', 'mov', 'wmv',
  'flv', 'webm', 'm4v', 'ts', 'm2ts',
];

// ─── Nama Bab Video (Chapter Labels) ──────────────────────────────────────
export const CHAPTER_NAMES = {
  intro: 'Intro',
  mid: 'Misi Dimulai',
  climax: 'Klimaks',
  outro: 'Penutup',
};

// ─── Ambang Batas Bab Berdasarkan Durasi (dalam detik) ────────────────────
// Menentukan kapan setiap bab dimulai berdasarkan durasi total konten.
export const CHAPTER_THRESHOLDS = {
  // Konten sangat pendek (≤ 10 menit)
  veryShort: { maxDuration: 10 * 60, intro: 0.12, mid: 0.55, climax: 0.82 },
  // Episode pendek (≤ 30 menit)
  short:     { maxDuration: 30 * 60, intro: 0.14, mid: 0.60, climax: 0.85 },
  // Film / episode standar (≤ 90 menit)
  standard:  { maxDuration: 90 * 60, intro: 0.12, mid: 0.65, climax: 0.88 },
  // Konten panjang (> 90 menit)
  long:      { maxDuration: Infinity, intro: 0.10, mid: 0.68, climax: 0.90 },
};

// Batas minimum keamanan agar bab "Intro" minimal 30 detik
// dan bab "Penutup" minimal 2 menit sebelum akhir
export const CHAPTER_MIN_DURATION_FOR_SAFETY = 4 * 60; // 4 menit
export const CHAPTER_INTRO_MIN_SECONDS = 30;
export const CHAPTER_OUTRO_BUFFER_SECONDS = 120;

// ─── Penyimpanan Progress Video ────────────────────────────────────────────
// Seberapa sering (ms) dan perubahan posisi minimum (detik) untuk menyimpan progress
export const PROGRESS_SAVE_INTERVAL_MS = 10_000;  // 10 detik
export const PROGRESS_SAVE_MIN_DELTA_S = 2;       // 2 detik

// ─── Kontrol Tampilan Player ───────────────────────────────────────────────
export const CONTROLS_HIDE_DELAY_MS = 3000; // Kontrol disembunyikan setelah 3 detik idle
export const SEEK_ANIMATION_DURATION_MS = 800; // Durasi animasi skip (maju/mundur)
export const DOUBLE_CLICK_DELAY_MS = 250;    // Batas waktu antara klik dan double-klik
