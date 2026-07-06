require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const apiRoutes = require('./routes/api');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '1mb' }));

app.use('/api', apiRoutes);

// Serve the single-file builder frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 5000;

async function start() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set — check your .env file against .env.example');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected');

  app.listen(PORT, () => console.log(`Cymor Website Builder running on port ${PORT}`));
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
