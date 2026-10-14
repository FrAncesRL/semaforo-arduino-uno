// Refleja el status del ESP32 (vía GET /api/status) en el diseño tipo Figma
const $ = (id) => document.getElementById(id);
const els = {
  pill: $('statusPill'),
  rojo: $('lightRojo'), amarillo: $('lightAmarillo'), verde: $('lightVerde'),
  name: $('stateName'), seconds: $('seconds'),
  bar: $('bar'), conn: $('connLine'),
};

const BAR = { ROJO: '#c1272d', AMARILLO: '#d9b400', VERDE: '#4d9c2a' };
let last = { color: 'ROJO', total: 20, remaining: 20 };
let lastFetch = Date.now();

// Cuenta regresiva fluida entre polls
setInterval(() => {
  const elapsed = (Date.now() - lastFetch) / 1000;
  const show = Math.max(0, Math.ceil(last.remaining - elapsed));
  els.seconds.textContent = show;
  els.bar.style.width = (last.total > 0 ? (show / last.total) * 100 : 0) + '%';
}, 200);

function render(s) {
  last = s;
  lastFetch = Date.now();
  const c = s.color;

  els.rojo.classList.toggle('on', c === 'ROJO');
  els.amarillo.classList.toggle('on', c === 'AMARILLO');
  els.verde.classList.toggle('on', c === 'VERDE');

  els.name.textContent = c;
  els.bar.style.background = BAR[c] || BAR.ROJO;
  els.pill.textContent = 'Status: ' + c;

  els.conn.textContent = s.live
    ? '● ESP32 EN VIVO'
    : '● SIMULADO — esperando ESP32 en POST /api/status…';
}

async function poll() {
  try {
    const r = await fetch('/api/status');
    if (!r.ok) throw new Error('http ' + r.status);
    render(await r.json());
  } catch {
    els.conn.textContent = '● sin conexión al servidor (¿ejecutaste node server.js?)';
  }
}

poll();
setInterval(poll, 500);
