/**
 * CompAlumim - Admin Management Engine
 * Handles secret click sequence activation for Tatiana, admin mode state,
 * master list editing (teachers, classes, subjects, colors), and Google Sheets settings.
 */

const Admin = (() => {
  // Secret click tracking
  let clickCount = 0;
  let clickTimer = null;
  const REQUIRED_CLICKS = 5;
  const CLICK_TIMEOUT_MS = 2500;

  // DOM Elements
  let logoEl = null;
  let bannerEl = null;
  let modalEl = null;

  /**
   * Helper: Calculate contrast text color (dark or light) for a given hex background
   */
  function getContrastColor(hexColor) {
    if (!hexColor || hexColor.length < 6) return '#0f172a';
    let hex = hexColor.replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    // Relative luminance calculation
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 150) ? '#0f172a' : '#ffffff';
  }

  /**
   * Initialize Admin listeners and state
   */
  function init() {
    logoEl = document.getElementById('brandLogo');
    bannerEl = document.getElementById('adminBanner');
    modalEl = document.getElementById('adminModal');

    // Attach secret click sequence to logo
    if (logoEl) {
      logoEl.addEventListener('click', handleLogoClick);
    }

    // Keyboard shortcut alternative: Alt+Shift+A
    document.addEventListener('keydown', (e) => {
      if (e.altKey && e.shiftKey && (e.key === 'A' || e.key === 'a' || e.key === 'ש')) {
        e.preventDefault();
        toggleAdminMode();
      }
    });

    // Restore admin state if previously active
    if (Storage.isAdminActive()) {
      applyAdminUI(true);
    }

    // Bind admin banner buttons
    const btnOpenAdmin = document.getElementById('btnOpenAdminModal');
    if (btnOpenAdmin) {
      btnOpenAdmin.addEventListener('click', () => openAdminModal());
    }

    const btnExitAdmin = document.getElementById('btnExitAdmin');
    if (btnExitAdmin) {
      btnExitAdmin.addEventListener('click', () => {
        setAdminMode(false);
        App.showToast('יצאת ממצב ניהול', 'info');
      });
    }

    // Bind modal close buttons
    const closeBtn = document.getElementById('adminModalClose');
    if (closeBtn) closeBtn.addEventListener('click', closeAdminModal);
    const closeFooterBtn = document.getElementById('adminModalFooterClose');
    if (closeFooterBtn) closeFooterBtn.addEventListener('click', closeAdminModal);

    // Setup Admin Modal Tabs
    setupAdminTabs();

    // Setup Admin Form Submissions
    setupAdminForms();
  }

  /**
   * Secret Click Handler on the School Logo
   */
  function handleLogoClick() {
    clickCount++;

    if (clickTimer) clearTimeout(clickTimer);
    clickTimer = setTimeout(() => {
      clickCount = 0;
    }, CLICK_TIMEOUT_MS);

    if (clickCount >= REQUIRED_CLICKS) {
      clickCount = 0;
      clearTimeout(clickTimer);
      toggleAdminMode();
    }
  }

  /**
   * Toggle Admin Mode
   */
  function toggleAdminMode() {
    const currentState = Storage.isAdminActive();
    setAdminMode(!currentState);
    if (!currentState) {
      App.showToast('👑 שלום טטיאנה! מצב מנהלת מערכת הופעל בהצלחה.', 'success');
    } else {
      App.showToast('יצאת ממצב ניהול', 'info');
    }
  }

  /**
   * Set Admin Mode state and refresh views
   */
  function setAdminMode(isActive) {
    Storage.setAdminActive(isActive);
    applyAdminUI(isActive);
    // Refresh schedule tables to reflect admin capabilities (e.g. edit locked slots)
    if (window.Schedule && typeof Schedule.renderTables === 'function') {
      Schedule.renderTables();
    }
  }

  function applyAdminUI(isActive) {
    if (bannerEl) {
      bannerEl.classList.toggle('active', isActive);
    }
    document.body.classList.toggle('admin-active', isActive);
  }

  /**
   * Open Admin Management Modal
   */
  function openAdminModal(defaultTab = 'teachers') {
    if (!modalEl) return;
    renderTeachersList();
    renderClassesList();
    renderSubjectsList();
    loadSheetsSettings();

    switchAdminTab(defaultTab);
    modalEl.classList.add('active');
  }

  function closeAdminModal() {
    if (!modalEl) return;
    modalEl.classList.remove('active');
  }

  /**
   * Setup Admin Tabs Navigation
   */
  function setupAdminTabs() {
    const tabButtons = document.querySelectorAll('.admin-tab');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabTarget = btn.dataset.tab;
        switchAdminTab(tabTarget);
      });
    });
  }

  function switchAdminTab(tabName) {
    document.querySelectorAll('.admin-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.admin-tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `tabContent-${tabName}`);
    });
  }

  /**
   * Render Teachers in Admin Tab
   */
  function renderTeachersList() {
    const listEl = document.getElementById('adminTeachersList');
    if (!listEl) return;

    const teachers = Storage.getTeachers();
    listEl.innerHTML = '';

    teachers.forEach((t, index) => {
      const row = document.createElement('div');
      row.className = 'item-row';
      row.innerHTML = `
        <div class="item-preview">
          <span class="badge-item" style="background-color: ${t.color}; color: ${t.textColor || getContrastColor(t.color)}">
            👤 ${t.name}
          </span>
        </div>
        <div class="item-actions">
          <label title="שינוי צבע">
            <input type="color" class="color-picker-input" value="${t.color}" data-type="teacher" data-id="${t.id}">
          </label>
          <button type="button" class="btn btn-secondary btn-sm" title="מחיקה" data-action="deleteTeacher" data-id="${t.id}">
            🗑️
          </button>
        </div>
      `;
      listEl.appendChild(row);
    });

    // Attach color change listeners
    listEl.querySelectorAll('input[type="color"]').forEach(input => {
      input.addEventListener('input', (e) => {
        const id = e.target.dataset.id;
        const newColor = e.target.value;
        const teachers = Storage.getTeachers();
        const item = teachers.find(x => x.id === id);
        if (item) {
          item.color = newColor;
          item.textColor = getContrastColor(newColor);
          Storage.saveTeachers(teachers);
          renderTeachersList();
          Schedule.renderTables();
        }
      });
    });

    // Attach delete listeners
    listEl.querySelectorAll('[data-action="deleteTeacher"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = btn.dataset.id;
        let teachers = Storage.getTeachers();
        if (teachers.length <= 1) {
          App.showToast('חובה להשאיר לפחות מורה אחד במערכת', 'warning');
          return;
        }
        teachers = teachers.filter(x => x.id !== id);
        Storage.saveTeachers(teachers);
        renderTeachersList();
        Schedule.updateDropdowns();
        App.showToast('המורה נמחק/ה בהצלחה', 'info');
      });
    });
  }

  /**
   * Render Classes in Admin Tab
   */
  function renderClassesList() {
    const listEl = document.getElementById('adminClassesList');
    if (!listEl) return;

    const classes = Storage.getClasses();
    listEl.innerHTML = '';

    classes.forEach((c) => {
      const row = document.createElement('div');
      row.className = 'item-row';
      row.innerHTML = `
        <div class="item-preview">
          <span class="badge-item" style="background-color: ${c.color}; color: ${c.textColor || getContrastColor(c.color)}">
            👥 ${c.name}
          </span>
        </div>
        <div class="item-actions">
          <label title="שינוי צבע">
            <input type="color" class="color-picker-input" value="${c.color}" data-type="class" data-id="${c.id}">
          </label>
          <button type="button" class="btn btn-secondary btn-sm" title="מחיקה" data-action="deleteClass" data-id="${c.id}">
            🗑️
          </button>
        </div>
      `;
      listEl.appendChild(row);
    });

    // Attach color change listeners
    listEl.querySelectorAll('input[type="color"]').forEach(input => {
      input.addEventListener('input', (e) => {
        const id = e.target.dataset.id;
        const newColor = e.target.value;
        const classes = Storage.getClasses();
        const item = classes.find(x => x.id === id);
        if (item) {
          item.color = newColor;
          item.textColor = getContrastColor(newColor);
          Storage.saveClasses(classes);
          renderClassesList();
          Schedule.renderTables();
        }
      });
    });

    // Attach delete listeners
    listEl.querySelectorAll('[data-action="deleteClass"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        let classes = Storage.getClasses();
        if (classes.length <= 1) {
          App.showToast('חובה להשאיר לפחות כיתה אחת במערכת', 'warning');
          return;
        }
        classes = classes.filter(x => x.id !== id);
        Storage.saveClasses(classes);
        renderClassesList();
        Schedule.updateDropdowns();
        App.showToast('הכיתה נמחקה בהצלחה', 'info');
      });
    });
  }

  /**
   * Render Subjects in Admin Tab
   */
  function renderSubjectsList() {
    const listEl = document.getElementById('adminSubjectsList');
    if (!listEl) return;

    const subjects = Storage.getSubjects();
    listEl.innerHTML = '';

    subjects.forEach((s) => {
      const row = document.createElement('div');
      row.className = 'item-row';
      row.innerHTML = `
        <div class="item-preview">
          <span class="badge-item" style="background-color: ${s.color}; color: ${s.textColor || getContrastColor(s.color)}">
            📖 ${s.name}
          </span>
        </div>
        <div class="item-actions">
          <label title="שינוי צבע">
            <input type="color" class="color-picker-input" value="${s.color}" data-type="subject" data-id="${s.id}">
          </label>
          <button type="button" class="btn btn-secondary btn-sm" title="מחיקה" data-action="deleteSubject" data-id="${s.id}">
            🗑️
          </button>
        </div>
      `;
      listEl.appendChild(row);
    });

    // Attach color change listeners
    listEl.querySelectorAll('input[type="color"]').forEach(input => {
      input.addEventListener('input', (e) => {
        const id = e.target.dataset.id;
        const newColor = e.target.value;
        const subjects = Storage.getSubjects();
        const item = subjects.find(x => x.id === id);
        if (item) {
          item.color = newColor;
          item.textColor = getContrastColor(newColor);
          Storage.saveSubjects(subjects);
          renderSubjectsList();
          Schedule.renderTables();
        }
      });
    });

    // Attach delete listeners
    listEl.querySelectorAll('[data-action="deleteSubject"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        let subjects = Storage.getSubjects();
        subjects = subjects.filter(x => x.id !== id);
        Storage.saveSubjects(subjects);
        renderSubjectsList();
        Schedule.updateDropdowns();
        App.showToast('המקצוע נמחק בהצלחה', 'info');
      });
    });
  }

  /**
   * Setup Add-Item forms and Sync settings
   */
  function setupAdminForms() {
    // Add Teacher
    const formAddTeacher = document.getElementById('formAddTeacher');
    if (formAddTeacher) {
      formAddTeacher.addEventListener('submit', (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('newTeacherName');
        const colorInput = document.getElementById('newTeacherColor');
        const name = (nameInput.value || '').trim();
        if (!name) return;

        const teachers = Storage.getTeachers();
        if (teachers.some(t => t.name.toLowerCase() === name.toLowerCase())) {
          App.showToast('מורה זה כבר קיים ברשימה', 'warning');
          return;
        }

        const color = colorInput.value || '#e0f2fe';
        teachers.push({
          id: 't_' + Date.now(),
          name,
          color,
          textColor: getContrastColor(color)
        });

        Storage.saveTeachers(teachers);
        nameInput.value = '';
        renderTeachersList();
        Schedule.updateDropdowns();
        App.showToast(`המורה "${name}" נוסף/ה בהצלחה`, 'success');
      });
    }

    // Add Class
    const formAddClass = document.getElementById('formAddClass');
    if (formAddClass) {
      formAddClass.addEventListener('submit', (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('newClassName');
        const colorInput = document.getElementById('newClassColor');
        const name = (nameInput.value || '').trim();
        if (!name) return;

        const classes = Storage.getClasses();
        if (classes.some(c => c.name.toLowerCase() === name.toLowerCase())) {
          App.showToast('כיתה זו כבר קיימת ברשימה', 'warning');
          return;
        }

        const color = colorInput.value || '#fef08a';
        classes.push({
          id: 'c_' + Date.now(),
          name,
          color,
          textColor: getContrastColor(color)
        });

        Storage.saveClasses(classes);
        nameInput.value = '';
        renderClassesList();
        Schedule.updateDropdowns();
        App.showToast(`הכיתה "${name}" נוספה בהצלחה`, 'success');
      });
    }

    // Add Subject
    const formAddSubject = document.getElementById('formAddSubject');
    if (formAddSubject) {
      formAddSubject.addEventListener('submit', (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('newSubjectName');
        const colorInput = document.getElementById('newSubjectColor');
        const name = (nameInput.value || '').trim();
        if (!name) return;

        const subjects = Storage.getSubjects();
        if (subjects.some(s => s.name.toLowerCase() === name.toLowerCase())) {
          App.showToast('מקצוע זה כבר קיים ברשימה', 'warning');
          return;
        }

        const color = colorInput.value || '#dbeafe';
        subjects.push({
          id: 's_' + Date.now(),
          name,
          color,
          textColor: getContrastColor(color)
        });

        Storage.saveSubjects(subjects);
        nameInput.value = '';
        renderSubjectsList();
        Schedule.updateDropdowns();
        App.showToast(`המקצוע "${name}" נוסף בהצלחה`, 'success');
      });
    }

    // Google Sheets URL Save
    const btnSaveSheetsUrl = document.getElementById('btnSaveSheetsUrl');
    if (btnSaveSheetsUrl) {
      btnSaveSheetsUrl.addEventListener('click', () => {
        const urlInput = document.getElementById('gsUrlInput');
        const url = (urlInput.value || '').trim();
        Storage.setGoogleSheetsUrl(url);
        App.showToast('כתובת Google Sheets נשמרה', 'success');
        if (url) {
          Storage.pullFromSheets().then(changed => {
            if (changed) {
              Schedule.renderTables();
              Schedule.updateDropdowns();
              renderTeachersList();
              renderClassesList();
              renderSubjectsList();
            }
          });
        }
      });
    }

    // Force Pull from Sheets
    const btnForcePull = document.getElementById('btnForcePull');
    if (btnForcePull) {
      btnForcePull.addEventListener('click', async () => {
        App.showToast('מוריד נתונים מ-Google Sheets...', 'info');
        const changed = await Storage.pullFromSheets();
        Schedule.renderTables();
        Schedule.updateDropdowns();
        renderTeachersList();
        renderClassesList();
        renderSubjectsList();
        App.showToast('הנתונים סונכרנו בהצלחה', 'success');
      });
    }

    // Force Push to Sheets
    const btnForcePush = document.getElementById('btnForcePush');
    if (btnForcePush) {
      btnForcePush.addEventListener('click', async () => {
        App.showToast('מעלה נתונים ל-Google Sheets...', 'info');
        await Storage.pushToSheets();
      });
    }

    // Backup Export
    const btnExportBackup = document.getElementById('btnExportBackup');
    if (btnExportBackup) {
      btnExportBackup.addEventListener('click', () => {
        Storage.exportBackup();
        App.showToast('קובץ גיבוי הורד בהצלחה', 'success');
      });
    }

    // Backup Import
    const fileImportInput = document.getElementById('fileImportInput');
    if (fileImportInput) {
      fileImportInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          const ok = Storage.importBackup(event.target.result);
          if (ok) {
            Schedule.renderTables();
            Schedule.updateDropdowns();
            renderTeachersList();
            renderClassesList();
            renderSubjectsList();
            App.showToast('הגיבוי נטען בהצלחה!', 'success');
          } else {
            App.showToast('שגיאה בקריאת קובץ הגיבוי', 'danger');
          }
        };
        reader.readAsText(file);
      });
    }

    // Clear non-permanent bookings
    const btnClearNonPermanent = document.getElementById('btnClearNonPermanent');
    if (btnClearNonPermanent) {
      btnClearNonPermanent.addEventListener('click', () => {
        if (confirm('האם את בטוחה שברצונך לאפס את כל השיבוצים הרגילים (שאינם קבועים)? שיעורים קבועים יישמרו.')) {
          const schedule = Storage.getSchedule();
          const cleanSchedule = {};
          Object.keys(schedule).forEach(k => {
            if (schedule[k] && schedule[k].isPermanent) {
              cleanSchedule[k] = schedule[k];
            }
          });
          Storage.saveSchedule(cleanSchedule);
          Storage.saveOverrides({});
          Schedule.renderTables();
          App.showToast('כל השיבוצים הרגילים אופסו. השיעורים הקבועים נשמרו.', 'info');
        }
      });
    }
  }

  function loadSheetsSettings() {
    const urlInput = document.getElementById('gsUrlInput');
    if (urlInput) {
      urlInput.value = Storage.getGoogleSheetsUrl();
    }
  }

  return {
    init,
    getContrastColor,
    openAdminModal,
    closeAdminModal,
    setAdminMode,
    toggleAdminMode
  };
})();

// Export globally
window.Admin = Admin;
