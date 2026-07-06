const express = require('express');
const Project = require('../models/Project');
const { runPipeline } = require('../services/pipelineService');
const { streamProjectZip } = require('../services/zipService');
const { generateRobotsTxt, generateSitemap } = require('../services/seoService');

const router = express.Router();

// POST /api/generate — kicks off the pipeline, returns immediately with a projectId
router.post('/generate', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'A "prompt" string is required' });
    }

    const project = await Project.create({
      prompt: prompt.trim(),
      category: 'default',
      slug: `pending-${Date.now()}`,
      status: 'queued',
      steps: [{ label: 'queued', status: 'done', at: new Date() }]
    });

    runPipeline(project._id); // fire-and-forget; frontend polls /status

    res.status(202).json({ projectId: project._id, status: project.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/project/:id/status — lightweight poll target
router.get('/project/:id/status', async (req, res) => {
  const project = await Project.findById(req.params.id).select('status steps error liveUrl repoUrl slug');
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json(project);
});

// GET /api/projects — history list
router.get('/projects', async (req, res) => {
  const projects = await Project.find()
    .select('prompt category slug status liveUrl repoUrl businessName createdAt')
    .sort({ createdAt: -1 })
    .limit(100);
  res.json(projects);
});

// GET /api/project/:id — full detail
router.get('/project/:id', async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json(project);
});

// DELETE /api/project/:id
router.delete('/project/:id', async (req, res) => {
  const project = await Project.findByIdAndDelete(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  // Note: this removes the local record only. Delete the GitHub repo / Vercel
  // project separately via their dashboards (or extend this route to call
  // their delete APIs) if you want full cleanup.
  res.json({ deleted: true });
});

// GET /api/project/:id/download — streams a ZIP of the generated site
router.get('/project/:id/download', async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project || !project.html) {
    return res.status(404).json({ error: 'Project not found or not yet generated' });
  }

  const liveUrl = project.liveUrl || `https://${project.slug}.vercel.app`;
  const files = {
    'index.html': project.html,
    'robots.txt': generateRobotsTxt(liveUrl),
    'sitemap.xml': generateSitemap(liveUrl)
  };

  streamProjectZip(res, project.slug, files);
});

module.exports = router;
