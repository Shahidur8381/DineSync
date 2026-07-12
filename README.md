# 🍴 DineSync: Smart Dining Hall Management System

DineSync is a modern, full-stack IoT web application designed to digitize and automate university dining halls. It integrates custom **ESP32-based hardware** with a **real-time Next.js dashboard** and a **Supabase (PostgreSQL)** backend to prevent meal theft, track live consumption, and ensure safety via automated gas leak detection.

## 🚀 Live Demo Links

- **Admin Dashboard**: [https://dine-sync-admin-panel.vercel.app/](https://dine-sync-admin-panel.vercel.app/)
  - *Dev Credentials*: `admin@dinesync.local` / `Admin@123`
- **Student Portal**: [https://dine-sync-student-panel.vercel.app/](https://dine-sync-student-panel.vercel.app/)
  - *Dev Credentials*: `2207103` / `2207103` (or any valid Student ID)
- **API Server**: [https://dinesyncapi-production.up.railway.app](https://dinesyncapi-production.up.railway.app)

---

## ✨ Key Features

1. **Real-time Synchronization (WebSockets)**: Scan an RFID card at the physical kiosk, and the Admin Dashboard updates instantly without reloading.
2. **Anti-Cheating Mechanisms**: Validates RFID scans against the backend and requires IR sensor confirmation (physical presence) before marking a meal as consumed. Denies duplicate entries instantly.
3. **Student Autonomy**: Students can log in to their portal to check meal status, transfer meals to peers, and manage their passwords.
4. **IoT Safety Integration**: A built-in MQ-2 Gas Sensor on the kiosk constantly monitors the dining hall. If a gas leak is detected, the kiosk alarms and sends a critical push event to the Admin dashboard.

---

## 🛠️ Tech Stack

This project demonstrates a production-ready monorepo architecture bridging IoT and Web.

- **Frontend**: Next.js 14 (App Router), React, Vanilla CSS (Glassmorphism UI)
- **Backend**: Node.js, Express, Socket.io (Real-time Events), JWT Auth, bcryptjs
- **Database**: Supabase (PostgreSQL), REST APIs, Row Level Security bypass via Service Roles
- **Hardware/IoT**: C++ (Arduino Framework), ESP32 Microcontroller, MFRC522 (RFID), MQ-2 (Gas), IR Sensors

---

## 🔌 Hardware Setup

Curious about how the physical Kiosk is built? 
👉 **Check out the [HARDWARE_SETUP.md](./HARDWARE_SETUP.md)** for wiring diagrams, component lists, and flashing instructions.

---

## 💻 Run Locally

Want to explore the codebase locally?

1. **Clone & Install**:
   ```bash
   git clone https://github.com/Shahidur8381/DineSync.git
   cd DineSync
   pnpm install
   ```

2. **Environment Variables**:
   Copy `.env.example` to `.env` in `apps/api`, `apps/admin-panel`, and `apps/student-panel` and fill in your Supabase credentials.

3. **Run the Monorepo**:
   ```bash
   pnpm dev
   ```
   This spins up the API on port `4000`, the Admin Panel on port `3001`, and the Student Panel on port `3002`.
