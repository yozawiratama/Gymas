
# 🏋️ GYMAS – Gym Management System (MVP)

## Product Vision

Aplikasi manajemen gym untuk:

* Mengelola member
* Mengelola paket membership
* Mengelola trainer
* Mengelola transaksi
* Monitoring operasional harian

Target awal: Small–Medium Gym.

---

# I. EPIC LIST

---

## EPIC 1 – Authentication & Role Management

Mengelola login dan hak akses sistem.

---

## EPIC 2 – Member Management

Mengelola data member gym.

---

## EPIC 3 – Membership & Package Management

Mengelola jenis paket membership.

---

## EPIC 4 – Payment & Transaction Management

Mengelola pembayaran dan riwayat transaksi.

---

## EPIC 5 – Trainer Management

Mengelola data personal trainer.

---

## EPIC 6 – Attendance / Check-In System

Mencatat kehadiran member.

---

## EPIC 7 – Dashboard & Reporting

Menampilkan statistik bisnis gym.

---

# II. FUNCTIONAL REQUIREMENTS (FR)

---

# EPIC 1 – Authentication & Role

### FR-1.1 – Login

* Admin dapat login menggunakan email & password.
* Password di-hash.

### FR-1.2 – Role

Role minimum:

* Owner
* Staff
* Trainer

### FR-1.3 – Role Permission

* Owner: Full access.
* Staff: Member + transaksi + check-in.
* Trainer: View assigned members only.

---

# EPIC 2 – Member Management

### FR-2.1 – Create Member

* Nama
* No HP
* Email
* Tanggal lahir
* Gender
* Foto (optional)

### FR-2.2 – Edit Member

* Data bisa diubah.

### FR-2.3 – Deactivate Member

* Soft delete.
* Tidak bisa check-in bila inactive.

### FR-2.4 – Member Detail View

Menampilkan:

* Status membership
* Expired date
* Total attendance
* Riwayat transaksi

---

# EPIC 3 – Membership Package

### FR-3.1 – Create Package

Field:

* Nama paket
* Durasi (bulan)
* Harga
* Deskripsi

### FR-3.2 – Activate Package to Member

* Pilih member
* Pilih paket
* Set start date
* System auto-calc expired date

### FR-3.3 – Membership Status

Status:

* Active
* Expired
* Suspended

---

# EPIC 4 – Payment & Transaction

### FR-4.1 – Create Transaction

* Member
* Paket
* Amount
* Metode pembayaran (Cash / Transfer / QRIS)
* Tanggal

### FR-4.2 – Payment Confirmation

* Mark as paid.

### FR-4.3 – Transaction History

* Filter by date.
* Filter by member.

---

# EPIC 5 – Trainer Management

### FR-5.1 – Create Trainer

* Nama
* No HP
* Specialty

### FR-5.2 – Assign Trainer to Member

* Member dapat memiliki trainer aktif.

### FR-5.3 – Trainer View

Trainer hanya bisa melihat:

* Assigned members
* Jadwal personal training

---

# EPIC 6 – Attendance / Check-In

### FR-6.1 – Manual Check-In

* Staff cari member.
* Klik check-in.
* System validasi membership active.

### FR-6.2 – Auto Expiry Check

Jika expired:

* Tampilkan warning.
* Tidak bisa check-in.

### FR-6.3 – Attendance History

* List kehadiran per member.

(Advanced version nanti: QR Code check-in)

---

# EPIC 7 – Dashboard & Reporting

### FR-7.1 – Summary Metrics

Owner melihat:

* Total active member
* Expired member
* Revenue bulan ini
* Revenue hari ini

### FR-7.2 – Revenue Chart

* Monthly revenue chart.

### FR-7.3 – Expired Soon Alert

* Membership yang akan habis dalam 7 hari.

---

# III. USE CASE

---

# Use Case 1 – Register New Member

**Actor:** Staff
**Flow:**

1. Staff klik "Tambah Member"
2. Isi form
3. Submit
4. Member tersimpan

---

# Use Case 2 – Activate Membership

**Actor:** Staff

1. Pilih member
2. Pilih paket
3. Input payment
4. System set expired date
5. Membership aktif

---

# Use Case 3 – Member Check-In

**Actor:** Staff

1. Cari member
2. Klik check-in
3. System cek status
4. Jika active → record attendance
5. Jika expired → tampilkan warning

---

# Use Case 4 – Owner View Dashboard

**Actor:** Owner

1. Login
2. Masuk dashboard
3. Lihat summary & chart

---

# Use Case 5 – Assign Trainer

**Actor:** Owner / Staff

1. Pilih member
2. Assign trainer
3. Save
4. Trainer bisa melihat member tersebut

---

# IV. HIGH LEVEL DATABASE ENTITIES (Prisma-Oriented)

Core tables:

* User
* Role
* Member
* Package
* Membership
* Transaction
* Attendance
* Trainer
* TrainerAssignment

---

# V. MVP SCOPE (Realistic untuk Modal Minim)

Karena Anda pernah menyebut modal sangat kecil, maka MVP disarankan:

Phase 1:

* Login
* Member CRUD
* Package CRUD
* Activate membership
* Manual check-in
* Simple dashboard

Phase 2:

* QR check-in
* Trainer module
* Advanced reporting
