/**
 * CompAlumim - Main Application Coordinator • בית הספר עלומים חולון
 * Boots all subsystems: SoundFX, ShareEngine, Admin, Schedule, Storage.
 */

const App = (() => {
  const KEY_THEME = 'compalumim_theme';
  let toastContainer = null;
  let syncPillEl = null;
  let syncLabelEl = null;

  /**
   * Application Initialization
   */
  function init() {
    toastContainer = document.getElementById('toastContainer');
    syncPillEl = document.getElementById('syncPill');
    syncLabelEl = document.getElementById('syncLabel');

    // Setup Theme (Light / Dark)
    initTheme();

    // Initialize Subsystems
    if (window.SoundFX) SoundFX.init();
    if (window.ShareEngine) ShareEngine.init();
    if (window.Admin) Admin.init();
    if (window.Schedule) Schedule.init();

    // Setup Sync Status UI
    setupSyncUI();

    // Listen to remote changes (from Google Sheets or other tabs via BroadcastChannel)
    Storage.onRemoteUpdate((changedKeys) => {
      if (window.Schedule && typeof Schedule.onRemoteDataChanged === 'function') {
        Schedule.onRemoteDataChanged(changedKeys);
      }
      if (window.Schedule && typeof Schedule.updateDropdowns === 'function') {
        Schedule.updateDropdowns();
      }
    });

    // Setup Global Key Shortcuts
    setupKeyboardShortcuts();

    // Setup PWA Service Worker & Install Capability
    initPwa();

    // Start Real-Time Sync Loop if Google Sheets is connected
    setupRealtimeSync();
  }

  /**
   * Real-Time Smart Sync Loop
   * - Polls every 3.5 seconds while page is visible
   * - Immediately syncs on tab focus / phone screen unlock
   */
  function setupRealtimeSync() {
    let pollIntervalId = null;

    async function triggerSync() {
      const gsUrl = Storage.getGoogleSheetsUrl();
      if (!gsUrl) return;
      const res = await Storage.pullFromSheets();
      if (res && res.changed) {
        if (window.Schedule) {
          Schedule.renderTables();
          Schedule.updateDropdowns();
        }
      }
    }

    // Immediate initial sync
    triggerSync();

    // Fast polling loop: checks every 3.5 seconds when document is visible
    pollIntervalId = setInterval(() => {
      if (document.hidden) return; // Skip if tab is in background to save battery
      triggerSync();
    }, 3500);

    // Immediate sync when tab becomes visible or screen is turned on
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        triggerSync();
      }
    });

    // Immediate sync on window focus
    window.addEventListener('focus', () => {
      triggerSync();
    });

    // Immediate sync when network comes back online
    window.addEventListener('online', () => {
      triggerSync();
    });
  }

  /**
   * Theme Management: Light & Dark Modes
   */
  function initTheme() {
    const savedTheme = localStorage.getItem(KEY_THEME);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');

    applyTheme(initialTheme);

    const btnTheme = document.getElementById('btnThemeToggle');
    if (btnTheme) {
      btnTheme.addEventListener('click', () => {
        if (window.SoundFX) SoundFX.playClick();
        toggleTheme();
      });
    }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(KEY_THEME, theme);

    const btnTheme = document.getElementById('btnThemeToggle');
    if (btnTheme) {
      btnTheme.textContent = theme === 'dark' ? '☀️' : '🌙';
      btnTheme.title = theme === 'dark' ? 'מעבר למצב בהיר' : 'מעבר למצב כהה';
    }
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    showToast(newTheme === 'dark' ? 'מצב כהה הופעל 🌙' : 'מצב בהיר הופעל ☀️', 'info', 1600);
  }

  /**
   * Setup Sync Indicator in Header
   */
  function setupSyncUI() {
    Storage.onSyncStatusChange((status, message) => {
      if (!syncPillEl || !syncLabelEl) return;

      syncPillEl.className = `sync-pill ${status}`;
      syncLabelEl.textContent = message || (status === 'synced' ? 'מסונכרן' : status === 'syncing' ? 'מסנכרן...' : 'מקומי');
    });

    if (syncPillEl) {
      syncPillEl.addEventListener('click', () => {
        if (window.SoundFX) SoundFX.playClick();
        const gsUrl = Storage.getGoogleSheetsUrl();
        if (!gsUrl) {
          showToast('המערכת פועלת כרגע במצב מקומי בדפדפן. טטיאנה יכולה לחבר גיליון Google Sheets.', 'info');
        } else {
          showToast('מבצע סנכרון מיידי מול Google Sheets...', 'info');
          Storage.pullFromSheets().then(changed => {
            if (changed && window.Schedule) Schedule.renderTables();
            showToast('הנתונים סונכרנו בהצלחה', 'success');
          });
        }
      });
    }
  }

  /**
   * Keyboard Shortcuts (ESC, Alt+P)
   */
  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const activeModal = document.querySelector('.modal-backdrop.active');
        if (activeModal) activeModal.classList.remove('active');
      }

      if (e.altKey && (e.key === 'p' || e.key === 'P' || e.key === 'פ')) {
        e.preventDefault();
        window.print();
      }
    });

    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          if (window.SoundFX) SoundFX.playClick();
          backdrop.classList.remove('active');
        }
      });
    });
  }

  /**
   * Display Toast Notification
   */
  function showToast(message, type = 'info', durationMs = 2400) {
    if (!toastContainer) {
      toastContainer = document.getElementById('toastContainer');
      if (!toastContainer) return;
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icon = type === 'success' ? '✓' : type === 'warning' ? '⚠️' : type === 'danger' ? '✗' : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(6px)';
      toast.style.transition = 'all 0.2s ease-in';
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 200);
    }, durationMs);
  }

  /**
   * PWA Service Worker & Installation Flow
   */
  let deferredInstallPrompt = null;

  function initPwa() {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch((err) => {
          console.warn('CompAlumim: Service worker note:', err);
        });
      });
    }

    // Capture Native PWA Install Prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      const btnInstall = document.getElementById('btnInstallPwa');
      if (btnInstall) {
        btnInstall.classList.add('is-ready');
      }
    });

    window.addEventListener('appinstalled', () => {
      deferredInstallPrompt = null;
      showToast('האפליקציה הותקנה בהצלחה במכשירך! 🎉', 'success', 3500);
    });
  }

  function promptPwaInstall() {
    const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

    if (isStandalone) {
      showToast('האפליקציה כבר מותקנת ופועלת כמסך בית עצמאי! 📱', 'info', 3000);
      return;
    }

    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      deferredInstallPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          showToast('מתקין את האפליקציה למכשיר... 📲', 'info', 2500);
        }
        deferredInstallPrompt = null;
      });
      return;
    }

    if (isIos) {
      showToast('באייפון: לחצו על כפתור השיתוף בתחתית הדפדפן (⎋) ובחרו "הוסף למסך הבית" ➕', 'info', 6000);
      return;
    }

    showToast('להתקנה: לחצו על שלוש הנקודות בדפדפן (⋮) ובחרו "התקן אפליקציה" או "הוסף למסך הבית" 📲', 'info', 5000);
  }

  return {
    init,
    showToast,
    toggleTheme,
    promptPwaInstall
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

window.App = App;
