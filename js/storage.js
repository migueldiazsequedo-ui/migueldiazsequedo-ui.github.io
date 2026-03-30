window.App = window.App || {};

(function registerStorage(app) {
  class StorageManager {
    constructor(prefix = 'mineralTradingApp') {
      this.prefix = prefix;
    }

    buildKey(key) {
      return `${this.prefix}:${key}`;
    }

    save(key, value) {
      try {
        localStorage.setItem(this.buildKey(key), JSON.stringify(value));
        return true;
      } catch (error) {
        throw new Error(`No se pudo guardar en localStorage (${key}). ${error.message}`);
      }
    }

    load(key, fallback = null) {
      try {
        const raw = localStorage.getItem(this.buildKey(key));
        if (!raw) return fallback;
        return JSON.parse(raw);
      } catch (error) {
        throw new Error(`No se pudo leer localStorage (${key}). ${error.message}`);
      }
    }

    remove(key) {
      try {
        localStorage.removeItem(this.buildKey(key));
      } catch (error) {
        throw new Error(`No se pudo eliminar localStorage (${key}). ${error.message}`);
      }
    }
  }

  app.StorageManager = StorageManager;
})(window.App);