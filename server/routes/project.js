// routes/projects.js
const express = require('express');
const auth = require('../middlewares/authMiddleware');
const Project = require('../models/Project');
const router = express.Router();

// Save project route
router.post('/save', auth, async (req, res) => {
    //console.log('Saving project:', req.body);
  try {
    const project = new Project({
      ...req.body,
      user: req.user.id
    });

    await project.save();
    res.status(201).send(project);
  } catch (err) {
    res.status(400).send({ error: 'Saving failed' });
  }
});

module.exports = router;