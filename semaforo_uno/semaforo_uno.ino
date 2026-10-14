/*
  Semaforo con ARDUINO UNO (sin WiFi)
  -----------------------------------
  Pines y duraciones:
    ROJO     -> pin 2, 20 segundos
    AMARILLO -> pin 4,  5 segundos
    VERDE    -> pin 5, 15 segundos

  Como el UNO no tiene WiFi, la señal sale por el cable USB
  (puerto Serial) y el script bridge_serial.js la reenvía
  al servidor web.

  Formato enviado cada segundo, ej:
    STATUS VERDE 15 15
    STATUS VERDE 14 15
    ...

  Conexiones: cada LED con resistencia de 220 ohm a GND.
*/

const int PIN_ROJO = 2;
const int PIN_AMARILLO = 4;
const int PIN_VERDE = 5;

const int DUR_ROJO = 20;
const int DUR_AMARILLO = 5;
const int DUR_VERDE = 15;

void encenderSolo(int pinActivo) {
  digitalWrite(PIN_ROJO, pinActivo == PIN_ROJO ? HIGH : LOW);
  digitalWrite(PIN_AMARILLO, pinActivo == PIN_AMARILLO ? HIGH : LOW);
  digitalWrite(PIN_VERDE, pinActivo == PIN_VERDE ? HIGH : LOW);
}

// Manda la señal por USB: STATUS <COLOR> <restantes> <total>
void reportar(const char* color, int restantes, int total) {
  Serial.print("STATUS ");
  Serial.print(color);
  Serial.print(" ");
  Serial.print(restantes);
  Serial.print(" ");
  Serial.println(total);
}

// Mantiene un color N segundos, avisando cada segundo
void mostrarColor(const char* color, int pin, int segundos) {
  encenderSolo(pin);
  for (int quedan = segundos; quedan > 0; quedan--) {
    reportar(color, quedan, segundos);
    delay(1000);
  }
}

void setup() {
  Serial.begin(9600);
  pinMode(PIN_ROJO, OUTPUT);
  pinMode(PIN_AMARILLO, OUTPUT);
  pinMode(PIN_VERDE, OUTPUT);
  encenderSolo(-1); // todo apagado al inicio
  delay(500);
  Serial.println("UNO listo. Formato: STATUS <COLOR> <restantes> <total>");
}

void loop() {
  mostrarColor("VERDE", PIN_VERDE, DUR_VERDE);
  mostrarColor("AMARILLO", PIN_AMARILLO, DUR_AMARILLO);
  mostrarColor("ROJO", PIN_ROJO, DUR_ROJO);
}
