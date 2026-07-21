class VersionManager {
  constructor() {
    this.STORAGE_KEY = 'sanicheck_version';
    this.MANIFEST_KEY = 'sanicheck_manifest_hash';
    this.HISTORY_KEY = 'sanicheck_update_history';
    this.TIMESTAMP_KEY = 'sanicheck_update_timestamp';
    this.currentVersion = '4.12.7';
    this.commitHash = 'main';
  }

  _manifestUrl() {
    const base = (typeof document !== 'undefined' && document.querySelector('link[rel="manifest"]'))
      ? document.querySelector('link[rel="manifest"]').getAttribute('href')
      : './manifest.json';
    return base + (base.includes('?') ? '&' : '?') + 't=' + Date.now();
  }

  async getDeploymentHash() {
    try {
      const response = await fetch(this._manifestUrl(), { cache: 'no-store' });
      const manifest = await response.json();
      const manifestStr = JSON.stringify(manifest);
      const hash = await this._sha256(manifestStr);
      return hash;
    } catch (e) {
      console.warn('[VersionManager] Error leyendo manifest:', e);
      return null;
    }
  }

  async _sha256(str) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      console.warn('[VersionManager] Crypto.subtle no disponible:', e);
      return 'hash-' + Date.now();
    }
  }

  async checkForUpdates() {
    const oldVersion = localStorage.getItem(this.STORAGE_KEY);
    const oldHash = localStorage.getItem(this.MANIFEST_KEY);
    const newHash = await this.getDeploymentHash();
    const hasUpdate = oldHash && oldHash !== newHash && newHash;
    return {
      hasUpdate,
      newVersion: this.currentVersion,
      oldVersion: oldVersion || '0.0.0',
      timestamp: new Date().toISOString(),
      commitHash: this.commitHash
    };
  }

  async registerUpdate() {
    const hash = await this.getDeploymentHash();
    if (hash) {
      localStorage.setItem(this.STORAGE_KEY, this.currentVersion);
      localStorage.setItem(this.MANIFEST_KEY, hash);
      localStorage.setItem(this.TIMESTAMP_KEY, new Date().toISOString());
      this._addToHistory(this.currentVersion, this.commitHash, 'Actualización automática');
    }
  }

  getUpdateHistory() {
    const stored = localStorage.getItem(this.HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  _addToHistory(version, commit, description) {
    const history = this.getUpdateHistory();
    history.push({
      version,
      commit,
      description,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem(this.HISTORY_KEY, JSON.stringify(history.slice(-10)));
  }

  getVersionInfo() {
    const version = localStorage.getItem(this.STORAGE_KEY) || this.currentVersion;
    const timestamp = localStorage.getItem(this.TIMESTAMP_KEY);
    return {
      version,
      timestamp: timestamp ? new Date(timestamp).toLocaleString('es-CO') : 'N/A'
    };
  }
}

export default new VersionManager();
