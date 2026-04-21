const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const scrapeRouter = require('./routes/scrape');

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 4000;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'instagram-scrape-backend' });
});

app.use('/api/scrape', scrapeRouter);

app.use((err, _req, res, _next) => {
  console.error('[Unhandled Error]', err);

  res.status(500).json({
    ok: false,
    message: 'Error interno del servidor',
    error: err.message || 'unknown_error'
  });
});

const server = app.listen(port, () => {
  console.log(`Backend escuchando en http://localhost:${port}`);
});

// ESTO QUITA EL TIMEOUT DEL SERVIDOR (0 = infinito)
server.setTimeout(0); 
server.keepAliveTimeout = 0;
