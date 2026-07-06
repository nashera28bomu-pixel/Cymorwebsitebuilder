const { getTemplate } = require('./templateService');

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildFeatureCards(features = []) {
  return features
    .map(
      (f) => `
      <div class="feature-card">
        <div class="feature-icon">${escapeHtml(f.icon || '✦')}</div>
        <h3>${escapeHtml(f.title)}</h3>
        <p>${escapeHtml(f.description)}</p>
      </div>`
    )
    .join('\n');
}

function buildTestimonialCards(testimonials = []) {
  return testimonials
    .map((t) => {
      const initial = (t.name || '?').trim().charAt(0).toUpperCase();
      return `
      <div class="testimonial-card">
        <p>"${escapeHtml(t.quote)}"</p>
        <div class="testimonial-author">
          <div class="avatar">${initial}</div>
          <div>
            <div class="author-name">${escapeHtml(t.name)}</div>
            <div class="author-role">${escapeHtml(t.role)}</div>
          </div>
        </div>
      </div>`;
    })
    .join('\n');
}

function buildFaqItems(faqs = []) {
  return faqs
    .map(
      (f) => `
    <details class="faq-item">
      <summary>${escapeHtml(f.question)}</summary>
      <p>${escapeHtml(f.answer)}</p>
    </details>`
    )
    .join('\n');
}

/**
 * Merges AI-generated structured content into the selected template.
 * This is a pure string-replace merge — the AI never writes raw HTML,
 * which is what keeps output layout/quality consistent across generations.
 */
function mergeContent(category, content) {
  let html = getTemplate(category);

  const replacements = {
    '{{BUSINESS_NAME}}': content.businessName,
    '{{BUSINESS_NAME_SHORT}}': content.businessNameShort,
    '{{META_TITLE}}': content.metaTitle,
    '{{META_DESCRIPTION}}': content.metaDescription,
    '{{EYEBROW}}': content.eyebrow,
    '{{HERO_HEADLINE}}': content.heroHeadline,
    '{{HERO_SUBHEAD}}': content.heroSubhead,
    '{{CTA_TEXT}}': content.ctaText,
    '{{FEATURES_HEADLINE}}': content.featuresHeadline,
    '{{FEATURES_SUBHEAD}}': content.featuresSubhead,
    '{{FEATURE_CARDS}}': buildFeatureCards(content.features),
    '{{TESTIMONIAL_CARDS}}': buildTestimonialCards(content.testimonials),
    '{{FAQ_ITEMS}}': buildFaqItems(content.faqs),
    '{{CONTACT_HEADLINE}}': content.contactHeadline,
    '{{CONTACT_SUBHEAD}}': content.contactSubhead,
    '{{CONTACT_EMAIL}}': content.contactEmail,
    '{{PRIMARY_COLOR}}': content.primaryColor || '#4f46e5',
    '{{ACCENT_COLOR}}': content.accentColor || '#f59e0b',
    '{{YEAR}}': String(new Date().getFullYear())
  };

  for (const [placeholder, value] of Object.entries(replacements)) {
    // Split/join is safer than a global regex here since values may contain $-sequences
    html = html.split(placeholder).join(value ?? '');
  }

  return html;
}

module.exports = { mergeContent };
