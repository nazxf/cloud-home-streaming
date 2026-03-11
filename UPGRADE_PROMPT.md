# StreamFlix Upgrade Prompt

Tolong upgrade project StreamFlix dengan fokus 3 fitur ini sekaligus:

1) Mobile-first layout (fitur #10)
- UI harus benar-benar nyaman di HP (360px–480px), tablet, dan desktop.
- Perbaiki navbar, hero, card grid, admin action buttons, modal edit, dan form upload supaya responsif.
- Hindari overflow horizontal.
- Ukuran font, spacing, dan tombol harus tetap mudah dipakai di layar kecil.
- Pastikan fitur login, play video, search, upload, edit, delete tetap bekerja di semua ukuran layar.

2) Episode/Season grouping (fitur #4)
- Di backend, deteksi pola nama file video seperti:
  - S01E01, s1e2, Season 1 Episode 3, dll.
- Kelompokkan video menjadi struktur:
  - Series Title -> Season -> Episodes
- Jika tidak cocok pola, masukkan ke kategori “Movies/Other”.
- Di frontend, tampilkan UI grouped:
  - Section series
  - Dropdown/accordion season
  - List episode card
- Tetap support search lintas semua group.

3) Bulk upload (multi file upload)
- Admin bisa upload banyak video sekaligus dalam 1 aksi.
- Tambahkan drag-and-drop area + file picker multiple.
- Tampilkan queue list: nama file, ukuran, status (waiting/uploading/success/error).
- Upload harus berurutan atau paralel terbatas (max 2-3) agar stabil.
- Tampilkan progress bar per file.
- Tetap support optional title per file (boleh auto-generate dari filename jika kosong).
- Setelah bulk selesai, auto refresh list video.
- Kalau 1 file gagal, file lain tetap lanjut (jangan batalkan semua).

Tambahan teknis penting:
- Pertahankan sistem auth existing (admin only untuk create/edit/delete/upload).
- Tetap pakai SQLite untuk metadata.
- Jangan merusak fitur thumbnail manual vs auto FFmpeg yang sudah ada:
  - Featured card pakai manual thumbnail
  - Grid card pakai auto thumbnail
- Tambahkan validasi error yang jelas di UI.
- Jalankan build check akhir:
  - frontend: npm run build
  - backend: go build ./...

Output yang saya mau:
- Ringkasan perubahan
- Daftar file yang diubah
- Catatan cara test fitur baru langkah demi langkah
