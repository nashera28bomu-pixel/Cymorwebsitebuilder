const fetch = require('node-fetch');

const API = 'https://api.vercel.com';

function teamQuery() {
  const teamId = process.env.VERCEL_TEAM_ID;
  return teamId ? `?teamId=${teamId}` : '';
}

function authHeaders() {
  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error('VERCEL_TOKEN is not set');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

/**
 * Deploys straight from file contents (no GitHub integration required),
 * which is what lets this work without OAuth-ing into a user's own Vercel account.
 * files: { "index.html": "...", "robots.txt": "...", "sitemap.xml": "..." }
 */
async function deploySite(slug, files) {
  const body = {
    name: slug,
    target: 'production',
    files: Object.entries(files).map(([file, content]) => ({
      file,
      data: Buffer.from(content, 'utf-8').toString('base64'),
      encoding: 'base64'
    })),
    projectSettings: { framework: null }
  };

  const res = await fetch(`${API}/v13/deployments${teamQuery()}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Vercel deployment failed (${res.status}): ${err}`);
  }

  return res.json(); // { id, url, readyState, ... }
}

async function getDeploymentStatus(deploymentId) {
  const res = await fetch(`${API}/v13/deployments/${deploymentId}${teamQuery()}`, {
    headers: authHeaders()
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Vercel status check failed (${res.status}): ${err}`);
  }
  return res.json();
}

/** Polls until the deployment is READY or ERROR, or timeoutMs elapses */
async function waitForDeployment(deploymentId, { timeoutMs = 90000, intervalMs = 3000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const status = await getDeploymentStatus(deploymentId);
    if (status.readyState === 'READY') return status;
    if (status.readyState === 'ERROR') {
      throw new Error(`Vercel deployment errored: ${JSON.stringify(status.errorMessage || status)}`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error('Vercel deployment timed out waiting for READY state');
}

module.exports = { deploySite, waitForDeployment };
