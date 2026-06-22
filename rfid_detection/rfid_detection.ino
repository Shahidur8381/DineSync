#include <SPI.h>
#include <MFRC522.h>

#define SS_PIN 5
#define RST_PIN 4

MFRC522 mfrc522(SS_PIN, RST_PIN);

void setup() {
  Serial.begin(115200);

  SPI.begin(18, 19, 23, 5);

  mfrc522.PCD_Init();

  Serial.println("Reader Details:");

  mfrc522.PCD_DumpVersionToSerial();
}

void loop() {
}