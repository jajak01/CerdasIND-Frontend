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



## 3. Admin API

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

## 4. Data Enums

- **UserRole**: `admin`, `peserta`
- **JenisSoal**: `pilihan_ganda`, `isian_singkat`
- **StatusUjian**: `berlangsung`, `menunggu_koreksi`, `selesai`
- **SessionStatus**: `scheduled`, `completed`, `cancelled`
- **PaymentStatus**: `pending`, `paid`, `overdue`
