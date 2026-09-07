/**
 * CompAlumim - Storage & Synchronization Engine
 * Handles LocalStorage caching, Google Sheets Apps Script bidirectional sync,
 * default seed data with custom colors, and data persistence across weeks.
 */

const Storage = (() => {
  // Storage Keys
  const KEY_TEACHERS = 'compalumim_teachers';
  const KEY_CLASSES  = 'compalumim_classes';
  const KEY_SUBJECTS = 'compalumim_subjects';
  const KEY_SCHEDULE = 'compalumim_schedule';
  const KEY_OVERRIDES = 'compalumim_overrides';
  const KEY_GS_URL   = 'compalumim_gs_url';
  const KEY_ADMIN_ACTIVE = 'compalumim_admin_active';

  // Default Global Google Sheets Apps Script URL
  // Set this so ANY teacher opening the website on ANY device syncs automatically without setup!
  const DEFAULT_GS_URL = 'https://script.google.com/macros/s/AKfycbwvBiV8ZioYvDb95OC5KfH0ca8A1PxUT_rQxxY1MnNckLdafRSgg9Lz9PdhvT9LUEtt/exec';

  // Default Teachers with customized background and text colors
  const DEFAULT_TEACHERS = [
    { id: 't1', name: 'טטיאנה (אחראית מחשבים)', color: '#ede9fe', textColor: '#6d28d9' },
    { id: 't2', name: 'שרה לוי', color: '#e0f2fe', textColor: '#0369a1' },
    { id: 't3', name: 'דוד כהן', color: '#fef3c7', textColor: '#92400e' },
    { id: 't4', name: 'רחל אברהם', color: '#fce7f3', textColor: '#be185d' },
    { id: 't5', name: 'אלון ברק', color: '#dcfce7', textColor: '#15803d' },
    { id: 't6', name: 'מיכל שטרן', color: '#ffedd5', textColor: '#c2410c' },
    { id: 't7', name: 'יוסף מזרחי', color: '#ccfbf1', textColor: '#0f766e' },
    { id: 't8', name: 'נורית גולן', color: '#fae8ff', textColor: '#86198f' },
    { id: 't9', name: 'אילן שפירא', color: '#e2e8f0', textColor: '#334155' }
  ];

  // Default Classes with customized background and text colors
  const DEFAULT_CLASSES = [
    { id: 'c1', name: 'ז׳1', color: '#fef08a', textColor: '#854d0e' },
    { id: 'c2', name: 'ז׳2', color: '#fed7aa', textColor: '#9a3412' },
    { id: 'c3', name: 'ז׳3', color: '#fbcfe8', textColor: '#9d174d' },
    { id: 'c4', name: 'ח׳1', color: '#bae6fd', textColor: '#075985' },
    { id: 'c5', name: 'ח׳2', color: '#bbf7d0', textColor: '#166534' },
    { id: 'c6', name: 'ח׳3', color: '#ddd6fe', textColor: '#5b21b6' },
    { id: 'c7', name: 'ט׳1', color: '#fef9c3', textColor: '#713f12' },
    { id: 'c8', name: 'ט׳2', color: '#fed7aa', textColor: '#7c2d12' },
    { id: 'c9', name: 'ט׳3', color: '#99f6e4', textColor: '#115e59' },
    { id: 'c10', name: 'י׳1', color: '#e9d5ff', textColor: '#6b21a8' },
    { id: 'c11', name: 'י׳2', color: '#bfdbfe', textColor: '#1e40af' }
  ];

  // Default Subjects with customized background and text colors
  const DEFAULT_SUBJECTS = [
    { id: 's1', name: 'מדעי המחשב', color: '#dbeafe', textColor: '#1e40af' },
    { id: 's2', name: 'רובוטיקה וסייבר', color: '#cffafe', textColor: '#155e75' },
    { id: 's3', name: 'מתמטיקה', color: '#fef3c7', textColor: '#92400e' },
    { id: 's4', name: 'אנגלית', color: '#fce7f3', textColor: '#9d174d' },
    { id: 's5', name: 'מדע וטכנולוגיה', color: '#dcfce7', textColor: '#166534' },
    { id: 's6', name: 'שפה והבעה', color: '#fae8ff', textColor: '#701a75' },
    { id: 's7', name: 'מחקר ומידענות', color: '#e0e7ff', textColor: '#3730a3' },
    { id: 's8', name: 'היסטוריה', color: '#ffedd5', textColor: '#9a3412' }
  ];

  // Default Initial Schedule Bookings (Base recurring schedule)
  // key format: `${room}_${day}_${period}`
  // room: 'lab' | 'library'
  // day: 0..5 (0=Sunday, 5=Friday)
  // period: 1..9
  const DEFAULT_SCHEDULE = {
    // Permanent computer lab lesson for Tatiana (only admin can edit)
    'lab_0_1': {
      room: 'lab',
      day: 0,
      period: 1,
      teacher: 'טטיאנה (אחראית מחשבים)',
      teacher2: '',
      className: 'ט׳1',
      subject: 'מדעי המחשב',
      isPermanent: true,
      updatedAt: new Date().toISOString()
    },
    'lab_0_2': {
      room: 'lab',
      day: 0,
      period: 2,
      teacher: 'טטיאנה (אחראית מחשבים)',
      teacher2: '',
      className: 'ט׳1',
      subject: 'מדעי המחשב',
      isPermanent: true,
      updatedAt: new Date().toISOString()
    },
    // Showcase Joint Lesson (Co-teaching with 2 teachers)
    'lab_2_2': {
      room: 'lab',
      day: 2,
      period: 2,
      teacher: 'דוד כהן',
      teacher2: 'שרה לוי',
      className: 'ז׳1',
      subject: 'רובוטיקה וסייבר',
      isPermanent: false,
      updatedAt: new Date().toISOString()
    },
    'lab_1_3': {
      room: 'lab',
      day: 1,
      period: 3,
      teacher: 'אלון ברק',
      teacher2: '',
      className: 'ח׳2',
      subject: 'רובוטיקה וסייבר',
      isPermanent: true,
      updatedAt: new Date().toISOString()
    },
    // Regular lesson in Library (persists week-to-week until user modifies)
    'library_0_2': {
      room: 'library',
      day: 0,
      period: 2,
      teacher: 'מיכל שטרן',
      teacher2: '',
      className: 'ז׳2',
      subject: 'שפה והבעה',
      isPermanent: false,
      updatedAt: new Date().toISOString()
    },
    'library_2_4': {
      room: 'library',
      day: 2,
      period: 4,
      teacher: 'יוסף מזרחי',
      teacher2: '',
      className: 'ח׳1',
      subject: 'מחקר ומידענות',
      isPermanent: false,
      updatedAt: new Date().toISOString()
    }
  };

  // Sync state variables
  let syncInProgress = false;
  let pendingPush = false;
  let pushDebounceTimer = null;
  let syncStatusListeners = [];
  let remoteUpdateListeners = [];
  let broadcastChannel = null;

  // Initialize BroadcastChannel for 0ms same-device multi-tab synchronization
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      broadcastChannel = new BroadcastChannel('compalumim_bus');
      broadcastChannel.onmessage = (event) => {
        if (event && event.data && event.data.type === 'SCHEDULE_UPDATED') {
          emitRemoteUpdate(event.data.changedKeys || []);
        }
      };
    }
  } catch (e) {
    console.warn('BroadcastChannel initialization error:', e);
  }

  // Also listen to window storage event as a fallback
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key === KEY_SCHEDULE || e.key === KEY_OVERRIDES || e.key === KEY_TEACHERS || e.key === KEY_CLASSES || e.key === KEY_SUBJECTS) {
        emitRemoteUpdate([]);
      }
    });
  }

  function broadcastLocalChange(changedKeys = []) {
    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage({
          type: 'SCHEDULE_UPDATED',
          changedKeys,
          timestamp: Date.now()
        });
      } catch (e) {
        console.warn('Broadcast post error:', e);
      }
    }
  }

  function onRemoteUpdate(cb) {
    if (typeof cb === 'function') remoteUpdateListeners.push(cb);
  }

  function emitRemoteUpdate(changedKeys = []) {
    remoteUpdateListeners.forEach(cb => {
      try { cb(changedKeys); } catch (e) { console.error(e); }
    });
  }

  // ── Auto-Detect Sync URL from Query Parameters (e.g. ?sync=... or ?gs=...) ──
  function checkUrlSyncParam() {
    try {
      if (typeof window === 'undefined' || !window.location || !window.location.search) return;
      const params = new URLSearchParams(window.location.search);
      const rawSyncUrl = params.get('sync') || params.get('gs');
      if (rawSyncUrl) {
        const decoded = decodeURIComponent(rawSyncUrl).trim();
        if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
          setGoogleSheetsUrl(decoded);
          // Clean up address bar without reloading
          const urlObj = new URL(window.location);
          urlObj.searchParams.delete('sync');
          urlObj.searchParams.delete('gs');
          window.history.replaceState({}, '', urlObj.pathname + urlObj.search + urlObj.hash);
          // Immediately trigger pull on startup and refresh schedule
          setTimeout(() => {
            pullFromSheets().then(() => {
              if (window.Schedule) {
                Schedule.renderTables();
                Schedule.updateDropdowns();
              }
            });
          }, 60);
        }
      }
    } catch (e) {
      console.warn('URL sync param check failed:', e);
    }
  }

  // ── Local Storage Accessors ──

  function getTeachers() {
    try {
      const data = localStorage.getItem(KEY_TEACHERS);
      if (data) return JSON.parse(data);
      return getGoogleSheetsUrl() ? [] : DEFAULT_TEACHERS;
    } catch {
      return getGoogleSheetsUrl() ? [] : DEFAULT_TEACHERS;
    }
  }

  function saveTeachers(teachers) {
    localStorage.setItem(KEY_TEACHERS, JSON.stringify(teachers));
    broadcastLocalChange();
    schedulePush();
  }

  function getClasses() {
    try {
      const data = localStorage.getItem(KEY_CLASSES);
      if (data) return JSON.parse(data);
      return getGoogleSheetsUrl() ? [] : DEFAULT_CLASSES;
    } catch {
      return getGoogleSheetsUrl() ? [] : DEFAULT_CLASSES;
    }
  }

  function saveClasses(classes) {
    localStorage.setItem(KEY_CLASSES, JSON.stringify(classes));
    broadcastLocalChange();
    schedulePush();
  }

  function getSubjects() {
    try {
      const data = localStorage.getItem(KEY_SUBJECTS);
      if (data) return JSON.parse(data);
      return getGoogleSheetsUrl() ? [] : DEFAULT_SUBJECTS;
    } catch {
      return getGoogleSheetsUrl() ? [] : DEFAULT_SUBJECTS;
    }
  }

  function saveSubjects(subjects) {
    localStorage.setItem(KEY_SUBJECTS, JSON.stringify(subjects));
    broadcastLocalChange();
    schedulePush();
  }

  // Normalize co-teaching teachers if entered combined in a single string
  function normalizeSlotTeachers(slot) {
    if (!slot || typeof slot !== 'object') return slot;
    if (slot.teacher && !slot.teacher2) {
      const splitMatch = String(slot.teacher).split(/\s*(?:[+/&,]|(?:\s+ו(?:\s+|$)))\s*/);
      if (splitMatch.length >= 2 && splitMatch[0] && splitMatch[1]) {
        slot.teacher = splitMatch[0].trim();
        slot.teacher2 = splitMatch[1].trim();
      }
    }
    return slot;
  }

  function getSchedule() {
    try {
      const data = localStorage.getItem(KEY_SCHEDULE);
      const schedule = data ? JSON.parse(data) : (getGoogleSheetsUrl() ? {} : DEFAULT_SCHEDULE);
      if (schedule && typeof schedule === 'object') {
        Object.keys(schedule).forEach(k => {
          normalizeSlotTeachers(schedule[k]);
        });
      }
      return schedule;
    } catch {
      return getGoogleSheetsUrl() ? {} : DEFAULT_SCHEDULE;
    }
  }

  function saveSchedule(schedule, changedKey = null) {
    if (schedule && typeof schedule === 'object') {
      Object.keys(schedule).forEach(k => {
        normalizeSlotTeachers(schedule[k]);
      });
    }
    localStorage.setItem(KEY_SCHEDULE, JSON.stringify(schedule));
    const keys = changedKey ? [changedKey] : [];
    broadcastLocalChange(keys);
    schedulePush();
  }

  // Week-specific overrides (for temporary cancellations or one-off changes)
  function getOverrides() {
    try {
      const data = localStorage.getItem(KEY_OVERRIDES);
      const overrides = data ? JSON.parse(data) : {};
      if (overrides && typeof overrides === 'object') {
        Object.keys(overrides).forEach(k => {
          normalizeSlotTeachers(overrides[k]);
        });
      }
      return overrides;
    } catch {
      return {};
    }
  }

  function saveOverrides(overrides, changedKey = null) {
    if (overrides && typeof overrides === 'object') {
      Object.keys(overrides).forEach(k => {
        normalizeSlotTeachers(overrides[k]);
      });
    }
    localStorage.setItem(KEY_OVERRIDES, JSON.stringify(overrides));
    const keys = changedKey ? [changedKey] : [];
    broadcastLocalChange(keys);
    schedulePush();
  }

  function getGoogleSheetsUrl() {
    return localStorage.getItem(KEY_GS_URL) || DEFAULT_GS_URL || '';
  }

  function setGoogleSheetsUrl(url) {
    localStorage.setItem(KEY_GS_URL, (url || '').trim());
  }

  function isAdminActive() {
    return localStorage.getItem(KEY_ADMIN_ACTIVE) === 'true';
  }

  function setAdminActive(isActive) {
    localStorage.setItem(KEY_ADMIN_ACTIVE, isActive ? 'true' : 'false');
  }

  // Helper: Find color mapping
  function getTeacherByName(name) {
    return getTeachers().find(t => t.name === name) || { name, color: '#eff6ff', textColor: '#1e40af' };
  }

  function getClassByName(name) {
    return getClasses().find(c => c.name === name) || { name, color: '#fef3c7', textColor: '#92400e' };
  }

  function getSubjectByName(name) {
    if (!name) return null;
    return getSubjects().find(s => s.name === name) || { name, color: '#f1f5f9', textColor: '#334155' };
  }

  // ── Initialization Check ──
  function initDefaults() {
    checkUrlSyncParam();

    const hasRemote = Boolean(getGoogleSheetsUrl());

    if (!localStorage.getItem(KEY_TEACHERS)) {
      localStorage.setItem(KEY_TEACHERS, JSON.stringify(hasRemote ? [] : DEFAULT_TEACHERS));
    }
    if (!localStorage.getItem(KEY_CLASSES)) {
      localStorage.setItem(KEY_CLASSES, JSON.stringify(hasRemote ? [] : DEFAULT_CLASSES));
    }
    if (!localStorage.getItem(KEY_SUBJECTS)) {
      localStorage.setItem(KEY_SUBJECTS, JSON.stringify(hasRemote ? [] : DEFAULT_SUBJECTS));
    }
    if (!localStorage.getItem(KEY_SCHEDULE)) {
      localStorage.setItem(KEY_SCHEDULE, JSON.stringify(hasRemote ? {} : DEFAULT_SCHEDULE));
    }

    // Auto-pull from cloud on initial boot if URL is configured
    if (hasRemote) {
      setTimeout(() => {
        pullFromSheets().then((res) => {
          if (res && res.changed) {
            if (window.Schedule) {
              Schedule.renderTables();
              Schedule.updateDropdowns();
            }
          }
        });
      }, 50);
    }
  }

  // ── Sync Status Handling ──
  function onSyncStatusChange(cb) {
    if (typeof cb === 'function') syncStatusListeners.push(cb);
  }

  function emitSyncStatus(status, message = '') {
    syncStatusListeners.forEach(cb => {
      try { cb(status, message); } catch(e) { console.error(e); }
    });
  }

  // ── Rapid Debounced Remote Push (150ms for near-instant sync) ──
  function schedulePush() {
    const url = getGoogleSheetsUrl();
    if (!url) {
      emitSyncStatus('local', 'שמור מקומית בדפדפן');
      return;
    }
    if (pushDebounceTimer) clearTimeout(pushDebounceTimer);
    pushDebounceTimer = setTimeout(() => {
      pushToSheets();
    }, 150);
  }

  // ── Pull Data from Google Sheets ──
  async function pullFromSheets() {
    const url = getGoogleSheetsUrl();
    if (!url) {
      emitSyncStatus('local', 'מצב מקומי');
      return { changed: false, changedKeys: [] };
    }

    emitSyncStatus('syncing', 'מסנכרן...');
    try {
      const response = await fetch(`${url}?v=${Date.now()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();

      if (!json.ok) throw new Error(json.error || 'Unknown error');

      const data = json.data || {};
      let changed = false;
      const changedKeys = [];

      // Compare schedule diff
      if (data.schedule && typeof data.schedule === 'object') {
        Object.keys(data.schedule).forEach(k => {
          normalizeSlotTeachers(data.schedule[k]);
        });
        const currentStr = localStorage.getItem(KEY_SCHEDULE) || '{}';
        const newStr = JSON.stringify(data.schedule);
        if (currentStr !== newStr) {
          const current = JSON.parse(currentStr);
          const allKeys = new Set([...Object.keys(current), ...Object.keys(data.schedule)]);
          allKeys.forEach(k => {
            if (JSON.stringify(current[k]) !== JSON.stringify(data.schedule[k])) {
              changedKeys.push(k);
            }
          });
          localStorage.setItem(KEY_SCHEDULE, newStr);
          changed = true;
        }
      }

      // Compare overrides diff
      if (data.overrides && typeof data.overrides === 'object') {
        Object.keys(data.overrides).forEach(k => {
          normalizeSlotTeachers(data.overrides[k]);
        });
        const currentOStr = localStorage.getItem(KEY_OVERRIDES) || '{}';
        const newOStr = JSON.stringify(data.overrides);
        if (currentOStr !== newOStr) {
          localStorage.setItem(KEY_OVERRIDES, newOStr);
          changed = true;
        }
      }

      if (data.teachers && Array.isArray(data.teachers)) {
        const sanitizedTeachers = data.teachers
          .map(t => ({
            ...t,
            id: String(t.id || ''),
            name: String(t.name !== undefined && t.name !== null ? t.name : '').trim(),
            color: t.color || '#e0f2fe',
            textColor: t.textColor || '#0369a1'
          }))
          .filter(t => t.name.length > 0);

        const currentTStr = localStorage.getItem(KEY_TEACHERS) || '[]';
        const newTStr = JSON.stringify(sanitizedTeachers);
        if (currentTStr !== newTStr) {
          localStorage.setItem(KEY_TEACHERS, newTStr);
          changed = true;
        }
      }

      if (data.classes && Array.isArray(data.classes)) {
        const sanitizedClasses = data.classes
          .map(c => ({
            ...c,
            id: String(c.id || ''),
            name: String(c.name !== undefined && c.name !== null ? c.name : '').trim(),
            color: c.color || '#fef08a',
            textColor: c.textColor || '#854d0e'
          }))
          .filter(c => c.name.length > 0);

        const currentCStr = localStorage.getItem(KEY_CLASSES) || '[]';
        const newCStr = JSON.stringify(sanitizedClasses);
        if (currentCStr !== newCStr) {
          localStorage.setItem(KEY_CLASSES, newCStr);
          changed = true;
        }
      }

      if (data.subjects && Array.isArray(data.subjects)) {
        const sanitizedSubjects = data.subjects
          .map(s => ({
            ...s,
            id: String(s.id || ''),
            name: String(s.name !== undefined && s.name !== null ? s.name : '').trim(),
            color: s.color || '#dbeafe',
            textColor: s.textColor || '#1e40af'
          }))
          .filter(s => s.name.length > 0);

        const currentSStr = localStorage.getItem(KEY_SUBJECTS) || '[]';
        const newSStr = JSON.stringify(sanitizedSubjects);
        if (currentSStr !== newSStr) {
          localStorage.setItem(KEY_SUBJECTS, newSStr);
          changed = true;
        }
      }

      emitSyncStatus('synced', 'מסונכרן ✓');
      if (changed) {
        emitRemoteUpdate(changedKeys);
      }
      return { changed, changedKeys };
    } catch (err) {
      console.warn('Sheets pull error:', err);
      emitSyncStatus('error', 'שגיאת חיבור ל-Sheets');
      return { changed: false, changedKeys: [] };
    }
  }

  // ── Push Data to Google Sheets ──
  async function pushToSheets() {
    const url = getGoogleSheetsUrl();
    if (!url) {
      emitSyncStatus('local', 'שמור מקומית בדפדפן');
      return;
    }

    if (syncInProgress) {
      pendingPush = true;
      return;
    }

    syncInProgress = true;
    emitSyncStatus('syncing', 'שומר נתונים בענן...');

    try {
      const payload = {
        action: 'setAll',
        data: {
          teachers: getTeachers(),
          classes: getClasses(),
          subjects: getSubjects(),
          schedule: getSchedule(),
          overrides: getOverrides(),
          timestamp: new Date().toISOString()
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      if (!json.ok) throw new Error(json.error || 'Server error');

      emitSyncStatus('synced', 'נשמר בענן ✓');
    } catch (err) {
      console.warn('Sheets push error:', err);
      emitSyncStatus('error', 'שגיאת שליחה ל-Sheets');
    } finally {
      syncInProgress = false;
      if (pendingPush) {
        pendingPush = false;
        pushToSheets();
      }
    }
  }

  // ── Export / Import Backup ──
  function exportBackup() {
    const backup = {
      teachers: getTeachers(),
      classes: getClasses(),
      subjects: getSubjects(),
      schedule: getSchedule(),
      overrides: getOverrides(),
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compalumim-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importBackup(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.teachers) localStorage.setItem(KEY_TEACHERS, JSON.stringify(parsed.teachers));
      if (parsed.classes) localStorage.setItem(KEY_CLASSES, JSON.stringify(parsed.classes));
      if (parsed.subjects) localStorage.setItem(KEY_SUBJECTS, JSON.stringify(parsed.subjects));
      if (parsed.schedule) localStorage.setItem(KEY_SCHEDULE, JSON.stringify(parsed.schedule));
      if (parsed.overrides) localStorage.setItem(KEY_OVERRIDES, JSON.stringify(parsed.overrides));
      schedulePush();
      return true;
    } catch (e) {
      console.error('Import error:', e);
      return false;
    }
  }

  // Initialize on load
  initDefaults();

  return {
    getTeachers,
    saveTeachers,
    getClasses,
    saveClasses,
    getSubjects,
    saveSubjects,
    getSchedule,
    saveSchedule,
    getOverrides,
    saveOverrides,
    getTeacherByName,
    getClassByName,
    getSubjectByName,
    getGoogleSheetsUrl,
    setGoogleSheetsUrl,
    isAdminActive,
    setAdminActive,
    onSyncStatusChange,
    onRemoteUpdate,
    pullFromSheets,
    pushToSheets,
    schedulePush,
    exportBackup,
    importBackup
  };
})();

// Export globally
window.Storage = Storage;
