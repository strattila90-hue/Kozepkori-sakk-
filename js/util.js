/* Közös segédek: biztonságos tárolás (privát módban, letiltott tárnál is működik). */
(function (root) {
  'use strict';
  root.Util = {
    store: {
      get(k) { try { return localStorage.getItem(k); } catch (_e) { return null; } },
      set(k, v) { try { localStorage.setItem(k, v); } catch (_e) { /* nincs tár: a játék tár nélkül is megy */ } },
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
