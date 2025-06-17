
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/paypal-webhook', async (req, res) => {
  const { orderId, email, items, total, shipping } = req.body;

  console.log('Received order:', { orderId, email, items, total, shipping });

  try {
    await fetch('https://script.google.com/macros/s/AKfycby6w--CWNdH2gTPEjccSBHTpnwLHIykOGTNvldNqLhwd0pB6_jLmvzpW2NtnThVGa4b/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, items, total, shipping })
    });
    console.log('✅ Google Sheet updated');
  } catch (err) {
    console.error('❌ Google Sheets error:', err);
  }

  res.status(200).send('Webhook processed.');
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
