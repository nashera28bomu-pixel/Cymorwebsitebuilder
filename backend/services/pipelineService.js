const { customAlphabet } = require('nanoid');
// Lowercase alphanumeric only — the default nanoid alphabet includes '-' and '_',
// which can collide with hyphens in the slugified name and produce sequences
// like '---' that Vercel's project-name validator rejects.
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 6);
const Project = require('../models/Project');
const { classifyCategory, generateContent } = require('./aiService');
const { mergeContent } = require('./generatorService');
const { validateHtml } = require('./validationService');
const { generateRobotsTxt, generateSitemap } = require('./seoService');
const { commitSite } = require('./githubService');
const { deploySite, waitForDeployment } = require('./deployService');

const STEP_LABELS = [
  'classifying',
  'writing_content',
  'validating',
  'committing',
  'deploying',
  'deployed'
];

async function setStatus(project, status, error) {
  project.status = status;
  if (error) project.error = error;
  project.steps.push({ label: status, status: error ? 'failed' : 'done', at: new Date() });
  await project.save();
}

/** Simple in-memory concurrency gate — enough at solo/early-user scale, keeps Gemini/Vercel usage bounded */
let activeJobs = 0;
const queue = [];
const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT_GENERATIONS || '3', 10);

function scheduleJob(fn) {
  queue.push(fn);
  drainQueue();
}

async function drainQueue() {
  if (activeJobs >= MAX_CONCURRENT || queue.length === 0) return;
  const job = queue.shift();
  activeJobs += 1;
  try {
    await job();
  } finally {
    activeJobs -= 1;
    drainQueue();
  }
}

/** Kicks off generation for a project that's already been saved with status "queued" */
function runPipeline(projectId) {
  scheduleJob(() => executePipeline(projectId));
}

async function executePipeline(projectId) {
  const project = await Project.findById(projectId);
  if (!project) return;

  try {
    await setStatus(project, 'classifying');
    const category = await classifyCategory(project.prompt);
    project.category = category;

    await setStatus(project, 'writing_content');
    const content = await generateContent(project.prompt, category);
    project.businessName = content.businessName;

    const html = mergeContent(category, content);

    await setStatus(project, 'validating');
    const { valid, errors } = validateHtml(html);
    if (!valid) throw new Error(`Validation failed: ${errors.join('; ')}`);

    const namePart = (content.businessNameShort || category)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    const slug = `cymor-${namePart}-${nanoid()}`;
    project.slug = slug;
    project.html = html;

    await setStatus(project, 'committing');
    const files = {
      'index.html': html,
      'robots.txt': generateRobotsTxt(`https://${slug}.vercel.app`),
      'sitemap.xml': generateSitemap(`https://${slug}.vercel.app`)
    };
    const { repoUrl } = await commitSite(slug, files);
    project.repoUrl = repoUrl;

    await setStatus(project, 'deploying');
    const deployment = await deploySite(slug, files);
    const finalStatus = await waitForDeployment(deployment.id);
    project.liveUrl = `https://${finalStatus.url}`;

    await setStatus(project, 'deployed');
  } catch (err) {
    await setStatus(project, 'failed', err.message);
  }
}

module.exports = { runPipeline, STEP_LABELS };
