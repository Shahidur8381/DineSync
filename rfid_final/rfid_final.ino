#include <SPI.h>
#include <MFRC522.h>

#define SS_PIN 5
#define RST_PIN 22

MFRC522 mfrc522(SS_PIN, RST_PIN);

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("Initializing RFID Reader...");

  // Default ESP32 VSPI Pins
  // SCK  = 18
  // MISO = 19
  // MOSI = 23
  // SS   = 5

  SPI.begin();

  mfrc522.PCD_Init();

  delay(100);

  Serial.println("Reader Details:");
  mfrc522.PCD_DumpVersionToSerial();

  Serial.println();
  Serial.println("Scan a card...");
}

void loop() {

  if (!mfrc522.PICC_IsNewCardPresent()) {
    return;
  }

  if (!mfrc522.PICC_ReadCardSerial()) {
    return;
  }

  Serial.print("UID: ");

  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10)
      Serial.print("0");

    Serial.print(mfrc522.uid.uidByte[i], HEX);
    Serial.print(" ");
  }

  Serial.println();

  Serial.println("Card detected!");

  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
}