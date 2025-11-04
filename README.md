# Keberadaan Guru & AKP 👩‍🏫

A simple web system to record and review weekly **ketidakhadiran** (absence) for teachers (GURU), KONTRAK, and AKP.  
Built with **HTML, CSS, JavaScript** (localStorage) and designed to be lightweight for laptop/tablet use.

---

## 🚀 Features
- Add absence records by **Jenis (Jawatan), Nama, Sebab** and **Tarikh**
- Weekly view + “Semua Rekod (Carian & Tapis)” with filters:
  - Cari Nama, Jawatan, Minggu (1–53), Tarikh Dari/Hingga
- Mini dashboards (Chart.js) for **Sebab** & **Jawatan**
- Generate **PDF** reports by **week range**, **date range**, or **exact weeks**
- Import staff list via Excel (XLS/XLSX)

---

## 🖼️ Preview

| Tambah Rekod Ketidakhadiran | Carian & Tapis | Senarai Rekod yang Ditapis |
|---|---|---|
| ![Screenshot 1](docs/KeberadaanGuru%20(1).png) | ![Screenshot 2](docs/KeberadaanGuru%20(2).png) | ![Screenshot 3](docs/KeberadaanGuru%20(3).png) |

| Jana PDF | PDF Laporan Ketidakhadiran |
|---|---|
| ![Screenshot 4](docs/KeberadaanGuru%20(4).png) | ![Screenshot 5](docs/KeberadaanGuru%20(5).png) |

---

## 🗂️ Project Structure
Below is a simplified view of the repository layout and what each file does:
```text
keberadaan-guru/
│
├── keberadaan-guru-staf.html     # 🌐 Main web interface (UI)
├── styles.css                    # 🎨 Custom styling for layout, cards, and filters
├── app.js                        # ⚙️ Core JavaScript logic (CRUD, filters, charts, PDF export)
│
├── logo_dataurl_fixed.js         # 🏫 Base64-encoded school logo (embedded image)
├── signature_dataurl.js          # ✍️ Base64-encoded digital signature (for PDF footer)
│
├── docs/                         # 🖼️ Screenshots used in README
│   ├── KeberadaanGuru (1).png
│   ├── KeberadaanGuru (2).png
│   ├── KeberadaanGuru (3).png
│   ├── KeberadaanGuru (4).png
│   └── KeberadaanGuru (5).png
│
└── Data Guru Dan AKP/            # 📊 (Optional) Excel file with sample staff data
│   └── DATA GURU DAN AKP TERKINI 2025.xl
```
