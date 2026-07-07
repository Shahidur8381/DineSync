// ─────────────────────────────────────────────────────────────────────────────
//  DineSync Kiosk Firmware — v3.0.0 (Simplified Logic)
//  ESP32 + MFRC522 RFID + SSD1306 OLED + Buzzer + IR + MQ2 + Buttons
//
//  New Logic:
//  1. RFID always scans.
//  2. If allowed, UID added to a queue for 30 seconds.
//  3. If IR detects within 30s -> call /consume to mark in DB.
//  4. Button 1 -> Reset all meals to not consumed.
//  5. Button 2 -> Show total meals left.
//  6. Gas Sensor -> Blocking beep until BOTH buttons pressed.
// ─────────────────────────────────────────────────────────────────────────────

#include <Arduino.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

#include "config.h"

// ═════════════════════════════════════════════════════════════════════════════
//  SECTION 1 — HARDWARE OBJECTS
// ═════════════════════════════════════════════════════════════════════════════

MFRC522            rfid(RFID_SS_PIN, RFID_RST_PIN);
Adafruit_SSD1306   oled(OLED_WIDTH, OLED_HEIGHT, &Wire, -1);

// ═════════════════════════════════════════════════════════════════════════════
//  SECTION 2 — SYSTEM STATE
// ═════════════════════════════════════════════════════════════════════════════

// --- Display state machine ---
enum DisplayState {
  DISP_BOOT,
  DISP_SELFTEST,
  DISP_WIFI_CONNECTING,
  DISP_READY,
  DISP_WAITING,
  DISP_READING_CARD,
  DISP_VERIFYING,
  DISP_ACCESS_GRANTED,
  DISP_ACCESS_DENIED,
  DISP_GAS_WARNING,
  DISP_INFO,
  DISP_OFFLINE_MODE,
};

volatile DisplayState displayState = DISP_BOOT;

// --- Timing state ---
unsigned long lastWifiRetry      = 0;
unsigned long lastHeartbeat      = 0;
unsigned long lastGasPoll        = 0;
unsigned long lastScanTime       = 0;
unsigned long displayResultAt    = 0;

// --- Gas sensor auto-calibration ---
long gasCalibrationSum    = 0;    // long prevents int overflow during 8s calibration
int  gasCalibrationCount  = 0;
unsigned long gasCalibLastSample = 0;  // time of last calibration sample
int  gasBaseline          = 0;
int  gasAlertThreshold    = 4095;
bool gasCalibrated        = false;
unsigned long gasCalibStart = 0;
int  gasConsecutiveHigh   = 0;

// --- Button state ---
bool sw1Last = HIGH;
bool sw2Last = HIGH;
unsigned long sw1LastDebounce = 0;
unsigned long sw2LastDebounce = 0;
bool sw1Pressed = false;
bool sw2Pressed = false;

// --- IR state ---
bool irLast = HIGH;
bool irStable = false;
unsigned long irDebounce = 0;

// --- API Models ---
struct VerifyResult {
  bool   ok;
  bool   allowed;
  String studentName;
  String displayMessage;
  String reason;
};

// --- Pending Queue (Wait for IR) ---
struct PendingScan {
  String cardUid;
  unsigned long timestamp;
  bool active;
};

#define MAX_PENDING 5
PendingScan pendingQueue[MAX_PENDING];
#define QUEUE_TIMEOUT_MS 30000

bool wifiEverConnected   = false;

// ═════════════════════════════════════════════════════════════════════════════
//  SECTION 3 — FORWARD DECLARATIONS
// ═════════════════════════════════════════════════════════════════════════════

void oledClear();
void oledCenterText(const char* text, int y, int textSize);
void oledShow(DisplayState state);
void buzzerSuccessTone();
void buzzerErrorTone();
void buzzerWarningTone();
void buzzerClick();
void wifiEnsureConnected();
int  httpPost(const char* endpoint, const String& jsonBody, String& responseBody);
int  httpGet(const char* endpoint, String& responseBody);
VerifyResult apiVerify(const String& cardUid);
void apiConsume(const String& cardUid);
void apiResetMeals();
void apiGetMealsLeft();
void apiSendSensor(const char* type, float value);
void apiHeartbeat();
void pushToQueue(const String& uid);
void pollRFID();
void pollGasSensor();
void pollIR();
void pollButtons();
void pollQueueTimeouts();
void pollHeartbeat();
void pollDisplayResult();
String formatUID(MFRC522& reader);

// ═════════════════════════════════════════════════════════════════════════════
//  SECTION 4 — DISPLAY & BUZZER
// ═════════════════════════════════════════════════════════════════════════════

