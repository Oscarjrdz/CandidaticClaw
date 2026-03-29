require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// API health endpoint for Dashboard
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', agent: 'Candidatic Copilot', mode: 'autonomous' });
});

// Start Daemon Server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`[Candidatic Copilot] 🧠 Cerebro Daemon running on port ${PORT}`);
});
