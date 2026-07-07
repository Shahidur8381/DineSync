# DineSync: Smart Hall Dining Management System

DineSync is a robust, real-time IoT and web solution for managing university dining hall meals. 
The system features an ESP32-based RFID kiosk paired with a Next.js Admin Dashboard and a Supabase backend.

## 🚀 How to Showcase This Project

Follow these steps to demonstrate the full end-to-end functionality of DineSync to your professor or audience.

### 1. Reset and Prepare the Database
Since the logic has been simplified, you must reset the Supabase database before the showcase:
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Open the **SQL Editor**.
3. Copy the entire contents of `supabase_schema.sql` (found in the root of this project).
4. Paste it into the Supabase SQL Editor and click **Run**. This will drop the old complex tables (MealPlan, Wallet, etc.) and create the new simplified `MealSession`, `MealStatus`, and `Log` tables, along with seed data (4 students with dummy cards).

### 2. Start the Backend and Frontend
1. Open a terminal in the root directory and run the development server:
   ```bash
   pnpm dev
   ```
2. Open your browser and go to the Admin Panel: [http://localhost:3000](http://localhost:3000)
3. Log in using the admin credentials:
   - **Email**: `admin@dinesync.local`
   - **Password**: `password123`

### 3. Flash the ESP32 Hardware
1. Open `firmware/dinesync-kiosk/dinesync-kiosk.ino` in the Arduino IDE.
2. In `config.h`, ensure:
   - `WIFI_SSID` and `WIFI_PASSWORD` are set to your mobile hotspot or local router.
   - `API_BASE_URL` is set to the local IP address of your computer running `pnpm dev` (e.g., `http://192.168.0.200:4000`).
3. Connect the ESP32 to your computer and click **Upload**.

---

## 🎬 Live Demonstration Steps

### Scene 1: The Admin Dashboard & Meal Setup
1. Show the **Admin Dashboard** on your laptop. 
2. Explain the **Meal Session Control**: 
   - You can toggle the meal ON/OFF (e.g., "Lunch is now active").
   - You can set the **Total Meals Prepared** (e.g., set it to `100` and click Save).
3. Point out the **Live Activity Log** which is currently waiting for kiosk activity.

### Scene 2: Standard Meal Verification (Success)
1. Pick up an RFID card belonging to a seeded student (e.g., Shawon).
2. Scan the card on the MFRC522 scanner.
3. The Kiosk OLED will say **"APPROVED"** and beep the success tone.
4. **Crucial Step:** Within 30 seconds of the scan, wave your hand in front of the **IR Sensor**.
5. The Kiosk will immediately beep again, confirming the meal is consumed.
6. **Look at the Admin Dashboard:** A live event will instantly pop up saying *"Shawon entered the dining and consumed a meal."* The "Meals Consumed" counter will increase, and "Meals Left" will decrease.

### Scene 3: Anti-Cheating (Double Scan)
1. Scan the same RFID card again.
2. The Kiosk OLED will immediately say **"DENIED"** and beep an error tone. 
3. The display will show the reason: *"Meal already consumed"*. 
4. This proves students cannot share cards or eat twice in one session.

### Scene 4: Hardware Admin Controls (Buttons)
1. Explain that the dining hall staff can quickly check status without looking at the computer.
2. Press **Button 2 (SW2)** on the breadboard.
3. The Kiosk OLED will query the backend and display **"Meals Left: 99"**.
4. Press **Button 1 (SW1)** on the breadboard.
5. The Kiosk OLED will display **"Meals Reset!"**. 
6. **Look at the Admin Dashboard:** A live event will appear saying *"All meal statuses were reset to NOT_CONSUMED by hardware button."* This demonstrates how staff prep for the next meal (e.g., transition from Lunch to Dinner).

### Scene 5: Emergency Gas Leakage Alert
1. Take a lighter (unlit) and release a small amount of butane near the **MQ2 Gas Sensor**.
2. Within seconds, the Kiosk will detect the spike. 
3. The Kiosk OLED will flash **"GAS ALERT"** and the buzzer will beep continuously in a blocking alarm state. The kiosk will stop accepting RFID scans.
4. **Look at the Admin Dashboard:** A massive red **CRITICAL ALERT** banner will appear on the screen in real-time.
5. Explain that the alarm can only be disabled by an authorized staff member pressing **BOTH Button 1 and Button 2 simultaneously**.
6. Press both buttons together to silence the alarm and return the kiosk to the Ready state.

---

## 🛠️ Tech Stack Used

- **Hardware:** ESP32, MFRC522 (RFID), SSD1306 (OLED), MQ2 (Gas), IR Obstacle Sensor.
- **Firmware:** C++ (Arduino Framework), `millis()` non-blocking architecture.
- **Backend:** Node.js, Express, Socket.io (Websockets for real-time).
- **Database:** Supabase (PostgreSQL), Zod for validation.
- **Frontend:** Next.js (App Router), React, Recharts (Analytics).
