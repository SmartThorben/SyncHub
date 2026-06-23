const MAX_ERRORS = 50;

function getErrorStore() {
  if (!globalThis.__N8N_ERROR_STORE__) {
    globalThis.__N8N_ERROR_STORE__ = [];
  }
  return globalThis.__N8N_ERROR_STORE__;
}

function normalizeN8nError(body) {
  let payload = body;

  if (Array.isArray(body) && body.length > 0) {
    payload = body[0];
  }

  if (payload?.execution && payload?.workflow) {
    const execution = payload.execution;
    const workflow = payload.workflow;

    return {
      error: execution.error?.message || execution.error || 'Unbekannter Fehler',
      node: execution.lastNodeExecuted || '',
      timestamp: execution.timestamp || execution.error?.timestamp || new Date().toISOString(),
      workflow: workflow.name || workflow.workflowName || '',
      executionId: execution.id,
      executionUrl: execution.url,
      receivedAt: new Date().toISOString(),
      raw: payload,
    };
  }

  if (payload?.payload && payload.payload?.execution && payload.payload?.workflow) {
    return normalizeN8nError(payload.payload);
  }

  if (payload?.error) {
    return {
      error: payload.error,
      node: payload.node || '',
      timestamp: payload.timestamp || new Date().toISOString(),
      workflow: payload.workflow || '',
      receivedAt: new Date().toISOString(),
      raw: payload,
    };
  }

  return {
    error: JSON.stringify(payload),
    node: '',
    timestamp: new Date().toISOString(),
    workflow: '',
    receivedAt: new Date().toISOString(),
    raw: payload,
  };
}

export default function handler(req, res) {
  const errors = getErrorStore();

  if (req.method === 'POST') {
    const errorEntry = normalizeN8nError(req.body);

    console.log('Received n8n error payload:', JSON.stringify(req.body));

    errors.unshift(errorEntry);

    if (errors.length > MAX_ERRORS) {
      errors.splice(MAX_ERRORS);
    }

    return res.status(200).json({ status: 'ok', receivedAt: errorEntry.receivedAt });
  }

  if (req.method === 'GET') {
    return res.status(200).json(errors);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}
