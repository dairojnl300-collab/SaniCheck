import versionManager from '../versionManager.js';

class UpdateNotifier {
  constructor() {
    this.BANNER_ID = 'sanicheck-update-banner';
    this.checkInterval = 60000;
    this.alreadyNotified = false;
  }

  async init() {
    await this.checkAndNotify();
    if (!localStorage.getItem(versionManager.MANIFEST_KEY)) {
      await versionManager.registerUpdate();
    }
    setInterval(() => this.checkAndNotify(), this.checkInterval);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'UPDATE_AVAILABLE') {
          this.showUpdateBanner({
            newVersion: event.data.version || versionManager.currentVersion,
            commitHash: event.data.build || event.data.commitHash || versionManager.commitHash
          });
        }
      });
    }
  }

  async checkAndNotify() {
    if (this.alreadyNotified) return;
    const update = await versionManager.checkForUpdates();
    if (update.hasUpdate) {
      this.alreadyNotified = true;
      this.showUpdateBanner(update);
      await versionManager.registerUpdate();
    }
  }

  showUpdateBanner(updateInfo) {
    if (document.getElementById(this.BANNER_ID)) {
      return;
    }

    const banner = document.createElement('div');
    banner.id = this.BANNER_ID;
    banner.className = 'update-banner';
    banner.innerHTML = `
      <div class="update-banner-content">
        <div class="update-icon">✨</div>
        <div class="update-text">
          <strong>Actualización disponible</strong>
          <p>v${updateInfo.newVersion}</p>
          <small>Tus datos se mantienen intactos</small>
        </div>
        <div class="update-actions">
          <button class="btn-update-now" type="button">Recargar</button>
          <button class="btn-update-later" type="button">Después</button>
        </div>
      </div>
    `;

    document.body.insertBefore(banner, document.body.firstChild);
    document.body.classList.add('has-update-banner');

    banner.querySelector('.btn-update-now')?.addEventListener('click', async () => {
      try {
        if (typeof Store !== 'undefined' && Store.flush) {
          await Store.flush();
        }
      } catch (e) {
        console.warn('[UpdateNotifier] flush before reload', e);
      }
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((reg) => reg.unregister());
        });
      }
      setTimeout(() => window.location.reload(), 500);
    });

    banner.querySelector('.btn-update-later')?.addEventListener('click', () => {
      banner.style.animation = 'slideUp 0.3s ease-in forwards';
      document.body.classList.remove('has-update-banner');
      setTimeout(() => banner.remove(), 300);
    });

    setTimeout(() => {
      if (banner.parentElement) {
        banner.style.animation = 'slideUp 0.3s ease-in forwards';
        document.body.classList.remove('has-update-banner');
        setTimeout(() => banner.remove(), 300);
      }
    }, 12000);
  }

  getVersionHtml() {
    const info = versionManager.getVersionInfo();
    return `
      <div class="version-info">
        <p>SaniCheck v${info.version}</p>
        <small>Última actualización: ${info.timestamp}</small>
      </div>
    `;
  }

  getHistoryHtml() {
    const history = versionManager.getUpdateHistory();
    if (history.length === 0) {
      return '<p style="text-align: center; color: var(--slate-10);">Sin histórico de actualizaciones</p>';
    }
    const items = history.map((h) => `
      <li>
        <strong>v${h.version}</strong> 
        <br><small>${new Date(h.timestamp).toLocaleString('es-CO')}</small>
      </li>
    `).join('');
    return `
      <div class="update-history">
        <h3>Histórico de actualizaciones</h3>
        <ul>${items}</ul>
      </div>
    `;
  }
}

export default new UpdateNotifier();
