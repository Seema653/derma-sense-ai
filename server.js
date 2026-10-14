import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import OpenAI from 'openai';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 3000);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return cb(new Error('Please upload a JPG, PNG, or WebP image.'));
    }
    cb(null, true);
  }
});

app.use(helmet({ contentSecurityPolicy: { directives: {
  defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", 'data:', 'blob:'], connectSrc: ["'self'"], objectSrc: ["'none'"],
  upgradeInsecureRequests: []
}}}));
app.use(express.json({ limit: '100kb' }));
app.use('/api/', rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use(express.static(path.join(__dirname, 'public')));

const products = [
  { id: 'cleanser-1', name: 'Gentle Cleanser', category: 'Cleanser', budget: 'Low', price: '₹299', reason: 'A simple cleansing option; choose fragrance-free if sensitive.' },
  { id: 'moisturizer-1', name: 'Hydra Moisturizer', category: 'Moisturizer', budget: 'Medium', price: '₹499', reason: 'A basic option to help support the skin barrier.' },
  { id: 'sunscreen-1', name: 'Daily Sunscreen SPF 50', category: 'Sunscreen', budget: 'Medium', price: '₹599', reason: 'Broad-spectrum SPF 30+ or higher is a useful daily sun-care step.' },
  { id: 'serum-1', name: 'Simple Hydrating Serum', category: 'Serum', budget: 'Flexible', price: '₹899', reason: 'Optional hydration step; patch-test new products.' }
];

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'DermaSense AI', aiConfigured: Boolean(process.env.OPENAI_API_KEY) }));
app.get('/api/products', (_req, res) => res.json({ products }));

app.post('/api/assistant', async (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message || message.length > 1500) return res.status(400).json({ error: 'Enter a message of 1–1500 characters.' });
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'AI is not configured yet. Add OPENAI_API_KEY in your hosting environment settings.' });
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      instructions: 'You are DermaSense, a cautious skin-care wellness assistant. Give general educational information, not diagnosis. Do not claim to identify a disease from a photo. Recommend patch testing and gentle basics. For severe, painful, spreading, bleeding, infected-looking or persistent concerns, advise seeing a qualified dermatologist. Keep answers clear and concise.',
      input: message
    });
    res.json({ answer: response.output_text || 'I could not prepare an answer. Please try again.' });
  } catch (err) {
    console.error('Assistant API error:', err?.status || err?.name || 'unknown');
    res.status(502).json({ error: 'The AI service could not respond. Check your API key, model access, and API billing, then try again.' });
  }
});

app.post('/api/analyze-skin', upload.single('photo'), async (req, res) => {
  const concern = String(req.body?.concern || 'General Care').slice(0, 100);
  const skinType = String(req.body?.skinType || 'Not specified').slice(0, 50);
  const age = String(req.body?.age || 'Not specified').slice(0, 10);
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'AI is not configured yet. Add OPENAI_API_KEY in your hosting environment settings.' });
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const content = [{ type: 'input_text', text: `You are DermaSense, a cautious skincare wellness assistant. User concern: ${concern}. Self-reported skin type: ${skinType}. Age: ${age}. If a photo is provided, assess ONLY visible skin on the face (forehead, cheeks, nose, chin). Do NOT assess or comment on eyes, eyelids, eyelashes, or eye health. If image quality or angle prevents a reliable observation, say so. Never diagnose acne severity, a disease, or any medical condition from an image; phrase findings as possible visible patterns, not certainty. Respond in clear, simple language with headings: 1) Visible facial-skin observations (or photo limitations), 2) Possible skincare concerns (not a diagnosis), 3) Suggested routine (morning and evening), 4) Product requirements/categories to look for (not fabricated brands or links), 5) Patch test and safety. Recommend broad-spectrum SPF 30+ sunscreen for daytime where appropriate. Advise a qualified dermatologist for painful, worsening, spreading, persistent, or concerning symptoms. Do not guarantee results.` }];
    if (req.file) {
      const base64 = req.file.buffer.toString('base64');
      content.push({ type: 'input_image', image_url: `data:${req.file.mimetype};base64,${base64}`, detail: 'low' });
    }
    const response = await client.responses.create({ model: process.env.OPENAI_MODEL || 'gpt-4.1-mini', input: [{ role: 'user', content }] });
    res.json({ analysis: response.output_text || 'No analysis was returned. Please try again.', imageIncluded: Boolean(req.file) });
  } catch (err) {
    console.error('Skin analysis API error:', err?.status || err?.name || 'unknown');
    res.status(502).json({ error: 'AI analysis failed. Check API key/model access and try again.' });
  }
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'API endpoint not found.' }));
app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Image must be 6 MB or smaller.' : 'Upload could not be processed.' });
  if (err) return res.status(400).json({ error: err.message || 'Invalid request.' });
  res.status(500).json({ error: 'Unexpected server error.' });
});

app.listen(port, () => console.log(`DermaSense is listening on port ${port}`));
