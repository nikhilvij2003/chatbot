const router = require('express').Router();
const { generatePresentation } = require('../controllers/pptController');
const { UnsplashAPI } = require('../config/unsplash');

router.get('/unsplash', async (req, res) => {
  try {
    console.log("In unsplash route --- ppt.js")
    const imageUrl = await UnsplashAPI.getPhoto(req.query.keyword);
    res.json({ url: imageUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/generate', generatePresentation);
module.exports = router;