void oledClear() {
  oled.clearDisplay();
  oled.setTextColor(SSD1306_WHITE);
}

void oledCenterText(const char* text, int y, int textSize) {
  oled.setTextSize(textSize);
  int16_t x1, y1;
  uint16_t w, h;
  oled.getTextBounds(text, 0, 0, &x1, &y1, &w, &h);
  int x = (OLED_WIDTH - (int)w) / 2;
  if (x < 0) x = 0;
  oled.setCursor(x, y);
  oled.print(text);
}

void oledShow3Lines(const char* top, const char* mid, const char* bot) {
  oledClear();
  oled.setTextSize(1); oled.setCursor(0, 0);   oled.println(top);
  oled.setTextSize(2); oled.setCursor(0, 20);  oled.println(mid);
  oled.setTextSize(1); oled.setCursor(0, 50);  oled.println(bot);
  oled.display();
}

void oledShow(DisplayState state) {
  displayState = state;
  switch (state) {
    case DISP_BOOT: oledShow3Lines("DineSync", "BOOTING", "v" FIRMWARE_VERSION); break;
    case DISP_WIFI_CONNECTING: oledShow3Lines("DineSync", "WiFi", "Connecting..."); break;
    case DISP_READY:
    case DISP_WAITING:
      oledClear();
      oledCenterText("DineSync", 5, 2);
      oledCenterText("Scan Card", 35, 1);
      oled.display();
      break;
    case DISP_READING_CARD: oledShow3Lines("DineSync", "READING", "Card detected"); break;
    case DISP_VERIFYING: oledShow3Lines("DineSync", "VERIFYING", "Please wait..."); break;
    case DISP_GAS_WARNING:
      oledClear();
      oledCenterText("! WARNING !", 5, 1);
      oledCenterText("GAS ALERT", 20, 2);
      oledCenterText("Press both buttons", 50, 1);
      oled.display();
      break;
    case DISP_OFFLINE_MODE: oledShow3Lines("DineSync", "OFFLINE", "No WiFi"); break;
    default: break;
  }
}

void buzzerBootTone() { tone(BUZZER_PIN, 1000, 80); delay(100); tone(BUZZER_PIN, 2000, 120); delay(140); noTone(BUZZER_PIN); }
void buzzerSuccessTone() { tone(BUZZER_PIN, 2000, 150); delay(170); noTone(BUZZER_PIN); }
void buzzerErrorTone() { tone(BUZZER_PIN, 400, 500); delay(520); noTone(BUZZER_PIN); }
void buzzerWarningTone() { tone(BUZZER_PIN, 1200, 150); }
void buzzerClick() { tone(BUZZER_PIN, 3000, 30); delay(35); noTone(BUZZER_PIN); }

// ═════════════════════════════════════════════════════════════════════════════
//  SECTION 5 — HTTP & API
// ═════════════════════════════════════════════════════════════════════════════

int httpPost(const char* endpoint, const String& jsonBody, String& responseBody) {
  if (WiFi.status() != WL_CONNECTED) return -1;
  HTTPClient http;
  http.begin(String(API_BASE_URL) + endpoint);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_API_KEY);
  http.setTimeout(HTTP_TIMEOUT_MS);
  int code = http.POST(jsonBody);
  if (code > 0) responseBody = http.getString();
  http.end();
  return code;
}

int httpGet(const char* endpoint, String& responseBody) {
  if (WiFi.status() != WL_CONNECTED) return -1;
  HTTPClient http;
  http.begin(String(API_BASE_URL) + endpoint);
  http.addHeader("X-Device-Key", DEVICE_API_KEY);
  http.setTimeout(HTTP_TIMEOUT_MS);
  int code = http.GET();
  if (code > 0) responseBody = http.getString();
  http.end();
  return code;
}

VerifyResult apiVerify(const String& cardUid) {
  VerifyResult result = {false, false, "", "", ""};
  DynamicJsonDocument reqDoc(1024);
  reqDoc["deviceId"] = DEVICE_ID;
  reqDoc["cardUid"]  = cardUid;
  String reqBody, respBody;
  serializeJson(reqDoc, reqBody);

  int code = httpPost("/api/device/verify", reqBody, respBody);
  if (code <= 0) { result.reason = "Network Error"; return result; }
  
  DynamicJsonDocument respDoc(1024);
  if (!deserializeJson(respDoc, respBody)) {
    result.ok = true;
    result.allowed = respDoc["allowed"] | false;
    result.studentName = respDoc["studentName"].as<String>();
    result.displayMessage = respDoc["displayMessage"].as<String>();
    result.reason = respDoc["reason"].as<String>();
  }
  return result;
}

