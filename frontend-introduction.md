# CerdasIND Frontend Development Guide

Welcome to the CerdasIND frontend development guide. This document provides all the necessary details to integrate with the backend API.

## 1. General Information

- **Base URL**: `http://localhost:8080/api/v1` (Standard local development)
- **Authentication**: JWT Bearer Token. Include it in the header:
  `Authorization: Bearer <your_token>`
- **Response Format**: Most responses follow this wrapper:
  ```json
  {
    "message": "success message",
    "data": { ... } or [ ... ]
  }
  ```

---

## 2. Authentication

### **Register**
- **Endpoint**: `POST /auth/register`
- **Payload**:
  ```json
  {
    "username": "johndoe",
    "email": "john@example.com",
    "password": "password123"
  }
  ```

### **Login**
- **Endpoint**: `POST /auth/login`
- **Payload**:
  ```json
  {
    "email": "john@example.com",
    "password": "password123"
  }
  ```
- **Response Data**:
  ```json
  {
    "user_id": 1,
    "username": "johndoe",
    "role": "peserta", // or "admin"
    "token": "eyJhbG..."
  }
  ```

### **Change Password** (Protected)
- **Endpoint**: `PUT /auth/change-password`
- **Payload**:
  ```json
  {
    "old_password": "oldpassword",
    "new_password": "newpassword123"
  }
  ```

---

## 3. Participant API (Exam Workflow)

### **Get Educational Levels (Jenjang)**
- **Endpoint**: `GET /jenjang`
- **Response**: Array of `{ "id": 1, "nama": "SD" }`

### **Get Subjects (Mapel)**
- **Endpoint**: `GET /jenjang/:id/mapel`
- **Example**: `GET /jenjang/1/mapel`
- **Response**: Array of `{ "id": 1, "jenjang_id": 1, "nama": "Matematika" }`

### **Get Exam Bundles**
- **Endpoint**: `GET /mapel/:id/bundles`
- **Response**: Array of Bundles
  ```json
  {
    "id": 1,
    "nama_bundle": "Tryout UN 2024",
    "deskripsi": "Latihan soal UN",
    "waktu_menit": 120,
    "is_active": true
  }
  ```

### **Start Exam (Get Questions)**
- **Endpoint**: `GET /bundles/:id/soal`
- **Response**: Array of Questions (Public version, no answers, no discussion)
  ```json
  {
    "id": 1,
    "tipe_soal": "pilihan_ganda",
    "teks_soal": "1 + 1 = ...",
    "image_url": "https://drive.google.com/uc?export=view&id=...",
    "bobot_nilai": 5,
    "opsi": [
      {"id": 1, "soal_id": 1, "opsi": "A", "teks": "1", "image_url": ""},
      {"id": 2, "soal_id": 1, "opsi": "B", "teks": "2", "image_url": "https://..."},
      {"id": 3, "soal_id": 1, "opsi": "C", "teks": "3", "image_url": ""}
    ]
  }
  ```
- `image_url` on soal = question image. `image_url` on each opsi = image for that option.
- Google Drive sharing links are auto-converted to `uc?export=view&id=ID` format.

### **Submit Exam**
- **Endpoint**: `POST /bundles/:id/submit`
- **Payload**:
  ```json
  {
    "jawaban": [
      { "soal_id": 1, "jawaban_peserta": "B" },
      { "soal_id": 2, "jawaban_peserta": "Ibukota Indonesia adalah Jakarta" }
    ]
  }
  ```

### **Exam History**
- **Endpoint**: `GET /users/history`
- **Response**:
  ```json
  [
    {
      "history_id": 1,
      "nama_bundle": "Tryout UN 2024",
      "waktu_mulai": "2024-05-30T...",
      "skor_akhir": 85.5,
      "status": "selesai" // "berlangsung", "menunggu_koreksi", "selesai"
    }
  ]
  ```

### **Exam Review (Post-Exam)**
- **Endpoint**: `GET /bundles/:id/review`
- **Response**: Details with answers, discussion, and image URLs.
  ```json
  [
    {
      "id": 1,
      "tipe_soal": "pilihan_ganda",
      "teks_soal": "...",
      "image_url": "https://drive.google.com/uc?export=view&id=...",
      "opsi": [
        {"id": 1, "soal_id": 1, "opsi": "A", "teks": "...", "image_url": ""},
        {"id": 2, "soal_id": 1, "opsi": "B", "teks": "...", "image_url": "https://..."}
      ],
      "pembahasan": "Penjelasan soal...",
      "jawaban_peserta": "A",
      "kunci_jawaban": "B",
      "is_benar": false
    }
  ]
  ```

---

## 4. Admin API

### **Dashboard Stats**
- **Endpoint**: `GET /admin/dashboard/stats`
- **Response**:
  ```json
  {
    "total_students": 150,
    "today_sessions": 5,
    "this_week_sessions": 25,
    "pending_payments": 1200000,
    "this_month_revenue": 5000000,
    "total_omzet": 25000000
  }
  ```

### **Bundle Management**
- `GET /admin/bundles`: List all bundles.
- `POST /admin/bundles/upload`: Multipart upload (file, mapel_id, nama_bundle, waktu_menit).
- `GET /admin/bundles/:id/export`: Download .xlsx.
- `PUT /admin/bundles/:id/update`: Update via Excel.

### **Submission & Grading**
- `GET /admin/submissions?status=menunggu_koreksi`: List submissions for grading.
- `GET /admin/submissions/:history_id`: Get detail for grading.
- `PUT /admin/submissions/:history_id/grade`:
  ```json
  {
    "penilaian_manual": [
      { "soal_id": 1, "skor_diberikan": 5.0 }
    ]
  }
  ```

### **Student Management**
- `GET /admin/students`: List all.
- `POST /admin/students`: Create (name, school, grade, contact, address).
- `GET /admin/students/:id`: Detail.
- `PUT /admin/students/:id`: Update.
- `DELETE /admin/students/:id`: Delete.

### **Session Management (Tutoring)**
- `GET /admin/sessions`: List with filters (`studentId`, `startDate`, `endDate`, `status`, `paymentStatus`, `search`).
- `POST /admin/sessions`: Create.
  ```json
  {
    "student_id": 1,
    "subject": "Matematika",
    "date": "2024-06-01",
    "time": "14:00",
    "price": 100000,
    "status": "scheduled",
    "payment_status": "pending"
  }
  ```

---

## 5. Data Enums

- **UserRole**: `admin`, `peserta`
- **JenisSoal**: `pilihan_ganda`, `isian_singkat`
- **StatusUjian**: `berlangsung`, `menunggu_koreksi`, `selesai`
- **SessionStatus**: `scheduled`, `completed`, `cancelled`
- **PaymentStatus**: `pending`, `paid`, `overdue`
