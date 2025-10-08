// routes/projects.js
const express = require('express');
const auth = require('../middlewares/authMiddleware');
const Project = require('../models/Project');
const router = express.Router();

// Save project route
router.post('/save', auth, async (req, res) => {
  try {
    const { html, css, js, name } = req.body;
    
    // Validate required fields
    if (!html && !css && !js) {
      return res.status(400).send({ error: 'At least one of HTML, CSS, or JS is required' });
    }

    // Create project data
    const projectData = {
      html: html || '',
      css: css || '',
      js: js || '',
      name: name || 'Untitled Project',
      user: req.user.id,
      updatedAt: new Date()
    };

    const project = new Project(projectData);
    await project.save();
    
    res.status(201).json({
      message: 'Project saved successfully',
      project: {
        id: project._id,
        name: project.name,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      }
    });
  } catch (err) {
    console.error('Project save error:', err);
    res.status(500).send({ error: 'Failed to save project. Please try again.' });
  }
});

module.exports = router;