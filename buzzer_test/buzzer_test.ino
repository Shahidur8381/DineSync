#define BUZZER 27

void setup() {
  pinMode(BUZZER, OUTPUT);
}

void loop() {
  digitalWrite(BUZZER, HIGH);
  delay(500);

  digitalWrite(BUZZER, LOW);
  delay(500);
}