void apiConsume(const String& cardUid) {
  DynamicJsonDocument doc(1024);
  doc["deviceId"] = DEVICE_ID;
  doc["cardUid"] = cardUid;
  String body, resp;
  serializeJson(doc, body);
  Serial.println("[API] consume -> sending: " + body);
  int code = httpPost("/api/device/consume", body, resp);
  Serial.printf("[API] consume -> HTTP %d : %s\n", code, resp.c_str());
}

void apiResetMeals() {
  // Must send deviceId in body for backend validation
  DynamicJsonDocument doc(256);
  doc["deviceId"] = DEVICE_ID;
  String body, resp;
  serializeJson(doc, body);
  int code = httpPost("/api/device/reset-meals", body, resp);
  Serial.printf("[API] reset-meals -> HTTP %d : %s\n", code, resp.c_str());
  oledClear();
  if (code == 200) {
    oledCenterText("Meals", 10, 2);
    oledCenterText("Reset!", 40, 2);
  } else {
    char errBuf[22];
    snprintf(errBuf, sizeof(errBuf), "FAIL (HTTP %d)", code);
    oledCenterText("Reset", 5, 2);
    oledCenterText(errBuf, 40, 1);
  }
  oled.display();
  displayState = DISP_INFO;
  displayResultAt = millis();
}

void apiGetMealsLeft() {
  // Backend requires deviceId in body (POST), cannot use GET
  DynamicJsonDocument reqDoc(256);
  reqDoc["deviceId"] = DEVICE_ID;
  String body, resp;
  serializeJson(reqDoc, body);
  int code = httpPost("/api/device/meals-left", body, resp);
  Serial.printf("[API] meals-left -> HTTP %d : %s\n", code, resp.c_str());
  oledClear();
  if (code == 200) {
    DynamicJsonDocument doc(512);
    DeserializationError err = deserializeJson(doc, resp);
    if (!err) {
      int left = doc["mealsLeft"] | -1;
      oledCenterText("Meals Left", 5, 1);
      char buf[12];
      snprintf(buf, sizeof(buf), "%d", left);
      oledCenterText(buf, 25, 3);
    } else {
      oledCenterText("Parse Err", 20, 1);
      Serial.println("[JSON] " + String(err.c_str()));
    }
  } else {
    char errBuf[22];
    snprintf(errBuf, sizeof(errBuf), "HTTP %d", code);
    oledCenterText("Net Error", 5, 1);
    oledCenterText(errBuf, 25, 1);
    oledCenterText("Check WiFi/API", 45, 1);
  }
  oled.display();
  displayState = DISP_INFO;
  displayResultAt = millis();
}

void apiSendSensor(const char* type, float value) {
  DynamicJsonDocument doc(1024);
  doc["deviceId"] = DEVICE_ID;
  doc["type"] = type;
  doc["value"] = value;
  String body, resp;
  serializeJson(doc, body);
  httpPost("/api/device/sensor", body, resp);
}

void apiHeartbeat() {
  DynamicJsonDocument doc(1024);
  doc["deviceId"] = DEVICE_ID;
  doc["firmwareVersion"] = FIRMWARE_VERSION;
  doc["uptime"] = millis() / 1000;
  String body, resp;
  serializeJson(doc, body);
  httpPost("/api/device/heartbeat", body, resp);
}

// ═════════════════════════════════════════════════════════════════════════════
//  SECTION 6 — RFID QUEUE
// ═════════════════════════════════════════════════════════════════════════════

void pushToQueue(const String& uid) {
  // Find empty slot
  for (int i=0; i<MAX_PENDING; i++) {
    if (!pendingQueue[i].active) {
      pendingQueue[i].cardUid = uid;
      pendingQueue[i].timestamp = millis();
      pendingQueue[i].active = true;
      Serial.println("[QUEUE] Added " + uid + " for IR wait.");
      return;
    }
  }
  Serial.println("[QUEUE] Full! Discarding oldest scan.");
  pendingQueue[0].cardUid = uid;
  pendingQueue[0].timestamp = millis();
}

