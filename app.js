document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('sync-form');
  const submitBtn = document.getElementById('submit-btn');
  const btnText = submitBtn.querySelector('.btn-text');
  const loader = submitBtn.querySelector('.loader');
  const statusMessage = document.getElementById('status-message');
  const googleLoginBtn = document.getElementById('google-login-btn');
  const googleTokenInput = document.getElementById('googleToken');
  const loadErrorsBtn = document.getElementById('load-errors-btn');
  const clearErrorsBtn = document.getElementById('clear-errors-btn');
  const errorsList = document.getElementById('errors-list');
  const errorsStatus = document.getElementById('errors-status');
  const ERRORS_API_URL = 'https://sync-hub.vercel.app/api/error';
  const ERROR_POLL_INTERVAL = 15000;
  let knownErrorKeys = new Set();
  let errorPollIntervalId = null;

  // ==========================================
  // HIER DEINE GOOGLE CLIENT ID EINTRAGEN:
  // ==========================================
  const GOOGLE_CLIENT_ID = '427595082580-vhe6v52aeohthvfhg9jm9ejtmpb1fjit.apps.googleusercontent.com';

  // Google Auth Logic
  googleLoginBtn.addEventListener('click', () => {
    try {
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/contacts https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
        callback: (response) => {
          if (response.error !== undefined) {
            console.error('Google Auth Error:', response);
            alert("Fehler beim Google Login.");
            return;
          }
          // Set access token secretly and update button UI
          googleTokenInput.value = response.access_token;
          googleLoginBtn.innerHTML = "Bei Google angemeldet ✓";
          googleLoginBtn.style.background = 'rgba(16, 185, 129, 0.1)';
          googleLoginBtn.style.color = 'var(--success)';
          googleLoginBtn.style.borderColor = 'rgba(16, 185, 129, 0.2)';
        },
      });
      tokenClient.requestAccessToken();
    } catch (e) {
      console.error(e);
      alert("Fehler bei der Authentifizierung. Stelle sicher, dass die Google Skripte geladen sind und die Client ID korrekt ist.");
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Reset status
    statusMessage.classList.add('hidden');
    statusMessage.className = 'status-message hidden';

    // Set loading state
    submitBtn.disabled = true;
    btnText.textContent = 'Synchronisiere...';
    loader.classList.remove('hidden');

    // Gather data
    const odooUrl = document.getElementById('odooUrl').value.trim();
    const odooDatabase = document.getElementById('odooDatabase').value.trim();
    const odooPassword = document.getElementById('odooPassword').value.trim();
    const odooClientId = document.getElementById('odooClientId').value.trim();
    const googleToken = document.getElementById('googleToken').value.trim();
    const webhookUrl = document.getElementById('webhookUrl').value.trim();

    if (!googleToken) {
      alert("Bitte melde dich zuerst über den Button bei Google an!");
      submitBtn.disabled = false;
      btnText.textContent = 'Synchronisation starten';
      loader.classList.add('hidden');
      return;
    }

    const payload = {
      odoo: {
        url: odooUrl,
        database: odooDatabase,
        password: odooPassword,
        clientId: odooClientId
      },
      google: {
        token: googleToken
      }
    };

    clearErrors();
    clearErrorsStatus();

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Server antwortete mit Status: ${response.status}`);
      }

      // Check for success or error in response if applicable
      await response.json().catch(() => ({}));

      statusMessage.textContent = 'Synchronisation erfolgreich gestartet!';
      statusMessage.classList.add('status-success');
      statusMessage.classList.remove('hidden');

    } catch (error) {
      statusMessage.textContent = `Fehler: ${error.message}`;
      statusMessage.classList.add('status-error');
      statusMessage.classList.remove('hidden');
    } finally {
      // Reset loading state
      submitBtn.disabled = false;
      btnText.textContent = 'Synchronisation starten';
      loader.classList.add('hidden');
    }
  });

  function setErrorsStatus(message, isError = false) {
    errorsStatus.textContent = message;
    errorsStatus.className = 'status-message';
    errorsStatus.classList.add(isError ? 'status-error' : 'status-success');
    errorsStatus.classList.remove('hidden');
  }

  function clearErrorsStatus() {
    errorsStatus.className = 'status-message hidden';
    errorsStatus.textContent = '';
  }

  function clearErrors() {
    errorsList.innerHTML = '';
    errorsList.classList.add('hidden');
  }

  function createErrorKey(error) {
    const message = error.error || error.message || error.errorMessage || '';
    const workflow = error.workflow || error.workflowName || '';
    const node = error.node || error.lastNodeExecuted || '';
    const timestamp = error.timestamp || error.time || error.receivedAt || '';
    return `${message}|${workflow}|${node}|${timestamp}`;
  }

  function showErrorPopup(error) {
    const popup = document.createElement('div');
    popup.className = 'toast';

    const message = error.error || error.message || error.errorMessage || 'Neuer n8n Fehler';
    const workflow = error.workflow || error.workflowName || 'Unbekannt';
    const timestamp = error.timestamp || error.time || error.receivedAt || 'Unbekannt';

    popup.innerHTML = `
      <strong>${message}</strong>
      <div class="toast-field"><span>Workflow:</span><span>${workflow}</span></div>
      <div class="toast-field"><span>Zeit:</span><span>${timestamp}</span></div>
      <button type="button" class="toast-close">Schließen</button>
    `;

    const closeButton = popup.querySelector('.toast-close');
    closeButton.addEventListener('click', () => popup.remove());

    const container = document.querySelector('.toast-container') || createToastContainer();
    container.appendChild(popup);

    window.setTimeout(() => popup.remove(), 10000);
  }

  function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
  }

  function renderErrors(errors) {
    errorsList.innerHTML = '';

    errors.forEach((error) => {
      const card = document.createElement('div');
      card.className = 'error-card';

      const message = error.error || error.message || error.errorMessage || 'Unbekannter Fehler';
      const workflow = error.workflow || error.workflowName || 'Unbekannt';
      const node = error.node || error.lastNodeExecuted || 'Unbekannt';
      const timestamp = error.timestamp || error.time || 'Unbekannt';

      card.innerHTML = `
        <strong>${message}</strong>
        <div class="error-field"><span>Workflow</span><span>${workflow}</span></div>
        <div class="error-field"><span>Node</span><span>${node}</span></div>
        <div class="error-field"><span>Zeit</span><span>${timestamp}</span></div>
      `;

      errorsList.appendChild(card);
    });

    errorsList.classList.remove('hidden');
  }

  async function loadN8nErrors({ announceNew = false } = {}) {
    setErrorsStatus('Lade n8n Fehler...', false);
    clearErrors();

    try {
      const response = await fetch(ERRORS_API_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Server antwortete mit Status: ${response.status}`);
      }

      const data = await response.json();
      let errors = [];

      if (Array.isArray(data)) {
        errors = data;
      } else if (data?.errors && Array.isArray(data.errors)) {
        errors = data.errors;
      } else if (data?.error && typeof data.error === 'string') {
        setErrorsStatus('Keine n8n-Fehler gefunden oder Backend liefert kein Fehler-Array.', false);
        return;
      } else if (typeof data === 'object' && Object.keys(data).length > 0) {
        errors = [data];
      }

      if (errors.length === 0) {
        setErrorsStatus('Es wurden keine n8n-Fehler gefunden.', false);
        knownErrorKeys = new Set();
        return;
      }

      renderErrors(errors);
      const currentKeys = errors.map(createErrorKey);

      if (errors.length > 0 && announceNew) {
        const newErrors = errors.filter((error) => {
          const key = createErrorKey(error);
          return !knownErrorKeys.has(key);
        });

        if (newErrors.length > 0) {
          showErrorPopup(newErrors[0]);
        }
      }

      knownErrorKeys = new Set(currentKeys);
      setErrorsStatus(`Es wurden ${errors.length} n8n Fehler geladen.`, false);
    } catch (error) {
      setErrorsStatus(`Fehler beim Laden der n8n-Fehler: ${error.message}`, true);
    }
  }

  function startErrorPolling() {
    if (errorPollIntervalId) return;
    loadN8nErrors({ announceNew: false });
    errorPollIntervalId = window.setInterval(() => loadN8nErrors({ announceNew: true }), ERROR_POLL_INTERVAL);
  }

  loadErrorsBtn.addEventListener('click', () => loadN8nErrors({ announceNew: false }));
  clearErrorsBtn.addEventListener('click', () => {
    clearErrors();
    clearErrorsStatus();
  });
});
