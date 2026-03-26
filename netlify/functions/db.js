const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabaseRequest = async (path, method = 'GET', body = null, extraHeaders = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: method === 'POST' ? 'return=representation' : '',
      ...extraHeaders,
    },
    body: body ? JSON.stringify(body) : null,
  });
  if (res.status === 204) return [];
  return res.json();
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, body: '' };
  const { action, table, data, filter } = JSON.parse(event.body || '{}');
  try {
    let result;
    if (action === 'get') {
      const query = filter ? `${table}?${filter}` : table;
      result = await supabaseRequest(query);
    } else if (action === 'insert') {
      result = await supabaseRequest(table, 'POST', data);
    } else if (action === 'delete') {
      result = await supabaseRequest(`${table}?${filter}`, 'DELETE');
      result = { success: true };
    } else if (action === 'upsert') {
      // Supabase upsert: POST with Prefer: resolution=merge-duplicates
      result = await supabaseRequest(table, 'POST', data, {
        Prefer: 'resolution=merge-duplicates,return=representation',
      });
    }
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
