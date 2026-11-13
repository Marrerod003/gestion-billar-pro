/* ProBillar — cliente HTTP PostgREST */
async function sb(path, options) {
  options = options || {};
  var res = await fetch(SB_URL + path, Object.assign({}, options, {
    headers: Object.assign({}, SB_HEADERS, options.headers || {})
  }));
  var text = await res.text();
  var data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) { data = text; }
  if (!res.ok) {
    var msg = (data && (data.message || data.error_description || data.hint)) || res.statusText || 'Error API';
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
  return data;
}
