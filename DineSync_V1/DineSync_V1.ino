#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SS_PIN 5
#define RST_PIN 4
#define BUZZER_PIN 27

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

MFRC522 mfrc522(SS_PIN, RST_PIN);

Adafruit_SSD1306 display(
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  &Wire,
  -1
);

void showMessage3(String line1, String line2, String line3) {

  display.clearDisplay();

  display.setTextColor(SSD1306_WHITE);

  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println(line1);

  display.setTextSize(2);
  display.setCursor(0, 20);
  display.println(line2);

  display.setTextSize(1);
  display.setCursor(0, 50);
  display.println(line3);

  display.display();
}

String getCardOwner(String uid) {

  if (uid == "23 10 63 A6")
    return "Shawon";

  if (uid == "1A 6F C8 01")
    return "Siam";

  if (uid == "D2 92 39 03")
    return "Shahidur";

  if (uid == "C3 DC D8 09")
    return "Shuvro";

  return "";
}

void showIdleScreen() {
  showMessage3(
    "DineSync",
    "SCAN",
    "Present RFID Card"
  );
}

void setup() {

  Serial.begin(115200);

  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  SPI.begin();
  mfrc522.PCD_Init();

  Wire.begin();

  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("OLED Failed");
    while (true);
  }

  showIdleScreen();
}

void loop() {

  if (!mfrc522.PICC_IsNewCardPresent())
    return;

  if (!mfrc522.PICC_ReadCardSerial())
    return;

  String uid = "";

  for (byte i = 0; i < mfrc522.uid.size; i++) {

    if (mfrc522.uid.uidByte[i] < 0x10)
      uid += "0";

    uid += String(mfrc522.uid.uidByte[i], HEX);

    if (i < mfrc522.uid.size - 1)
      uid += " ";
  }

  uid.toUpperCase();

  Serial.print("UID: ");
  Serial.println(uid);

  String owner = getCardOwner(uid);

  // ACCESS GRANTED
  if (owner == "Shawon" || owner == "Shahidur") {

    Serial.println("ACCESS GRANTED");
    Serial.println("Welcome " + owner);

    showMessage3(
      "Authentication",
      "GRANTED",
      "Welcome " + owner
    );

    digitalWrite(BUZZER_PIN, HIGH);
    delay(3000);
    digitalWrite(BUZZER_PIN, LOW);
  }

  // ACCESS DENIED
  else if (owner == "Siam" || owner == "Shuvro") {

    Serial.println("ACCESS DENIED");
    Serial.println(owner);

    showMessage3(
      "Authentication",
      "DENIED",
      "Get Out " + owner
    );

    unsigned long startTime = millis();

    while (millis() - startTime < 3000) {

      digitalWrite(BUZZER_PIN, HIGH);
      delay(200);

      digitalWrite(BUZZER_PIN, LOW);
      delay(200);
    }
  }

  // UNKNOWN CARD
  else {

    Serial.println("UNKNOWN CARD");

    showMessage3(
      "Authentication",
      "UNKNOWN",
      "Card Not Found"
    );

    for (int i = 0; i < 5; i++) {

      digitalWrite(BUZZER_PIN, HIGH);
      delay(100);

      digitalWrite(BUZZER_PIN, LOW);
      delay(100);
    }
  }

  delay(1000);

  showIdleScreen();

  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
}