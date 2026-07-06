/**
 * Lightweight validation — no external HTML parser dependency needed.
 * Confirms the merge step actually completed and the file is deploy-safe.
 */
function validateHtml(html) {
  const errors = [];

  if (!/<meta\s+name=["']viewport["']/i.test(html)) {
    errors.push('Missing mobile viewport meta tag');
  }
  if (!/<title>.*<\/title>/i.test(html)) {
    errors.push('Missing <title> tag');
  }

  // Any {{PLACEHOLDER}} left unreplaced means the content merge failed silently
  const leftoverPlaceholders = html.match(/{{\s*[A-Z_]+\s*}}/g);
  if (leftoverPlaceholders) {
    errors.push(`Unreplaced placeholders: ${[...new Set(leftoverPlaceholders)].join(', ')}`);
  }

  // Rough tag-balance check on the most common containers
  ['div', 'section', 'header', 'footer'].forEach((tag) => {
    const opens = (html.match(new RegExp(`<${tag}[\\s>]`, 'g')) || []).length;
    const closes = (html.match(new RegExp(`</${tag}>`, 'g')) || []).length;
    if (opens !== closes) errors.push(`Unbalanced <${tag}> tags (${opens} open, ${closes} close)`);
  });

  return { valid: errors.length === 0, errors };
}

module.exports = { validateHtml };
