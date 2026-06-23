const MAX_ERRORS = 50;

function getErrorStore() {
  if (!globalThis.__N8N_ERROR_STORE__) {
    globalThis.__N8N_ERROR_STORE__ = [];
  }
  return globalThis.__N8N_ERROR_STORE__;
}

export default function handler(req, res) {
  const errors = getErrorStore();

  if (req.method === 'POST') {
    const payload = req.body;
    const receivedAt = new Date().toISOString();

    console.log('Received n8n error payload:', JSON.stringify(payload));

    errors.unshift({
      receivedAt,
      payload,
    });

    if (errors.length > MAX_ERRORS) {
      errors.splice(MAX_ERRORS);
    }

    return res.status(200).json({ status: 'ok', receivedAt });
  }

  if (req.method === 'GET') {
    return res.status(200).json(errors);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}
