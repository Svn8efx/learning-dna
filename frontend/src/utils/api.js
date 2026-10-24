export async function apiFetch(url, options = {}) {
  // Normally empty: requests go to the same address as the website.
  // - Local development: the "proxy" setting in package.json forwards /api/... to Flask.
  // - Live site: vercel.json forwards /api/... to the backend on Render.
  // Set REACT_APP_API_BASE_URL only if you want to call a backend at a different address.
  const envBase = process.env.REACT_APP_API_BASE_URL?.trim() || '';

  const buildUrl = (targetUrl) =>
    /^https?:\/\//.test(targetUrl) ? targetUrl : `${envBase}${targetUrl}`;

  let response;
  try {
    response = await fetch(buildUrl(url), {
      credentials: 'include',
      ...options,
      headers: {
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    throw new Error(
      'Cannot reach the Learning DNA server. If you are running locally, start the backend with "python app.py". ' +
      'On the live site the server may be waking up, so wait a minute and try again.'
    );
  }

  const rawText = await response.text();
  let data = null;
  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch {
      const cleaned = rawText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleaned.toLowerCase().startsWith('proxy error')) {
        throw new Error('Could not reach the backend server. Start it with "python app.py", or wait a minute if the live server is waking up.');
      }
      throw new Error(cleaned || 'Server returned an invalid response.');
    }
  }

  if (!response.ok || (data && data.ok === false)) {
    throw new Error((data && data.error) || `Request failed with status ${response.status}`);
  }
  return data || { ok: response.ok };
}