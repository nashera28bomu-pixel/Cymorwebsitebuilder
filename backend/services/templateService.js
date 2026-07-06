const fs = require('fs');
const path = require('path');

// v1 ships one deeply-polished template (SaaS). Add more files here as they're built —
// e.g. templates/restaurant.html — and register them in TEMPLATE_MAP.
// Every category currently maps to the SaaS template's structure (hero/features/
// testimonials/faq/contact/footer) since the placeholder schema is shared;
// only the AI-generated copy changes per category for now.
const TEMPLATE_MAP = {
  saas: 'saas.html',
  startup: 'saas.html',
  agency: 'saas.html',
  portfolio: 'saas.html',
  business: 'saas.html',
  restaurant: 'saas.html',
  gym: 'saas.html',
  school: 'saas.html',
  ecommerce: 'saas.html',
  default: 'saas.html'
};

function getTemplate(category) {
  const file = TEMPLATE_MAP[category] || TEMPLATE_MAP.default;
  const fullPath = path.join(__dirname, '..', 'templates', file);
  return fs.readFileSync(fullPath, 'utf-8');
}

function listCategories() {
  return Object.keys(TEMPLATE_MAP).filter((k) => k !== 'default');
}

module.exports = { getTemplate, listCategories };
