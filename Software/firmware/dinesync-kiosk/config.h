// ─────────────────────────────────────────────────────────────────────────────
//  DineSync Kiosk Firmware Configuration  —  v2.0.0
//  Edit this file before flashing. Do NOT commit real secrets to version control.
// ─────────────────────────────────────────────────────────────────────────────
#pragma once

// ─── Firmware Identity ────────────────────────────────────────────────────────
#define FIRMWARE_VERSION "3.0.0"

// ─── Feature Toggles ─────────────────────────────────────────────────────────
// Set to true to enable servo motor control; false compiles without servo code.
#define ENABLE_SERVO false

// ─── WiFi ─────────────────────────────────────────────────────────────────────
#define WIFI_SSID     "SHAWON"
#define WIFI_PASSWORD "        "

// ─── API ──────────────────────────────────────────────────────────────────────
// Use the machine running the Express API. Find with `ipconfig` / `ifconfig`.
#define API_BASE_URL   "http://192.168.0.200:4000"
#define DEVICE_ID      "kiosk-hall-a-01"
#define DEVICE_API_KEY "dinesync-dev-key-01"   // raw key — sent in X-Device-Key header

// ─── Pin Definitions ──────────────────────────────────────────────────────────

// RFID (MFRC522) — SPI bus
#define RFID_SS_PIN   5
#define RFID_RST_PIN  4
// SPI defaults: SCK=18, MISO=19, MOSI=23 (handled by SPI.begin())

// OLED (SSD1306) — I2C bus
#define OLED_WIDTH     128
#define OLED_HEIGHT    64
#define OLED_I2C_ADDR  0x3C
// I2C defaults: SDA=21, SCL=22 (handled by Wire.begin())

// Servo motor — PWM
#define SERVO_PIN 13

// Buzzer — active buzzer, 3.3V compatible
#define BUZZER_PIN 27

// IR sensor — digital output
// IMPORTANT: Most common IR modules (FC-51, TCRT5000) output HIGH when obstacle detected.
// Set to HIGH if your sensor outputs HIGH on detection, LOW if it outputs LOW on detection.
#define IR_SENSOR_PIN    26
#define IR_ACTIVE_LEVEL  LOW   // LOW = obstacle detected (sensor pulls LOW when blocked)

// MQ-2 / MQ-135 gas sensor — analog output
// CRITICAL: If sensor outputs 5V, use voltage divider (10kΩ / 20kΩ → GND)
#define GAS_SENSOR_PIN 34

// Admin buttons — active LOW with internal pull-up
#define SW1_PIN 14   // Admin Gate Open
#define SW2_PIN 25   // Admin Reset

// ─── Timing ───────────────────────────────────────────────────────────────────
#define GATE_OPEN_MS           3000    // ms gate stays open after approval
#define HEARTBEAT_INTERVAL_MS  30000   // ms between heartbeat pings
#define GAS_POLL_INTERVAL_MS   5000    // ms between gas sensor readings
#define WIFI_RECONNECT_MS      10000   // ms between WiFi reconnect attempts
#define IR_TIMEOUT_MS          6000    // ms to wait for passage after gate opens
#define SCAN_COOLDOWN_MS       1500    // ms debounce between RFID scans
#define DISPLAY_RESULT_MS      5000    // ms to show verify result before returning to idle
#define BUTTON_DEBOUNCE_MS     50      // ms button debounce
#define HTTP_TIMEOUT_MS        10000   // ms HTTP request timeout
#define SELFTEST_DELAY_MS      500     // ms pause between self-test steps on OLED
#define WIFI_CONNECT_TIMEOUT_MS 15000  // ms max wait for initial WiFi connection

// ─── MQ2 Auto-Calibration ────────────────────────────────────────────────────
#define GAS_CALIBRATION_MS          8000   // ms to sample baseline during boot
#define GAS_CALIBRATION_INTERVAL_MS 200    // ms between each calibration sample
#define GAS_THRESHOLD_OFFSET_RAW    300    // raw ADC offset above baseline to trigger alert
#define GAS_CONSECUTIVE_READS       2      // consecutive readings above threshold to trigger alert

// ─── Servo Angles ─────────────────────────────────────────────────────────────
#define SERVO_OPEN_ANGLE  90
#define SERVO_CLOSE_ANGLE 0
