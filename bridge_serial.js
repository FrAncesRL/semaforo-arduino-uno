// Puente Serial (Arduino UNO por USB) -> servidor web.
// Lee lo que el UNO manda por Serial ("STATUS ROJO 12 20")
// y lo reenvía con POST a http://localhost:3000/api/status
//
// Instalación (una sola vez):
//   npm install serialport @serialport/parser-readline
//
// Uso:
//   node bridge_serial.js COM3        (Windows, cambia COM3 por tu puerto)
//   node bridge_serial.js             (intenta detectar el Arduino solo)
//
// El puerto se ve en Arduino IDE: Herramientas > Puerto.

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000/api/status';
const BAUD = 9600;

async function findArduino() {
  const ports = await SerialPort.list();
  if (!ports.length) return null;
  const hit =
    ports.find((p) => /arduino/i.test(`${p.manufacturer} ${p.friendlyName}`)) ||
    ports.find((p) => /ch340|ch341|cp210|ftdi|usb/i.test(`${p.manufacturer} ${p.friendlyName} ${p.path}`));
  console.log('Puertos disponibles:');
  ports.forEach((p) => console.log(`  - ${p.path}  (${p.manufacturer || 'sin fabricante'} ${p.friendlyName || ''})`));
  return hit ? hit.path : null;
}

async function main() {
  let portName = process.argv[2] || (await findArduino());
  if (!portName) {
    console.error('No se encontró ningún puerto. Conecta el UNO y pasa el puerto: node bridge_serial.js COM3');
    process.exit(1);
  }
  console.log(`Abriendo ${portName} a ${BAUD} baudios...`);
  const port = new SerialPort({ path: portName, baudRate: BAUD });
  const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

  port.on('open', () => console.log(`Listo. Reenviando a ${SERVER_URL}`));
  port.on('error', (e) => { console.error('Error serial:', e.message); process.exit(1); });

  parser.on('data', async (line) => {
    const text = String(line).trim();
    // Formato esperado: STATUS ROJO 12 20
    const m = text.match(/^STATUS\s+(ROJO|AMARILLO|VERDE)\s+(\d+)\s+(\d+)/i);
    if (!m) return; // ignora otras líneas
    const color = m[1].toUpperCase();
    const remaining = parseInt(m[2], 10);
    const total = parseInt(m[3], 10);
    try {
      const r = await fetch(SERVER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color, remaining, total }),
      });
      console.log(`UNO -> ${color} quedan ${remaining}s (server ${r.status})`);
    } catch (e) {
      console.error('No pude contactar al servidor. ¿Ejecutaste node server.js? ->', e.message);
    }
  });
}

main();
