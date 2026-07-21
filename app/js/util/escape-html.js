/**
 * escape-html.js — Sanitización HTML compartida (XSS)
 */
(function (g) {
  'use strict';

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  g.SaniCheck = g.SaniCheck || {};
  g.SaniCheck.escapeHtml = escapeHtml;
  g.SaniCheck.escapeAttr = escapeHtml;
  g._esc = escapeHtml;
  g._escAttr = escapeHtml;
})(window);
