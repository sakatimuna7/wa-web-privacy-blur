# WA Web Privacy Blur Extension 🔒🟢

Ekstensi Google Chrome premium untuk menjaga kerahasiaan dan privasi tampilan WhatsApp Web Anda dari tatapan orang di sekitar (shoulder surfing). Didukung dengan antarmuka (UI) pengaturan yang intuitif, dinamis, dan modern langsung dari ikon ekstensi.

![WA Privacy Blur Logo](logo.png)

## ✨ Fitur Unggulan

*   **🎛️ Panel Kontrol Utama**: Hidupkan/matikan seluruh filter buram dengan sekali klik (Master Switch).
*   **👁️ Kontrol Blur Dinamis**: Sesuaikan intensitas/kekuatan blur secara mandiri menggunakan slider interaktif untuk elemen berikut:
    *   **Isi Pesan Chat**: Buramkan seluruh gelembung pesan.
    *   **Teks Pratinjau Chat**: Sembunyikan teks preview chat terakhir di daftar kontak sebelah kiri.
    *   **Pratinjau Media**: Buramkan gambar/video/canvas di dalam ruang obrolan.
    *   **Galeri Media**: Buramkan foto di galeri info kontak kanan dan modal dialog penampil media.
    *   **Foto Profil**: Buramkan avatar kontak di daftar obrolan maupun header.
    *   **Nama Kontak/Grup**: Sembunyikan nama kontak atau nama grup di sidebar dan header.
*   **⌨️ Blur Input Teks**: Memburamkan teks yang sedang Anda ketik di kolom pesan, dan otomatis menjadi jelas saat Anda memfokuskan kursor untuk mengetik.
*   **⚡ Mode Tanpa Transisi (No Transition Delay)**: Mengatur apakah efek blur hilang secara instan atau lembut saat kursor diarahkan ke elemen.
*   **🌍 Unblur on App Hover**: Cukup arahkan kursor ke dalam area tab WhatsApp Web untuk langsung menampilkan semua konten dengan jelas.
*   **⏱️ Auto-Lock Screen on Idle**: Kunci dan buramkan seluruh layar WhatsApp Web secara otomatis jika Anda meninggalkan PC Anda (idle) sesuai durasi menit yang ditentukan. Klik di mana saja pada layar untuk membuka kunci.

## 🛠️ Tech Stack

*   **Manifest V3**: Standar ekstensi Chrome modern yang aman, cepat, dan hemat resource.
*   **Vanilla HTML & CSS**: Menggunakan CSS Variables untuk pemrosesan filter blur real-time tanpa membebani kinerja CPU browser.
*   **Pure JavaScript**: Logika penyimpanan preferensi sinkron menggunakan `chrome.storage.local`.

## 🚀 Cara Instalasi Lokal (Unpacked Extension)

1.  Unduh atau klon (clone) repositori ini ke komputer Anda.
2.  Buka browser Google Chrome dan navigasikan ke:
    ```
    chrome://extensions/
    ```
3.  Aktifkan opsi **Developer mode** di pojok kanan atas halaman.
4.  Klik tombol **Load unpacked** di pojok kiri atas.
5.  Pilih folder tempat file repositori ini berada (folder `wa-web` yang berisi `manifest.json`).
6.  Buka [WhatsApp Web](https://web.whatsapp.com/) di tab baru, buka panel ekstensi di pojok kanan atas browser untuk mulai mengonfigurasi privasi Anda.

---

Dibuat dengan 💚 untuk privasi chat yang lebih aman.
