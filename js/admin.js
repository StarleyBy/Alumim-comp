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

  // In-place editing state
  let editingTeacherId = null;
  let editingClassId = null;
  let editingSubjectId = null;

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Cascade Teacher Rename to existing schedule slots & overrides
   */
  function updateTeacherNameInSchedule(oldName, newName) {
    if (!oldName || !newName || oldName === newName) return;
    const schedule = Storage.getSchedule();
    let changed = false;
    Object.keys(schedule).forEach(k => {
      if (schedule[k].teacher === oldName) {
        schedule[k].teacher = newName;
        changed = true;
      }
      if (schedule[k].teacher2 === oldName) {
        schedule[k].teacher2 = newName;
        changed = true;
      }
    });
    if (changed) Storage.saveSchedule(schedule);

    const overrides = Storage.getOverrides();
    let oChanged = false;
    Object.keys(overrides).forEach(k => {
      if (overrides[k] && overrides[k].teacher === oldName) {
        overrides[k].teacher = newName;
        oChanged = true;
      }
      if (overrides[k] && overrides[k].teacher2 === oldName) {
        overrides[k].teacher2 = newName;
        oChanged = true;
      }
    });
    if (oChanged) Storage.saveOverrides(overrides);
  }

  /**
   * Cascade Class Rename to existing schedule slots & overrides
   */
  function updateClassNameInSchedule(oldName, newName) {
    if (!oldName || !newName || oldName === newName) return;
    const schedule = Storage.getSchedule();
    let changed = false;
    Object.keys(schedule).forEach(k => {
      if (schedule[k].className === oldName) {
        schedule[k].className = newName;
        changed = true;
      }
    });
    if (changed) Storage.saveSchedule(schedule);

    const overrides = Storage.getOverrides();
    let oChanged = false;
    Object.keys(overrides).forEach(k => {
      if (overrides[k] && overrides[k].className === oldName) {
        overrides[k].className = newName;
        oChanged = true;
      }
    });
    if (oChanged) Storage.saveOverrides(overrides);
  }

  /**
   * Cascade Subject Rename to existing schedule slots & overrides
   */
  function updateSubjectNameInSchedule(oldName, newName) {
    if (!oldName || !newName || oldName === newName) return;
    const schedule = Storage.getSchedule();
    let changed = false;
    Object.keys(schedule).forEach(k => {
      if (schedule[k].subject === oldName) {
        schedule[k].subject = newName;
        changed = true;
      }
    });
    if (changed) Storage.saveSchedule(schedule);

    const overrides = Storage.getOverrides();
    let oChanged = false;
    Object.keys(overrides).forEach(k => {
      if (overrides[k] && overrides[k].subject === oldName) {
        overrides[k].subject = newName;
        oChanged = true;
      }
    });
    if (oChanged) Storage.saveOverrides(overrides);
  }

  /**
   * Render Teachers in Admin Tab
   */
  function renderTeachersList() {
    const listEl = document.getElementById('adminTeachersList');
    if (!listEl) return;

    const teachers = [...Storage.getTeachers()].sort((a, b) => 
      (a.name || '').localeCompare(b.name || '', 'he', { sensitivity: 'base', numeric: true })
    );
    listEl.innerHTML = '';

    teachers.forEach((t) => {
      const row = document.createElement('div');
      row.className = 'item-row';
      const textColor = t.textColor || getContrastColor(t.color);

      if (t.id === editingTeacherId) {
        row.innerHTML = `
          <div class="item-edit-mode">
            <input type="text" class="form-input edit-teacher-input" value="${escapeHtml(t.name)}" data-id="${t.id}" placeholder="שם מורה חדש">
            <div style="display: flex; gap: 3px;">
              <button type="button" class="btn btn-primary btn-sm" data-action="saveEditTeacher" data-id="${t.id}" title="שמור שינוי">✓ שמור</button>
              <button type="button" class="btn btn-secondary btn-sm" data-action="cancelEditTeacher" data-id="${t.id}" title="ביטול">✕</button>
            </div>
          </div>
        `;
      } else {
        row.innerHTML = `
          <div class="item-preview">
            <span class="badge-item" style="background-color: ${t.color}; color: ${textColor}">
              👤 ${escapeHtml(t.name)}
            </span>
          </div>
          <div class="item-actions">
            <div class="color-picker-group" title="צבע רקע">
              <span class="color-label">רקע:</span>
              <input type="color" class="color-picker-input" value="${t.color}" data-field="color" data-type="teacher" data-id="${t.id}" title="בחירת צבע רקע">
            </div>
            <div class="color-picker-group" title="צבע גופן">
              <span class="color-label">גופן:</span>
              <input type="color" class="color-picker-input" value="${textColor}" data-field="textColor" data-type="teacher" data-id="${t.id}" title="בחירת צבע גופן">
            </div>
            <button type="button" class="btn btn-secondary btn-sm" title="עריכת שם" data-action="editTeacher" data-id="${t.id}">
              ✏️
            </button>
            <button type="button" class="btn btn-secondary btn-sm" title="מחיקה" data-action="deleteTeacher" data-id="${t.id}">
              🗑️
            </button>
          </div>
        `;
      }
      listEl.appendChild(row);
    });

    if (editingTeacherId) {
      const editInput = listEl.querySelector('.edit-teacher-input');
      if (editInput) {
        editInput.focus();
        editInput.select();
        editInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            saveTeacherRename(editingTeacherId, editInput.value);
          } else if (e.key === 'Escape') {
            editingTeacherId = null;
            renderTeachersList();
          }
        });
      }
    }

    const handleTeacherColorChange = (e) => {
      const id = e.target.dataset.id;
      const field = e.target.dataset.field;
      const newColor = e.target.value;
      const allTeachers = Storage.getTeachers();
      const item = allTeachers.find(x => x.id === id);
      if (item) {
        if (field === 'textColor') {
          item.textColor = newColor;
        } else {
          item.color = newColor;
        }
        Storage.saveTeachers(allTeachers);
        const row = e.target.closest('.item-row');
        if (row) {
          const badge = row.querySelector('.badge-item');
          if (badge) {
            badge.style.backgroundColor = item.color;
            badge.style.color = item.textColor || getContrastColor(item.color);
          }
        }
        Schedule.renderTables();
      }
    };

    listEl.querySelectorAll('input[type="color"]').forEach(input => {
      input.addEventListener('input', handleTeacherColorChange);
      input.addEventListener('change', handleTeacherColorChange);
    });

    listEl.querySelectorAll('[data-action="editTeacher"]').forEach(btn => {
      btn.addEventListener('click', () => {
        editingTeacherId = btn.dataset.id;
        renderTeachersList();
      });
    });

    listEl.querySelectorAll('[data-action="saveEditTeacher"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const row = btn.closest('.item-row');
        const input = row ? row.querySelector('.edit-teacher-input') : null;
        if (input) saveTeacherRename(id, input.value);
      });
    });

    listEl.querySelectorAll('[data-action="cancelEditTeacher"]').forEach(btn => {
      btn.addEventListener('click', () => {
        editingTeacherId = null;
        renderTeachersList();
      });
    });

    listEl.querySelectorAll('[data-action="deleteTeacher"]').forEach(btn => {
      btn.addEventListener('click', () => {
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

  function saveTeacherRename(id, newName) {
    newName = (newName || '').trim();
    if (!newName) {
      App.showToast('שם המורה אינו יכול להיות ריק', 'warning');
      return;
    }
    const teachers = Storage.getTeachers();
    const item = teachers.find(x => x.id === id);
    if (!item) {
      editingTeacherId = null;
      renderTeachersList();
      return;
    }
    if (item.name !== newName) {
      if (teachers.some(x => x.id !== id && x.name.toLowerCase() === newName.toLowerCase())) {
        App.showToast('מורה בשם זה כבר קיים/ת במערכת', 'warning');
        return;
      }
      const oldName = item.name;
      item.name = newName;
      Storage.saveTeachers(teachers);
      updateTeacherNameInSchedule(oldName, newName);
      Schedule.updateDropdowns();
      Schedule.renderTables();
      App.showToast(`שם המורה עודכן ל-"${newName}" ✨`, 'success');
    }
    editingTeacherId = null;
    renderTeachersList();
  }

  /**
   * Render Classes in Admin Tab
   */
  function renderClassesList() {
    const listEl = document.getElementById('adminClassesList');
    if (!listEl) return;

    const classes = [...Storage.getClasses()].sort((a, b) => 
      (a.name || '').localeCompare(b.name || '', 'he', { sensitivity: 'base', numeric: true })
    );
    listEl.innerHTML = '';

    classes.forEach((c) => {
      const row = document.createElement('div');
      row.className = 'item-row';
      const textColor = c.textColor || getContrastColor(c.color);

      if (c.id === editingClassId) {
        row.innerHTML = `
          <div class="item-edit-mode">
            <input type="text" class="form-input edit-class-input" value="${escapeHtml(c.name)}" data-id="${c.id}" placeholder="שם כיתה">
            <div style="display: flex; gap: 3px;">
              <button type="button" class="btn btn-primary btn-sm" data-action="saveEditClass" data-id="${c.id}" title="שמור שינוי">✓ שמור</button>
              <button type="button" class="btn btn-secondary btn-sm" data-action="cancelEditClass" data-id="${c.id}" title="ביטול">✕</button>
            </div>
          </div>
        `;
      } else {
        row.innerHTML = `
          <div class="item-preview">
            <span class="badge-item" style="background-color: ${c.color}; color: ${textColor}">
              👥 ${escapeHtml(c.name)}
            </span>
          </div>
          <div class="item-actions">
            <div class="color-picker-group" title="צבע רקע">
              <span class="color-label">רקע:</span>
              <input type="color" class="color-picker-input" value="${c.color}" data-field="color" data-type="class" data-id="${c.id}" title="בחירת צבע רקע">
            </div>
            <div class="color-picker-group" title="צבע גופן">
              <span class="color-label">גופן:</span>
              <input type="color" class="color-picker-input" value="${textColor}" data-field="textColor" data-type="class" data-id="${c.id}" title="בחירת צבע גופן">
            </div>
            <button type="button" class="btn btn-secondary btn-sm" title="עריכת שם" data-action="editClass" data-id="${c.id}">
              ✏️
            </button>
            <button type="button" class="btn btn-secondary btn-sm" title="מחיקה" data-action="deleteClass" data-id="${c.id}">
              🗑️
            </button>
          </div>
        `;
      }
      listEl.appendChild(row);
    });

    if (editingClassId) {
      const editInput = listEl.querySelector('.edit-class-input');
      if (editInput) {
        editInput.focus();
        editInput.select();
        editInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            saveClassRename(editingClassId, editInput.value);
          } else if (e.key === 'Escape') {
            editingClassId = null;
            renderClassesList();
          }
        });
      }
    }

    const handleClassColorChange = (e) => {
      const id = e.target.dataset.id;
      const field = e.target.dataset.field;
      const newColor = e.target.value;
      const allClasses = Storage.getClasses();
      const item = allClasses.find(x => x.id === id);
      if (item) {
        if (field === 'textColor') {
          item.textColor = newColor;
        } else {
          item.color = newColor;
        }
        Storage.saveClasses(allClasses);
        const row = e.target.closest('.item-row');
        if (row) {
          const badge = row.querySelector('.badge-item');
          if (badge) {
            badge.style.backgroundColor = item.color;
            badge.style.color = item.textColor || getContrastColor(item.color);
          }
        }
        Schedule.renderTables();
      }
    };

    listEl.querySelectorAll('input[type="color"]').forEach(input => {
      input.addEventListener('input', handleClassColorChange);
      input.addEventListener('change', handleClassColorChange);
    });

    listEl.querySelectorAll('[data-action="editClass"]').forEach(btn => {
      btn.addEventListener('click', () => {
        editingClassId = btn.dataset.id;
        renderClassesList();
      });
    });

    listEl.querySelectorAll('[data-action="saveEditClass"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const row = btn.closest('.item-row');
        const input = row ? row.querySelector('.edit-class-input') : null;
        if (input) saveClassRename(id, input.value);
      });
    });

    listEl.querySelectorAll('[data-action="cancelEditClass"]').forEach(btn => {
      btn.addEventListener('click', () => {
        editingClassId = null;
        renderClassesList();
      });
    });

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

  function saveClassRename(id, newName) {
    newName = (newName || '').trim();
    if (!newName) {
      App.showToast('שם הכיתה אינו יכול להיות ריק', 'warning');
      return;
    }
    const classes = Storage.getClasses();
    const item = classes.find(x => x.id === id);
    if (!item) {
      editingClassId = null;
      renderClassesList();
      return;
    }
    if (item.name !== newName) {
      if (classes.some(x => x.id !== id && x.name.toLowerCase() === newName.toLowerCase())) {
        App.showToast('כיתה בשם זה כבר קיימת במערכת', 'warning');
        return;
      }
      const oldName = item.name;
      item.name = newName;
      Storage.saveClasses(classes);
      updateClassNameInSchedule(oldName, newName);
      Schedule.updateDropdowns();
      Schedule.renderTables();
      App.showToast(`שם הכיתה עודכן ל-"${newName}" ✨`, 'success');
    }
    editingClassId = null;
    renderClassesList();
  }

  /**
   * Render Subjects in Admin Tab
   */
  function renderSubjectsList() {
    const listEl = document.getElementById('adminSubjectsList');
    if (!listEl) return;

    const subjects = [...Storage.getSubjects()].sort((a, b) => 
      (a.name || '').localeCompare(b.name || '', 'he', { sensitivity: 'base', numeric: true })
    );
    listEl.innerHTML = '';

    subjects.forEach((s) => {
      const row = document.createElement('div');
      row.className = 'item-row';
      const textColor = s.textColor || getContrastColor(s.color);

      if (s.id === editingSubjectId) {
        row.innerHTML = `
          <div class="item-edit-mode">
            <input type="text" class="form-input edit-subject-input" value="${escapeHtml(s.name)}" data-id="${s.id}" placeholder="שם מקצוע">
            <div style="display: flex; gap: 3px;">
              <button type="button" class="btn btn-primary btn-sm" data-action="saveEditSubject" data-id="${s.id}" title="שמור שינוי">✓ שמור</button>
              <button type="button" class="btn btn-secondary btn-sm" data-action="cancelEditSubject" data-id="${s.id}" title="ביטול">✕</button>
            </div>
          </div>
        `;
      } else {
        row.innerHTML = `
          <div class="item-preview">
            <span class="badge-item" style="background-color: ${s.color}; color: ${textColor}">
              📖 ${escapeHtml(s.name)}
            </span>
          </div>
          <div class="item-actions">
            <div class="color-picker-group" title="צבע רקע">
              <span class="color-label">רקע:</span>
              <input type="color" class="color-picker-input" value="${s.color}" data-field="color" data-type="subject" data-id="${s.id}" title="בחירת צבע רקע">
            </div>
            <div class="color-picker-group" title="צבע גופן">
              <span class="color-label">גופן:</span>
              <input type="color" class="color-picker-input" value="${textColor}" data-field="textColor" data-type="subject" data-id="${s.id}" title="בחירת צבע גופן">
            </div>
            <button type="button" class="btn btn-secondary btn-sm" title="עריכת שם" data-action="editSubject" data-id="${s.id}">
              ✏️
            </button>
            <button type="button" class="btn btn-secondary btn-sm" title="מחיקה" data-action="deleteSubject" data-id="${s.id}">
              🗑️
            </button>
          </div>
        `;
      }
      listEl.appendChild(row);
    });

    if (editingSubjectId) {
      const editInput = listEl.querySelector('.edit-subject-input');
      if (editInput) {
        editInput.focus();
        editInput.select();
        editInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            saveSubjectRename(editingSubjectId, editInput.value);
          } else if (e.key === 'Escape') {
            editingSubjectId = null;
            renderSubjectsList();
          }
        });
      }
    }

    const handleSubjectColorChange = (e) => {
      const id = e.target.dataset.id;
      const field = e.target.dataset.field;
      const newColor = e.target.value;
      const allSubjects = Storage.getSubjects();
      const item = allSubjects.find(x => x.id === id);
      if (item) {
        if (field === 'textColor') {
          item.textColor = newColor;
        } else {
          item.color = newColor;
        }
        Storage.saveSubjects(allSubjects);
        const row = e.target.closest('.item-row');
        if (row) {
          const badge = row.querySelector('.badge-item');
          if (badge) {
            badge.style.backgroundColor = item.color;
            badge.style.color = item.textColor || getContrastColor(item.color);
          }
        }
        Schedule.renderTables();
      }
    };

    listEl.querySelectorAll('input[type="color"]').forEach(input => {
      input.addEventListener('input', handleSubjectColorChange);
      input.addEventListener('change', handleSubjectColorChange);
    });

    listEl.querySelectorAll('[data-action="editSubject"]').forEach(btn => {
      btn.addEventListener('click', () => {
        editingSubjectId = btn.dataset.id;
        renderSubjectsList();
      });
    });

    listEl.querySelectorAll('[data-action="saveEditSubject"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const row = btn.closest('.item-row');
        const input = row ? row.querySelector('.edit-subject-input') : null;
        if (input) saveSubjectRename(id, input.value);
      });
    });

    listEl.querySelectorAll('[data-action="cancelEditSubject"]').forEach(btn => {
      btn.addEventListener('click', () => {
        editingSubjectId = null;
        renderSubjectsList();
      });
    });

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

  function saveSubjectRename(id, newName) {
    newName = (newName || '').trim();
    if (!newName) {
      App.showToast('שם המקצוע אינו יכול להיות ריק', 'warning');
      return;
    }
    const subjects = Storage.getSubjects();
    const item = subjects.find(x => x.id === id);
    if (!item) {
      editingSubjectId = null;
      renderSubjectsList();
      return;
    }
    if (item.name !== newName) {
      if (subjects.some(x => x.id !== id && x.name.toLowerCase() === newName.toLowerCase())) {
        App.showToast('מקצוע בשם זה כבר קיים במערכת', 'warning');
        return;
      }
      const oldName = item.name;
      item.name = newName;
      Storage.saveSubjects(subjects);
      updateSubjectNameInSchedule(oldName, newName);
      Schedule.updateDropdowns();
      Schedule.renderTables();
      App.showToast(`שם המקצוע עודכן ל-"${newName}" ✨`, 'success');
    }
    editingSubjectId = null;
    renderSubjectsList();
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
        const textColorInput = document.getElementById('newTeacherTextColor');
        const name = (nameInput.value || '').trim();
        if (!name) return;

        const teachers = Storage.getTeachers();
        if (teachers.some(t => t.name.toLowerCase() === name.toLowerCase())) {
          App.showToast('מורה זה כבר קיים ברשימה', 'warning');
          return;
        }

        const color = colorInput.value || '#e0f2fe';
        const textColor = (textColorInput && textColorInput.value) ? textColorInput.value : getContrastColor(color);
        teachers.push({
          id: 't_' + Date.now(),
          name,
          color,
          textColor
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
        const textColorInput = document.getElementById('newClassTextColor');
        const name = (nameInput.value || '').trim();
        if (!name) return;

        const classes = Storage.getClasses();
        if (classes.some(c => c.name.toLowerCase() === name.toLowerCase())) {
          App.showToast('כיתה זו כבר קיימת ברשימה', 'warning');
          return;
        }

        const color = colorInput.value || '#fef08a';
        const textColor = (textColorInput && textColorInput.value) ? textColorInput.value : getContrastColor(color);
        classes.push({
          id: 'c_' + Date.now(),
          name,
          color,
          textColor
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
        const textColorInput = document.getElementById('newSubjectTextColor');
        const name = (nameInput.value || '').trim();
        if (!name) return;

        const subjects = Storage.getSubjects();
        if (subjects.some(s => s.name.toLowerCase() === name.toLowerCase())) {
          App.showToast('מקצוע זה כבר קיים ברשימה', 'warning');
          return;
        }

        const color = colorInput.value || '#dbeafe';
        const textColor = (textColorInput && textColorInput.value) ? textColorInput.value : getContrastColor(color);
        subjects.push({
          id: 's_' + Date.now(),
          name,
          color,
          textColor
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
          Storage.pullFromSheets().then(res => {
            if (res && res.changed) {
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

    // Copy pre-configured sync share link for all teachers
    const btnCopySyncShareLink = document.getElementById('btnCopySyncShareLink');
    if (btnCopySyncShareLink) {
      btnCopySyncShareLink.addEventListener('click', async () => {
        const gsUrl = Storage.getGoogleSheetsUrl();
        if (!gsUrl) {
          App.showToast('נא להזין ולשמור כתובת Google Sheets תחילה', 'warning');
          return;
        }
        const baseUrl = window.location.origin + window.location.pathname;
        const fullShareUrl = `${baseUrl}?sync=${encodeURIComponent(gsUrl)}`;
        try {
          await navigator.clipboard.writeText(fullShareUrl);
          App.showToast('הקישור המסונכרן הועתק! שלחי אותו בוואטסאפ למורים 📋', 'success', 3500);
        } catch {
          prompt('הקישור המסונכרן למורים:', fullShareUrl);
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
