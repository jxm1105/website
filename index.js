
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import emailjs from '@emailjs/nodejs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 🔔 Webhook route
app.post('/paypal-webhook', async (req, res) => {
  const { orderId, email, items, total } = req.body;

  console.log('Received order:', { orderId, email, items, total });

  // 🔄 Send to Google Sheets
  try {
    await fetch('https://script.google.com/macros/s/AKfycby6w--CWNdH2gTPEjccSBHTpnwLHIykOGTNvldNqLhwd0pB6_jLmvzpW2NtnThVGa4b/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, items, total })
    });
    console.log('✅ Google Sheet updated');
  } catch (err) {
    console.error('❌ Google Sheets error:', err);
  }

  // 📬 Send Email via EmailJS
  try {
    await emailjs.send(
      'service_lkx8hde',       // service ID
      'template_j6e2hbv',       // template ID
      {
        to_email: email,
        order_id: orderId,
        item_list: items.join(', '),
        total_cost: total
      },
      {
        publicKey: 'X5EyJsvtspdoQsts0'
      }
    );
    console.log('✅ Email sent');
  } catch (err) {
    console.error('❌ EmailJS error:', err);
  }

  res.status(200).send('Webhook processed.');
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
