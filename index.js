const express = require('express');
const Database = require('better-sqlite3');
const { nanoid } = require('nanoid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

const db = new Database(path.join(__dirname, 'data.db'));

db.prepare(`CREATE TABLE IF NOT EXISTS urls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  short TEXT UNIQUE,
  original TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  clicks INTEGER DEFAULT 0
)`).run();

app.use(express.json());

app.post('/shorten', (req, res) => {
  const { url } = req.body;
  try {
    new URL(url); // Validate URL
  } catch (err) {
    return res.status(400).json({ error: 'Invalid URL' });
  }
  const short = nanoid(6);
  try {
    db.prepare('INSERT INTO urls (short, original) VALUES (?, ?)').run(short, url);
  } catch (err) {
    return res.status(500).json({ error: 'Database error' });
  }
  res.json({ shortUrl: `${BASE_URL}/${short}` });
});

app.get('/:short', (req, res) => {
  const short = req.params.short;
  const row = db.prepare('SELECT original FROM urls WHERE short=?').get(short);
  if (!row) {
    return res.status(404).send('Not found');
  }
  db.prepare('UPDATE urls SET clicks = clicks + 1 WHERE short=?').run(short);
  res.redirect(row.original);
});

app.get('/stats/:short', (req, res) => {
  const short = req.params.short;
  const row = db.prepare('SELECT original, clicks, created_at FROM urls WHERE short=?').get(short);
  if (!row) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json({ short, ...row });
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
