document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('sync-form');
  const submitBtn = document.getElementById('submit-btn');
  const btnText = submitBtn.querySelector('.btn-text');
  const loader = submitBtn.querySelector('.loader');
  const statusMessage = document.getElementById('status-message');
  const googleLoginBtn = document.getElementById('google-login-btn');
  const googleTokenInput = document.getElementById('googleToken');

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
});
