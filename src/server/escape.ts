// indexOf-scanning escape ported from dom-expressions (src/server.js). Only
// the minimal safe set is escaped: text needs `&` and `<` neutralized;
// double-quoted attribute values need `&` and `"`. Scanning + slicing beats
// regex replace on large payloads and returns the input untouched (no
// allocation) when nothing needs escaping.
function escapeDelim(s: string, delim: string, escDelim: string): string {
  let iDelim = s.indexOf(delim);
  let iAmp = s.indexOf("&");
  if (iDelim < 0 && iAmp < 0) return s;

  let left = 0;
  let out = "";

  while (iDelim >= 0 && iAmp >= 0) {
    if (iDelim < iAmp) {
      if (left < iDelim) out += s.substring(left, iDelim);
      out += escDelim;
      left = iDelim + 1;
      iDelim = s.indexOf(delim, left);
    } else {
      if (left < iAmp) out += s.substring(left, iAmp);
      out += "&amp;";
      left = iAmp + 1;
      iAmp = s.indexOf("&", left);
    }
  }

  if (iDelim >= 0) {
    do {
      if (left < iDelim) out += s.substring(left, iDelim);
      out += escDelim;
      left = iDelim + 1;
      iDelim = s.indexOf(delim, left);
    } while (iDelim >= 0);
  } else {
    while (iAmp >= 0) {
      if (left < iAmp) out += s.substring(left, iAmp);
      out += "&amp;";
      left = iAmp + 1;
      iAmp = s.indexOf("&", left);
    }
  }

  return left < s.length ? out + s.substring(left) : out;
}

/** Escape a text node. */
export function escapeHtml(value: string): string {
  return escapeDelim(value, "<", "&lt;");
}

/** Escape a double-quoted attribute value. */
export function escapeAttr(value: string): string {
  return escapeDelim(value, '"', "&quot;");
}

/** Neutralize `</script>` sequences inside an inline JSON script payload. */
export function escapeScriptJson(json: string): string {
  return json.replace(/<\//g, "<\\/");
}
