# Semáforo + Página web (réplica del Figma)

Diseño: fondo blanco, semáforo vertical gris con poste y píldora "Status" a la derecha, como en tu Figma.

## Estructura

```
wok/
  server.js                 → servidor (Node.js, sin dependencias)
  bridge_serial.js          → puente USB→web para Arduino UNO
  public/
    index.html / style.css / app.js   → página web
  semaforo_uno/
    semaforo_uno.ino        → código para ARDUINO UNO (usa este)
  semaforo_esp32/
    semaforo_esp32.ino      → código para ESP32 (solo si usas ESP32)
```

## Opción A: Arduino UNO (tu caso)

El UNO no tiene WiFi, así que la señal viaja por el cable USB y un script la reenvía al servidor.

1. **Sube el código al UNO:** abre `semaforo_uno/semaforo_uno.ino` en Arduino IDE,
   selecciona placa "Arduino Uno" y el puerto (Herramientas > Puerto), y súbelo.
   No uses el archivo de `semaforo_esp32/` (ese es solo para ESP32 y por eso te daba
   el error `WiFi.h: No such file or directory`).
2. **Conexiones:** ROJO→pin 2, AMARILLO→pin 4, VERDE→pin 5 (cada LED con resistencia 220Ω a GND).
3. **Instala Node.js LTS:** https://nodejs.org
4. **En esta carpeta, instala el puente serial (una sola vez):**
   ```powershell
   npm install serialport @serialport/parser-readline
   ```
5. **Abre dos terminales:**
   ```powershell
   node server.js
   ```
   ```powershell
   node bridge_serial.js COM3
   ```
   Cambia `COM3` por tu puerto (lo ves en Arduino IDE > Herramientas > Puerto).
   Si lo omites, intenta detectarlo solo.
6. **Abre:** http://localhost:3000 — la página pasa a "ESP32 EN VIVO"
   (con el UNO dirá lo mismo: dato real en vivo) y el foco activo + cuenta
   regresiva siguen al hardware.

## Opción B: ESP32 (si algún día lo usas)

Usa `semaforo_esp32/semaforo_esp32.ino`, edita `WIFI_SSID`, `WIFI_PASS` y
`SERVER_URL` (IP de este equipo), súelo a la placa ESP32 y corre solo `node server.js`.
No necesitas el puente.

## Probar sin hardware

Con solo `node server.js` la web corre en modo SIMULADO con los mismos
tiempos (rojo 20s / amarillo 5s / verde 15s).
