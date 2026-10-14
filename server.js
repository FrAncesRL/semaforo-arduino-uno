// Servidor sencillo para el semáforo ESP32.
// Sin dependencias: solo usa módulos integrados de Node.js.
// Uso:
//   1. Instala Node.js LTS (https://nodejs.org)
//   2. En esta carpeta ejecuta:  node server.js
//   3. Abre en el navegador:    http://localhost:3000
//   4. En el .ino configura SERVER_URL con la IP de este equipo, ej:
//      http://192.168.1.50:3000/api/status

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// Duraciones oficiales (deben coincidir con el .ino)
const DURATIONS = { ROJO: 20, AMARILLO: 5, VERDE: 15 };
// Orden del ciclo
const CYCLE = ['VERDE', 'AMARILLO', 'ROJO'];

// Estado en memoria
let state = {
  color: 'ROJO',       // ROJO | AMARILLO | VERDE
  total: DURATIONS.ROJO,
  remaining: DURATIONS.ROJO, // valor reportado por el ESP32
  lastUpdate: Date.now(),    // cuándo llegó el último POST
  source: 'sim',             // 'sim' (simulado) | 'esp32' (en vivo)
};

let simTimer = null;

function nextColor(c) {
  const i = CYCLE.indexOf(c);
  return CYCLE[(i + 1) % CYCLE.length];
}

// --- Modo simulación: avanza solo hasta que el ESP32 real se conecta ---
function startSimulation() {
  if (simTimer) return;
  simTimer = setInterval(() => {
    if (state.source === 'esp32' && Date.now() - state.lastUpdate < 6000) return; // hay ESP32 vivo, pausar sim
    if (state.source === 'esp32' && Date.now() - state.lastUpdate >= 6000) {
      state.source = 'sim'; // se perdió el ESP32, volver a simular
      console.log('[server] ESP32 perdido, volviendo a simulación');
    }
    state.remaining -= 1;
    if (state.remaining <= 0) {
      state.color = nextColor(state.color);
      state.total = DURATIONS[state.color];
      state.remaining = state.total;
      console.log(`[sim] -> ${state.color}`);
    }
  }, 1000);
}

// Calcula la cuenta regresiva "en vivo" descontando el tiempo desde el último POST
function publicStatus() {
  const now = Date.now();
  const elapsedSec = Math.floor((now - state.lastUpdate) / 1000);
  const esp32Alive = state.source === 'esp32' && elapsedSec < 6;
  // Si es ESP32 en vivo, descontamos lo transcurrido; si es sim, el valor ya baja solo
  const liveRemaining = state.source === 'esp32'
    ? Math.max(0, state.remaining - elapsedSec)
    : Math.max(0, state.remaining);
  return {
    color: state.color,
    total: state.total,
    remaining: liveRemaining,
    durations: DURATIONS,
    pins: { ROJO: 2, AMARILLO: 4, VERDE: 5 },
    connected: state.source === 'esp32' ? esp32Alive : true,
    live: esp32Alive,               // true = dato real del ESP32
    source: esp32Alive ? 'esp32' : 'sim',
    lastUpdate: state.lastUpdate,
    now,
  };
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function serveStatic(req, res) {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.normalize(path.join(PUBLIC_DIR, urlPath));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'text/plain' });
    res.end(data);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  // CORS (por si la página se abre desde otro puerto)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.url.startsWith('/api/status') && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(publicStatus()));
    return;
  }

  if (req.url.startsWith('/api/status') && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const data = JSON.parse(body || '{}');
      // Acepta: { "color": "ROJO", "remaining": 12 } o { "state": "ROJO", ... }
      const raw = String(data.color || data.state || '').toUpperCase();
      if (!DURATIONS[raw]) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'color inválido, usa ROJO, AMARILLO o VERDE' }));
        return;
      }
      const remaining = Number.isFinite(+data.remaining) ? Math.max(0, Math.round(+data.remaining)) : DURATIONS[raw];
      const total = Number.isFinite(+data.total) ? Math.round(+data.total) : (DURATIONS[raw] || remaining);
      state = { color: raw, total, remaining, lastUpdate: Date.now(), source: 'esp32' };
      console.log(`[esp32] ${raw} quedan ${remaining}s`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, ...publicStatus() }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'JSON inválido' }));
    }
    return;
  }

  if (req.url.startsWith('/api/')) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'ruta no encontrada' }));
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Servidor semáforo en http://localhost:${PORT}`);
  console.log('Esperando al ESP32 en POST /api/status ... (mientras tanto se simula)');
  startSimulation();
});
