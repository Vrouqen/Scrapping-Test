const express = require('express');
// Importamos ambas funciones
const { scrapeInstagramProfile, scrapeInstagramPosts, scrapeInstagramRecentComments } = require('../scrapers/instagramScraper');

const router = express.Router();

// --- ENDPOINT 1
router.post('/instagram-profile', async (req, res, next) => {
  try {
    const { username, url } = req.body || {};

    if (!username && !url) {
      return res.status(400).json({ ok: false, message: 'Debes enviar username o url en el body' });
    }

    const result = await scrapeInstagramProfile({ username, url });
    return res.json({ ok: true, data: result });
  } catch (error) {
    return next(error);
  }
});

// --- ENDPOINT 2
router.post('/instagram-posts', async (req, res, next) => {
  try {
    const { username, url } = req.body || {};

    if (!username && !url) {
      return res.status(400).json({ ok: false, message: 'Debes enviar username o url en el body' });
    }

    const result = await scrapeInstagramPosts({ username, url });
    return res.json({ ok: true, data: result });

  } catch (error) {
    // ⚠️ MANEJO DEL ERROR CONTROLADO
    if (error.message === 'NO_POSTS_FOUND') {
      return res.status(404).json({
        ok: false,
        errorCode: 'NO_POSTS_FOUND',
        message: 'No se encontraron publicaciones públicas en este perfil o la cuenta es privada/bloqueada.'
      });
    }
    
    // Si es otro tipo de error (como falta de internet), que pase al manejador general
    return next(error);
  }
});

// --- ENDPOINT 3
router.post('/instagram-comments', async (req, res, next) => {
  try {
    const { username, url } = req.body || {};

    if (!username && !url) {
      return res.status(400).json({ ok: false, message: 'Debes enviar username o url en el body' });
    }

    const result = await scrapeInstagramRecentComments({ username, url });
    return res.json({ ok: true, data: result });
  } catch (error) {
    if (error.message === 'NO_POSTS_FOUND') {
      return res.status(404).json({
        ok: false,
        errorCode: 'NO_POSTS_FOUND',
        message: 'No se encontraron publicaciones públicas en este perfil o la cuenta es privada/bloqueada.'
      });
    }

    return next(error);
  }
});

module.exports = router;