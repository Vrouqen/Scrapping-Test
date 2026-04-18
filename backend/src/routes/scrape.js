const express = require('express');
const { scrapeInstagramProfile } = require('../scrapers/instagramScraper');

const router = express.Router();

router.post('/instagram-profile', async (req, res, next) => {
  try {
    const { username, url } = req.body || {};

    if (!username && !url) {
      return res.status(400).json({
        ok: false,
        message: 'Debes enviar username o url en el body'
      });
    }

    const result = await scrapeInstagramProfile({ username, url });

    return res.json({
      ok: true,
      data: result
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