void pollQueueTimeouts() {
  unsigned long now = millis();
  for (int i=0; i<MAX_PENDING; i++) {
    if (pendingQueue[i].active && (now - pendingQueue[i].timestamp > QUEUE_TIMEOUT_MS)) {
      pendingQueue[i].active = false;
      Serial.println("[QUEUE] 30s timeout for " + pendingQueue[i].cardUid);
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  SECTION 7 — POLLERS
// ═════════════════════════════════════════════════════════════════════════════

void pollRFID() {
  if (displayState == DISP_VERIFYING || displayState == DISP_GAS_WARNING) return;
  if (millis() - lastScanTime < SCAN_COOLDOWN_MS) return;

  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) return;

  lastScanTime = millis();
  oledShow(DISP_READING_CARD);
  buzzerClick();

  String uid = formatUID(rfid);
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
  
  Serial.println("Scanned RFID: " + uid);

  if (WiFi.status() != WL_CONNECTED) {
    oledShow(DISP_OFFLINE_MODE);
    buzzerErrorTone();
    displayResultAt = millis();
    return;
  }

  oledShow(DISP_VERIFYING);
  VerifyResult res = apiVerify(uid);
  
  if (res.allowed) {
    buzzerSuccessTone();
    oledClear();
    oledCenterText("APPROVED", 5, 2);
    oledCenterText(res.studentName.c_str(), 35, 2);
    oled.display();
    pushToQueue(uid);
  } else {
    buzzerErrorTone();
    oledClear();
    
    if (res.studentName.length() > 0) {
      oledCenterText(res.studentName.c_str(), 5, 2);
      if (res.reason.length() <= 21) {
        oledCenterText(res.reason.c_str(), 35, 1);
      } else {
        oled.setTextSize(1);
        oled.setCursor(0, 35); oled.println(res.reason.substring(0, 21));
        oled.setCursor(0, 47); oled.println(res.reason.substring(21, 42));
      }
    } else {
      oledCenterText("DENIED", 5, 2);
      if (res.reason.length() <= 21) {
        oledCenterText(res.reason.c_str(), 35, 1);
      } else {
        oled.setTextSize(1);
        oled.setCursor(0, 35); oled.println(res.reason.substring(0, 21));
        oled.setCursor(0, 47); oled.println(res.reason.substring(21, 42));
      }
    }
    oled.display();
  }

  displayState = DISP_INFO;
  displayResultAt = millis();
}

void pollIR() {
  // Read sensor — compare against configured active level
  bool reading = (digitalRead(IR_SENSOR_PIN) == IR_ACTIVE_LEVEL);
  
  // Debounce: only consider stable if unchanged for 50ms
  if (reading != irLast) {
    irDebounce = millis();
    irLast = reading;
  }
  
  if ((millis() - irDebounce) > 50) {
    if (reading != irStable) {
      irStable = reading;
      
      if (irStable) {
        // Rising edge (obstacle appeared): check queue
        Serial.println("[IR] Obstacle detected!");
        for (int i = 0; i < MAX_PENDING; i++) {
          if (pendingQueue[i].active) {
            Serial.println("[IR] Marking CONSUMED for " + pendingQueue[i].cardUid);
            apiConsume(pendingQueue[i].cardUid);
            pendingQueue[i].active = false;
            buzzerSuccessTone();
            break;
          }
        }
      } else {
        Serial.println("[IR] Obstacle cleared.");
      }
    }
  }
}

void pollButtons() {
  unsigned long now = millis();
  
  // SW1: Reset Meals
  bool s1 = digitalRead(SW1_PIN);
  if (s1 != sw1Last) sw1LastDebounce = now;
  if ((now - sw1LastDebounce) > BUTTON_DEBOUNCE_MS) {
    if (s1 == LOW && !sw1Pressed) {
      sw1Pressed = true;
      buzzerClick();
      apiResetMeals();
    }
    if (s1 == HIGH) sw1Pressed = false;
  }
  sw1Last = s1;

  // SW2: Meals Left
  bool s2 = digitalRead(SW2_PIN);
  if (s2 != sw2Last) sw2LastDebounce = now;
  if ((now - sw2LastDebounce) > BUTTON_DEBOUNCE_MS) {
    if (s2 == LOW && !sw2Pressed) {
      sw2Pressed = true;
      buzzerClick();
      apiGetMealsLeft();
    }
    if (s2 == HIGH) sw2Pressed = false;
  }
  sw2Last = s2;
}

void pollGasSensor() {
  unsigned long now = millis();
  
  // === CALIBRATION PHASE: sample every GAS_CALIBRATION_INTERVAL_MS for GAS_CALIBRATION_MS ===
  if (!gasCalibrated) {
    if (now - gasCalibStart < GAS_CALIBRATION_MS) {
      // Only sample at timed intervals, not every loop (avoids integer overflow)
      if (now - gasCalibLastSample >= GAS_CALIBRATION_INTERVAL_MS) {
        gasCalibLastSample = now;
        int raw = analogRead(GAS_SENSOR_PIN);
        gasCalibrationSum += raw;
        gasCalibrationCount++;
        Serial.printf("[GAS] Calibrating... sample %d = %d\n", gasCalibrationCount, raw);
      }
      return;
    }
    // Calibration complete
    gasBaseline = gasCalibrationCount > 0
      ? (int)(gasCalibrationSum / gasCalibrationCount)
      : analogRead(GAS_SENSOR_PIN);
    gasAlertThreshold = gasBaseline + GAS_THRESHOLD_OFFSET_RAW;
    gasCalibrated = true;
    Serial.printf("[GAS] Calibration done. Baseline=%d, Threshold=%d\n", gasBaseline, gasAlertThreshold);
    return;
  }

  // === POLLING PHASE ===
  if (now - lastGasPoll < GAS_POLL_INTERVAL_MS) return;
  lastGasPoll = now;

  int raw = analogRead(GAS_SENSOR_PIN);
  float ppm = (float)raw * 3.3f / 4095.0f * 3.0f * 100.0f;
  Serial.printf("[GAS] raw=%d, baseline=%d, threshold=%d, consecutive=%d\n",
                raw, gasBaseline, gasAlertThreshold, gasConsecutiveHigh);

  apiSendSensor("GAS", ppm);

  if (raw >= gasAlertThreshold) {
    gasConsecutiveHigh++;
    Serial.printf("[GAS] Above threshold! consecutive=%d\n", gasConsecutiveHigh);
    if (gasConsecutiveHigh >= GAS_CONSECUTIVE_READS) {
      oledShow(DISP_GAS_WARNING);
      Serial.println("[GAS] *** GAS LEAKAGE DETECTED — BLOCKING ALERT ***");
      // BLOCKING ALERT LOOP until BOTH buttons pressed
      while (true) {
        buzzerWarningTone();
        delay(100);
        noTone(BUZZER_PIN);
        delay(100);
        if (digitalRead(SW1_PIN) == LOW && digitalRead(SW2_PIN) == LOW) {
          gasConsecutiveHigh = 0;
          oledShow(DISP_WAITING);
          Serial.println("[GAS] Alert cleared by buttons.");
          break;
        }
      }
    }
  } else {
    if (gasConsecutiveHigh > 0) Serial.println("[GAS] Below threshold, resetting counter.");
    gasConsecutiveHigh = 0;
  }
}

void pollHeartbeat() {
  if (millis() - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeat = millis();
    apiHeartbeat();
  }
}

void pollDisplayResult() {
  if (displayResultAt > 0 && (millis() - displayResultAt >= DISPLAY_RESULT_MS)) {
    displayResultAt = 0;
    oledShow(DISP_WAITING);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  SECTION 8 — UTILS & SETUP
// ═════════════════════════════════════════════════════════════════════════════

String formatUID(MFRC522& reader) {
  String uid = "";
  for (byte i = 0; i < reader.uid.size; i++) {
    if (reader.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(reader.uid.uidByte[i], HEX);
    if (i < reader.uid.size - 1) uid += " ";
  }
  uid.toUpperCase();
  return uid;
}

void wifiEnsureConnected() {
  if (WiFi.status() == WL_CONNECTED) {
    if (displayState == DISP_OFFLINE_MODE) oledShow(DISP_WAITING);
    return;
  }
  if (millis() - lastWifiRetry < WIFI_RECONNECT_MS) return;
  lastWifiRetry = millis();
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  if (displayState == DISP_WAITING) oledShow(DISP_OFFLINE_MODE);
}

void setup() {
  Serial.begin(115200);
  
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(IR_SENSOR_PIN, INPUT_PULLUP);
  pinMode(SW1_PIN, INPUT_PULLUP);
  pinMode(SW2_PIN, INPUT_PULLUP);

  SPI.begin();
  rfid.PCD_Init();
  Wire.begin();
  oled.begin(SSD1306_SWITCHCAPVCC, OLED_I2C_ADDR);
  
  oledShow(DISP_BOOT);
  buzzerBootTone();

  for (int i=0; i<MAX_PENDING; i++) pendingQueue[i].active = false;

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  gasCalibStart = millis();
  lastHeartbeat = millis();
  oledShow(DISP_WAITING);
}

void loop() {
  wifiEnsureConnected();
  pollButtons();
  pollGasSensor();
  pollIR();
  pollRFID();
  pollQueueTimeouts();
  pollHeartbeat();
  pollDisplayResult();
}
