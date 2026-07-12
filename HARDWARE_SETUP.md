# 🔌 DineSync Hardware Setup Guide

The DineSync hardware kiosk acts as the physical entry point for the dining hall. It runs on an **ESP32 Microcontroller** and communicates directly with the Node.js API server over Wi-Fi.

## 📦 Components Required

1. **ESP32 Development Board** (Wi-Fi enabled)
2. **MFRC522 RFID Reader** (SPI interface)
3. **SSD1306 OLED Display** (128x64, I2C interface)
4. **IR Obstacle Avoidance Sensor** (Digital out)
5. **MQ-2 Gas Sensor** (Analog out)
6. **Active Buzzer** 
7. **2x Push Buttons** (For admin hardware controls)

---

## 🔗 Wiring Guide (Pinout)

Make sure to connect the components to the ESP32 according to the following mapping:

| Component | Pin on Component | ESP32 Pin | Notes |
| :--- | :--- | :--- | :--- |
| **MFRC522 (RFID)** | SDA (SS) | GPIO 5 | SPI Chip Select |
| | SCK | GPIO 18 | SPI Clock |
| | MOSI | GPIO 23 | SPI MOSI |
| | MISO | GPIO 19 | SPI MISO |
| | RST | GPIO 22 | Reset Pin |
| | 3.3V / GND | 3.3V / GND | Power |
| **SSD1306 (OLED)** | SDA | GPIO 21 | I2C Data |
| | SCL | GPIO 22 | I2C Clock |
| | VCC / GND | 3.3V / GND | Power |
| **IR Sensor** | OUT | GPIO 34 | Digital Input |
| **MQ-2 Gas Sensor** | A0 | GPIO 32 | Analog Input |
| **Buzzer** | + (Long leg) | GPIO 25 | Digital Output (PWM) |
| **Button 1 (Reset)** | Terminal 1 | GPIO 13 | Use internal pull-up |
| **Button 2 (Status)** | Terminal 1 | GPIO 12 | Use internal pull-up |

*(Note: Connect the other terminals of the buttons to GND. Connect GND pins of all modules to the ESP32 GND.)*

---

## 🛠️ Flashing the Firmware

1. Open the Arduino IDE.
2. Install the necessary libraries via the Library Manager:
   - `MFRC522` by GithubCommunity
   - `Adafruit SSD1306` & `Adafruit GFX Library`
   - `ArduinoJson` by Benoit Blanchon
3. Open the firmware sketch located at: `firmware/dinesync-kiosk/dinesync-kiosk.ino`.
4. Navigate to `config.h` (or the configuration section at the top of the sketch) and update:
   ```cpp
   #define WIFI_SSID "Your_Network_Name"
   #define WIFI_PASSWORD "Your_Password"
   
   // Replace with your production server or local computer IP (e.g. http://192.168.1.100:4000)
   #define API_BASE_URL "https://dinesyncapi-production.up.railway.app" 
   ```
5. Select your ESP32 board model and COM port in the Arduino IDE.
6. Click **Upload**.

Once flashed, the OLED screen will say **"Connecting to Wi-Fi..."** and then display **"Ready. Scan Card"** when successfully connected to the server!
