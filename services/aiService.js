const fetch = require('node-fetch');
const { listCategories } = require('./templateService');

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

async function callGemini(prompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set');

  const res = await fetch(`${BASE_URL}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.8, responseMimeType: 'application/json' }
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no content');

  try {
    return JSON.parse(text);
  } catch {
    // Model occasionally wraps JSON in fences despite the mime-type hint
    const cleaned = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  }
}

/** Step 1: classify the prompt into the closest supported template category */
async function classifyCategory(userPrompt) {
  const categories = listCategories();
  const prompt = `Classify this website request into exactly one category from this list: ${categories.join(', ')}.
Request: "${userPrompt}"
Respond with ONLY JSON: {"category": "one_of_the_list_values"}`;

  const result = await callGemini(prompt);
  const category = categories.includes(result.category) ? result.category : 'default';
  return category;
}

/** Step 2: generate structured section content for the chosen template */
async function generateContent(userPrompt, category) {
  const prompt = `You are writing website copy for a real business, based on this request: "${userPrompt}"
The website category is: ${category}.

Write premium, specific, non-generic copy — avoid filler like "Welcome to our website" or "We are the best".
Ground every line in the actual business described in the request.

Respond with ONLY JSON matching exactly this schema:
{
  "businessName": "string, full business name",
  "businessNameShort": "string, 1-2 words for the logo",
  "metaTitle": "string, <60 chars, SEO title",
  "metaDescription": "string, <155 chars, SEO description",
  "eyebrow": "string, short label above the headline, 2-4 words",
  "heroHeadline": "string, bold specific headline, <12 words",
  "heroSubhead": "string, 1-2 sentences expanding the headline",
  "ctaText": "string, 2-3 words, e.g. 'Book a consultation'",
  "featuresHeadline": "string",
  "featuresSubhead": "string",
  "features": [
    {"icon": "single relevant emoji", "title": "string, 2-5 words", "description": "string, 1 sentence"}
  ],
  "testimonials": [
    {"quote": "string, 1-2 sentences, specific and believable", "name": "string, realistic full name", "role": "string, e.g. 'Operations Manager'"}
  ],
  "faqs": [
    {"question": "string", "answer": "string, 1-2 sentences"}
  ],
  "contactHeadline": "string",
  "contactSubhead": "string",
  "contactEmail": "string, plausible business email using businessNameShort lowercased, e.g. hello@name.com",
  "primaryColor": "string, hex code, a rich brand color fitting the business's industry — never default blue unless it truly fits",
  "accentColor": "string, hex code, a contrasting accent color that pairs well with primaryColor"
}
Provide exactly 3 items in "features", exactly 3 in "testimonials", and exactly 5 in "faqs".`;

  return callGemini(prompt);
}

module.exports = { classifyCategory, generateContent };
