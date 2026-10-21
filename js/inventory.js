/**
 * CompAlumim - Inventory Management Engine (אינוונטריזציה)
 * Exclusively for Admin (Tatiana):
 * - Comprehensive tracking of school computers, laptops, projectors, and equipment
 * - Adding & editing records via Dialog Form Modal
 * - In-table direct editing (редактирование таблицы из приложения)
 * - Customizable dropdown lists (Lookups) with add/edit/delete capability
 * - Real-time Google Sheets synchronization & offline caching
 * - Search, filter by status/type/room, statistics overview, CSV & Print export
 */

const Inventory = (() => {
  // DOM Elements
  let modalEl = null;
  let itemModalEl = null;
  let lookupsModalEl = null;
  let tableEl = null;
  let searchInputEl = null;
  let filterStatusEl = null;
  let filterTypeEl = null;
  let filterLocationEl = null;

  // State
  let isInlineEditMode = false;
  let currentEditingItemId = null;
  let activeLookupCategory = 'types';

  /**
   * Status appearance and icons
   */
  const STATUS_CONFIG = {
    'תקין / עובד': {
      className: 'status-ok',
      icon: '🟢',
      label: 'תקין / עובד',
      bg: 'rgba(22, 163, 74, 0.12)',
      text: '#15803d',
      border: 'rgba(22, 163, 74, 0.35)'
    },
    'יש בעיה / תקול': {
      className: 'status-problem',
      icon: '🟠',
      label: 'יש בעיה / תקול',
      bg: 'rgba(217, 119, 6, 0.12)',
      text: '#b45309',
      border: 'rgba(217, 119, 6, 0.35)'
    },
    'מושבת / שבור': {
      className: 'status-broken',
      icon: '🔴',
      label: 'מושבת / שבור',
      bg: 'rgba(220, 38, 38, 0.12)',
      text: '#b91c1c',
      border: 'rgba(220, 38, 38, 0.35)'
    },
    'במחסן': {
      className: 'status-storage',
      icon: '📦',
      label: 'במחסן',
      bg: 'rgba(100, 116, 139, 0.12)',
      text: '#475569',
      border: 'rgba(100, 116, 139, 0.35)'
    },
    'בשימוש': {
      className: 'status-inuse',
      icon: '💼',
      label: 'בשימוש',
      bg: 'rgba(37, 99, 235, 0.12)',
      text: '#1d4ed8',
      border: 'rgba(37, 99, 235, 0.35)'
    }
  };

  /**
   * Helper: Escape HTML
   */
  function escapeHtml(str) {
    if (!str && str !== 0) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Helper: Format Date for Display (YYYY-MM-DD -> DD/MM/YYYY)
   */
  function formatDateDisplay(dateStr) {
    if (!dateStr) return '—';
    const parts = String(dateStr).slice(0, 10).split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  /**
   * Helper: Get Today's Date formatted YYYY-MM-DD
   */
  function getTodayIsoDate() {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  }

  /**
   * Helper: Get Status configuration
   */
  function getStatusConfig(status) {
    if (status && STATUS_CONFIG[status]) return STATUS_CONFIG[status];
    // Loose matching
    if (status) {
      if (status.includes('עובד') || status.includes('תקין')) return STATUS_CONFIG['תקין / עובד'];
      if (status.includes('בעיה') || status.includes('תקול')) return STATUS_CONFIG['יש בעיה / תקול'];
      if (status.includes('מושבת') || status.includes('שבור') || status.includes('סלומן')) return STATUS_CONFIG['מושבת / שבור'];
      if (status.includes('מחסן')) return STATUS_CONFIG['במחסן'];
      if (status.includes('שימוש')) return STATUS_CONFIG['בשימוש'];
    }
    return {
      className: 'status-default',
      icon: '🔹',
      label: status || 'לא הוגדר',
      bg: 'rgba(100, 116, 139, 0.08)',
      text: '#64748b',
      border: 'rgba(100, 116, 139, 0.25)'
    };
  }

  /**
   * Initialize Inventory Module
   */
  function init() {
    modalEl = document.getElementById('inventoryModal');
    itemModalEl = document.getElementById('inventoryItemModal');
    lookupsModalEl = document.getElementById('inventoryLookupsModal');
    tableEl = document.getElementById('inventoryTable');

    searchInputEl = document.getElementById('invSearchInput');
    filterStatusEl = document.getElementById('invFilterStatus');
    filterTypeEl = document.getElementById('invFilterType');
    filterLocationEl = document.getElementById('invFilterLocation');

    // Admin Banner Button
    const btnOpenBanner = document.getElementById('btnOpenInventory');
    if (btnOpenBanner) {
      btnOpenBanner.addEventListener('click', () => {
        openModal();
      });
    }

    // Admin Modal Inventory Tab trigger
    const adminTabInvBtn = document.querySelector('.admin-tab[data-tab="inventory"]');
    if (adminTabInvBtn) {
      adminTabInvBtn.addEventListener('click', () => {
        renderAdminModalSummary();
      });
    }

    const btnLaunchFromAdmin = document.getElementById('btnLaunchFullInventory');
    if (btnLaunchFromAdmin) {
      btnLaunchFromAdmin.addEventListener('click', () => {
        Admin.closeAdminModal();
        openModal();
      });
    }

    // Modal Close Buttons
    const btnCloseModal = document.getElementById('inventoryModalClose');
    if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
    const btnCloseFooter = document.getElementById('inventoryModalFooterClose');
    if (btnCloseFooter) btnCloseFooter.addEventListener('click', closeModal);

    // Item Dialog Close Buttons
    const btnCloseItemModal = document.getElementById('inventoryItemModalClose');
    if (btnCloseItemModal) btnCloseItemModal.addEventListener('click', closeItemModal);
    const btnCancelItem = document.getElementById('btnCancelInventoryItem');
    if (btnCancelItem) btnCancelItem.addEventListener('click', closeItemModal);

    // Lookups Modal Close Buttons
    const btnCloseLookups = document.getElementById('inventoryLookupsClose');
    if (btnCloseLookups) btnCloseLookups.addEventListener('click', closeLookupsModal);
    const btnCloseLookupsFooter = document.getElementById('inventoryLookupsFooterClose');
    if (btnCloseLookupsFooter) btnCloseLookupsFooter.addEventListener('click', closeLookupsModal);

    // Add New Item Button
    const btnAddItem = document.getElementById('btnAddInventoryItem');
    if (btnAddItem) {
      btnAddItem.addEventListener('click', () => {
        openItemModal(null);
      });
    }

    // In-Table Inline Edit Toggle Button
    const btnToggleInlineEdit = document.getElementById('btnToggleInlineEdit');
    if (btnToggleInlineEdit) {
      btnToggleInlineEdit.addEventListener('click', () => {
        toggleInlineEditMode();
      });
    }

    // Add Row Directly in Table (Available in Inline Edit Mode)
    const btnAddInlineRow = document.getElementById('btnAddInlineRow');
    if (btnAddInlineRow) {
      btnAddInlineRow.addEventListener('click', () => {
        addNewRowInline();
      });
    }

    // Manage Lookups Button
    const btnManageLookups = document.getElementById('btnManageLookups');
    if (btnManageLookups) {
      btnManageLookups.addEventListener('click', () => {
        openLookupsModal();
      });
    }

    // Export CSV Button
    const btnExportCsv = document.getElementById('btnExportInventoryCsv');
    if (btnExportCsv) {
      btnExportCsv.addEventListener('click', exportCsv);
    }

    // Print Button
    const btnPrint = document.getElementById('btnPrintInventory');
    if (btnPrint) {
      btnPrint.addEventListener('click', () => {
        window.print();
      });
    }

    // Search and Filter Events
    if (searchInputEl) {
      searchInputEl.addEventListener('input', () => renderTable());
    }
    const btnClearSearch = document.getElementById('btnClearInvSearch');
    if (btnClearSearch && searchInputEl) {
      btnClearSearch.addEventListener('click', () => {
        searchInputEl.value = '';
        renderTable();
        searchInputEl.focus();
      });
    }
    if (filterStatusEl) filterStatusEl.addEventListener('change', () => renderTable());
    if (filterTypeEl) filterTypeEl.addEventListener('change', () => renderTable());
    if (filterLocationEl) filterLocationEl.addEventListener('change', () => renderTable());

    // Item Form Submit Handler
    const formItem = document.getElementById('inventoryItemForm');
    if (formItem) {
      formItem.addEventListener('submit', handleItemFormSubmit);
    }

    // Status change listener in Item Form to auto-update status date
    const itemStatusSelect = document.getElementById('invItemStatus');
    if (itemStatusSelect) {
      itemStatusSelect.addEventListener('change', () => {
        const dateInput = document.getElementById('invItemStatusDate');
        if (dateInput) {
          dateInput.value = getTodayIsoDate();
        }
      });
    }

    // Setup Quick Add buttons next to selects in Item Dialog (+ חדש)
    setupQuickAddButtons();

    // Setup Lookups Manager
    setupLookupsManager();

    // Listen to remote changes
    Storage.onRemoteUpdate((changedKeys) => {
      if (!changedKeys || changedKeys.length === 0 || changedKeys.includes('inventory') || changedKeys.includes('inventoryLookups')) {
        if (modalEl && modalEl.classList.contains('active')) {
          populateFilterDropdowns();
          renderStats();
          renderTable();
        }
        renderAdminModalSummary();
      }
    });
  }

  /**
   * Setup "+ חדש" quick buttons next to select elements in item modal
   */
  function setupQuickAddButtons() {
    const quickAddButtons = document.querySelectorAll('.btn-quick-add-lookup');
    quickAddButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const category = btn.dataset.category;
        const targetSelectId = btn.dataset.target;
        if (!category || !targetSelectId) return;

        const catNames = {
          types: 'סוג ציוד',
          brands: 'מותג / דגם',
          locations: 'מיקום / כיתה / אצל מי',
          issues: 'סוג תקלה'
        };
        const title = catNames[category] || 'פריט חדש';
        const newVal = prompt(`הזן ${title} חדש לרשימה:`);
        if (newVal && newVal.trim()) {
          const trimmed = newVal.trim();
          Storage.addInventoryLookupItem(category, trimmed);
          // Refresh item modal dropdowns
          populateItemSelects();
          const targetSelect = document.getElementById(targetSelectId);
          if (targetSelect) {
            targetSelect.value = trimmed;
          }
          // Refresh filter dropdowns
          populateFilterDropdowns();
          App.showToast(`"${trimmed}" נוסף לרשימת ה-${title}`, 'success');
        }
      });
    });
  }

  /**
   * Open the Main Inventory Modal (Admin Only)
   */
  function openModal() {
    if (!Storage.isAdminActive()) {
      App.showToast('גישה חסומה: רק למנהלת המערכת (טטיאנה) יש הרשאה לניהול אינוונטר', 'danger');
      return;
    }

    if (!modalEl) modalEl = document.getElementById('inventoryModal');
    if (!modalEl) return;

    // Reset filters
    if (searchInputEl) searchInputEl.value = '';
    if (filterStatusEl) filterStatusEl.value = '';
    if (filterTypeEl) filterTypeEl.value = '';
    if (filterLocationEl) filterLocationEl.value = '';

    populateFilterDropdowns();
    renderStats();
    renderTable();

    modalEl.classList.add('active');
  }

  /**
   * Close the Main Inventory Modal
   */
  function closeModal() {
    if (!modalEl) return;
    modalEl.classList.remove('active');
  }

  /**
   * Populate Filters (Status, Types, Locations)
   */
  function populateFilterDropdowns() {
    const lookups = Storage.getInventoryLookups();

    // Type filter
    if (filterTypeEl) {
      const currentVal = filterTypeEl.value;
      filterTypeEl.innerHTML = '<option value="">כל סוגי הציוד (הכל)</option>';
      (lookups.types || []).forEach(type => {
        const opt = document.createElement('option');
        opt.value = type;
        opt.textContent = type;
        filterTypeEl.appendChild(opt);
      });
      filterTypeEl.value = currentVal;
    }

    // Location filter
    if (filterLocationEl) {
      const currentVal = filterLocationEl.value;
      filterLocationEl.innerHTML = '<option value="">כל המיקומים (הכל)</option>';
      (lookups.locations || []).forEach(loc => {
        const opt = document.createElement('option');
        opt.value = loc;
        opt.textContent = loc;
        filterLocationEl.appendChild(opt);
      });
      filterLocationEl.value = currentVal;
    }
  }

  /**
   * Render Top Statistics Cards
   */
  function renderStats() {
    const items = Storage.getInventory();
    const total = items.length;

    let countWorking = 0;
    let countProblem = 0;
    let countBroken = 0;
    let countStorage = 0;
    let countInUse = 0;

    items.forEach(it => {
      const st = String(it.status || '');
      if (st.includes('עובד') || st.includes('תקין')) countWorking++;
      else if (st.includes('בעיה') || st.includes('תקול')) countProblem++;
      else if (st.includes('מושבת') || st.includes('שבור')) countBroken++;
      else if (st.includes('מחסן')) countStorage++;
      else if (st.includes('שימוש')) countInUse++;
      else countWorking++;
    });

    const setEl = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setEl('statTotalItems', total);
    setEl('statWorkingItems', countWorking);
    setEl('statProblemItems', countProblem);
    setEl('statBrokenItems', countBroken);
    setEl('statStorageItems', countStorage);
    setEl('statInUseItems', countInUse);
  }

  /**
   * Render Inventory Data Table
   */
  function renderTable() {
    if (!tableEl) return;

    const items = Storage.getInventory();
    const searchTerm = (searchInputEl && searchInputEl.value ? searchInputEl.value : '').trim().toLowerCase();
    const filterStatus = filterStatusEl ? filterStatusEl.value : '';
    const filterType = filterTypeEl ? filterTypeEl.value : '';
    const filterLocation = filterLocationEl ? filterLocationEl.value : '';

    const lookups = Storage.getInventoryLookups();

    // Filter items
    const filtered = items.filter(it => {
      if (filterStatus && it.status !== filterStatus) return false;
      if (filterType && it.type !== filterType) return false;
      if (filterLocation && it.location !== filterLocation) return false;

      if (searchTerm) {
        const str = `${it.seq} ${it.type} ${it.brand} ${it.status} ${it.location} ${it.issue} ${it.notes}`.toLowerCase();
        if (!str.includes(searchTerm)) return false;
      }
      return true;
    });

    // Sort by seq ascending
    filtered.sort((a, b) => (Number(a.seq) || 0) - (Number(b.seq) || 0));

    // Update count indicator
    const counterEl = document.getElementById('invFilteredCount');
    if (counterEl) {
      counterEl.textContent = `מציג ${filtered.length} מתוך ${items.length} פריטים`;
    }

    // Toggle row add button visibility based on mode
    const btnAddInlineRow = document.getElementById('btnAddInlineRow');
    if (btnAddInlineRow) {
      btnAddInlineRow.style.display = isInlineEditMode ? 'inline-flex' : 'none';
    }

    const btnToggleInlineEdit = document.getElementById('btnToggleInlineEdit');
    if (btnToggleInlineEdit) {
      btnToggleInlineEdit.classList.toggle('active', isInlineEditMode);
      btnToggleInlineEdit.innerHTML = isInlineEditMode
        ? '<span>✓</span><span>סיום עריכה ישירה</span>'
        : '<span>✏️</span><span>עריכה ישירה בטבלה</span>';
    }

    if (filtered.length === 0) {
      tableEl.innerHTML = `
        <thead>
          <tr>
            <th style="width: 45px;">מס״ד</th>
            <th>סוג ציוד</th>
            <th>מותג / דגם</th>
            <th>סטטוס</th>
            <th>מיקום</th>
            <th>תאריך שינוי סטטוס</th>
            <th>פירוט תקלה</th>
            <th>הערות</th>
            <th style="width: 100px;">פעולות</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colspan="9" class="inv-empty-state">
              <div class="empty-icon">📦</div>
              <div class="empty-title">לא נמצאו פריטי ציוד</div>
              <div class="empty-desc">נסה לשנות את מסנני החיפוש או הוסף פריט חדש לאינוונטר</div>
              <button type="button" class="btn btn-primary btn-sm" onclick="Inventory.openItemModal(null)">
                ➕ הוסף פריט ציוד ראשון
              </button>
            </td>
          </tr>
        </tbody>
      `;
      return;
    }

    // Build Table
    let html = `
      <thead>
        <tr>
          <th style="width: 48px;" title="מספר סידורי">מס״ד</th>
          <th style="min-width: 130px;">סוג ציוד</th>
          <th style="min-width: 150px;">מותג / דגם</th>
          <th style="min-width: 130px;">סטטוס</th>
          <th style="min-width: 140px;">מיקום</th>
          <th style="min-width: 120px;">תאריך סטטוס</th>
          <th style="min-width: 150px;">פירוט תקלה</th>
          <th style="min-width: 160px;">הערות</th>
          <th style="width: 90px; text-align: center;">פעולות</th>
        </tr>
      </thead>
      <tbody>
    `;

    filtered.forEach(item => {
      const stCfg = getStatusConfig(item.status);
      const isIssue = item.issue && !item.issue.includes('תקין') && !item.issue.includes('ללא תקלה');

      if (!isInlineEditMode) {
        // Normal Display Mode
        html += `
          <tr class="inv-row" data-id="${escapeHtml(item.id)}" title="לחץ פעמיים לעריכה מהירה">
            <td class="inv-cell-seq"><strong>#${escapeHtml(item.seq)}</strong></td>
            <td class="inv-cell-type">
              <span class="inv-type-pill">${escapeHtml(item.type || '—')}</span>
            </td>
            <td class="inv-cell-brand"><strong>${escapeHtml(item.brand || '—')}</strong></td>
            <td class="inv-cell-status">
              <span class="inv-status-badge ${stCfg.className}" style="background: ${stCfg.bg}; color: ${stCfg.text}; border-color: ${stCfg.border};">
                <span class="status-dot">${stCfg.icon}</span>
                <span>${escapeHtml(item.status || 'תקין / עובד')}</span>
              </span>
            </td>
            <td class="inv-cell-location">
              <span class="inv-location-pill">📍 ${escapeHtml(item.location || '—')}</span>
            </td>
            <td class="inv-cell-date">${escapeHtml(formatDateDisplay(item.statusDate))}</td>
            <td class="inv-cell-issue">
              ${isIssue
                ? `<span class="inv-issue-badge warning">⚠️ ${escapeHtml(item.issue)}</span>`
                : `<span class="inv-issue-badge ok">✓ ${escapeHtml(item.issue || 'תקין')}</span>`
              }
            </td>
            <td class="inv-cell-notes" title="${escapeHtml(item.notes || '')}">
              ${item.notes ? `<span class="notes-text">${escapeHtml(item.notes)}</span>` : '<span class="text-muted">—</span>'}
            </td>
            <td class="inv-cell-actions">
              <div class="row-actions">
                <button type="button" class="btn-icon-action btn-edit-row" data-id="${escapeHtml(item.id)}" title="עריכה בדיאלוג">
                  ✏️
                </button>
                <button type="button" class="btn-icon-action btn-delete-row" data-id="${escapeHtml(item.id)}" title="מחיקת פריט">
                  🗑️
                </button>
              </div>
            </td>
          </tr>
        `;
      } else {
        // Direct In-Table Inline Edit Mode
        html += `
          <tr class="inv-row inv-row-editing" data-id="${escapeHtml(item.id)}">
            <td class="inv-cell-seq">
              <input type="number" class="inv-inline-input input-seq" data-id="${escapeHtml(item.id)}" data-field="seq" value="${escapeHtml(item.seq)}" style="width: 52px; text-align: center;">
            </td>
            <td class="inv-cell-type">
              <select class="inv-inline-select" data-id="${escapeHtml(item.id)}" data-field="type">
                ${(lookups.types || []).map(t => `<option value="${escapeHtml(t)}" ${t === item.type ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('')}
              </select>
            </td>
            <td class="inv-cell-brand">
              <select class="inv-inline-select" data-id="${escapeHtml(item.id)}" data-field="brand">
                ${(lookups.brands || []).map(b => `<option value="${escapeHtml(b)}" ${b === item.brand ? 'selected' : ''}>${escapeHtml(b)}</option>`).join('')}
              </select>
            </td>
            <td class="inv-cell-status">
              <select class="inv-inline-select inv-inline-status" data-id="${escapeHtml(item.id)}" data-field="status">
                ${(lookups.statuses || []).map(s => `<option value="${escapeHtml(s)}" ${s === item.status ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('')}
              </select>
            </td>
            <td class="inv-cell-location">
              <select class="inv-inline-select" data-id="${escapeHtml(item.id)}" data-field="location">
                ${(lookups.locations || []).map(l => `<option value="${escapeHtml(l)}" ${l === item.location ? 'selected' : ''}>${escapeHtml(l)}</option>`).join('')}
              </select>
            </td>
            <td class="inv-cell-date">
              <input type="date" class="inv-inline-input input-date" data-id="${escapeHtml(item.id)}" data-field="statusDate" value="${escapeHtml(item.statusDate || getTodayIsoDate())}">
            </td>
            <td class="inv-cell-issue">
              <select class="inv-inline-select" data-id="${escapeHtml(item.id)}" data-field="issue">
                ${(lookups.issues || []).map(iss => `<option value="${escapeHtml(iss)}" ${iss === item.issue ? 'selected' : ''}>${escapeHtml(iss)}</option>`).join('')}
              </select>
            </td>
            <td class="inv-cell-notes">
              <input type="text" class="inv-inline-input" data-id="${escapeHtml(item.id)}" data-field="notes" value="${escapeHtml(item.notes || '')}" placeholder="הערה/סידורי...">
            </td>
            <td class="inv-cell-actions">
              <div class="row-actions">
                <button type="button" class="btn-icon-action btn-inline-save" data-id="${escapeHtml(item.id)}" title="שמור שינויים">
                  ✓
                </button>
                <button type="button" class="btn-icon-action btn-delete-row" data-id="${escapeHtml(item.id)}" title="מחק">
                  🗑️
                </button>
              </div>
            </td>
          </tr>
        `;
      }
    });

    html += `</tbody>`;
    tableEl.innerHTML = html;

    // Attach row events
    attachTableRowEvents();
  }

  /**
   * Attach Row Events (Edit, Delete, Inline Changes, Double Click)
   */
  function attachTableRowEvents() {
    if (!tableEl) return;

    // Edit button (Dialog)
    tableEl.querySelectorAll('.btn-edit-row').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        openItemModal(id);
      });
    });

    // Delete button
    tableEl.querySelectorAll('.btn-delete-row').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        deleteItem(id);
      });
    });

    // Double click to open dialog in regular mode
    if (!isInlineEditMode) {
      tableEl.querySelectorAll('.inv-row').forEach(row => {
        row.addEventListener('dblclick', () => {
          const id = row.dataset.id;
          if (id) openItemModal(id);
        });
      });
    }

    // In-Table Inline change listeners (Auto-save on change)
    if (isInlineEditMode) {
      const inputs = tableEl.querySelectorAll('.inv-inline-input, .inv-inline-select');
      inputs.forEach(input => {
        input.addEventListener('change', () => {
          const id = input.dataset.id;
          const field = input.dataset.field;
          const val = input.value;
          handleInlineFieldChange(id, field, val);
        });
      });

      // Quick save button click feedback
      tableEl.querySelectorAll('.btn-inline-save').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          App.showToast('נשמר בהצלחה ✓', 'success', 1200);
        });
      });
    }
  }

  /**
   * Handle In-Table Inline Cell Change
   */
  function handleInlineFieldChange(id, field, value) {
    if (!id || !field) return;

    const items = Storage.getInventory();
    const item = items.find(it => it.id === id);
    if (!item) return;

    if (field === 'seq') {
      item.seq = Number(value) || item.seq;
    } else {
      item[field] = value;
    }

    // If status changed, auto-update statusDate to today if not explicitly changed
    if (field === 'status') {
      const today = getTodayIsoDate();
      item.statusDate = today;
      // Also update the date input in DOM if present
      const dateInput = tableEl.querySelector(`.input-date[data-id="${id}"]`);
      if (dateInput) dateInput.value = today;
    }

    item.updatedAt = new Date().toISOString();

    Storage.saveInventory(items);
    renderStats();
    renderAdminModalSummary();
  }

  /**
   * Toggle between Display Mode and Inline Table Edit Mode
   */
  function toggleInlineEditMode() {
    isInlineEditMode = !isInlineEditMode;
    renderTable();
    if (isInlineEditMode) {
      App.showToast('מצב עריכה ישירה בטבלה הופעל: ניתן לערוך תאים ישירות!', 'info', 2200);
    } else {
      App.showToast('מצב עריכה ישירה נסגר. כל הנתונים נשמרו.', 'success', 1800);
    }
  }

  /**
   * Add a New Row Directly in Inline Mode
   */
  function addNewRowInline() {
    const items = Storage.getInventory();
    const lookups = Storage.getInventoryLookups();

    const maxSeq = items.reduce((max, it) => Math.max(max, Number(it.seq) || 0), 0);
    const newSeq = maxSeq + 1;

    const newItem = {
      id: 'inv_' + Date.now(),
      seq: newSeq,
      type: (lookups.types && lookups.types[0]) || 'מחשב נייח',
      brand: (lookups.brands && lookups.brands[0]) || 'Lenovo ThinkCentre M720',
      status: 'תקין / עובד',
      location: (lookups.locations && lookups.locations[0]) || 'חדר מחשבים (עמדות 1-32)',
      statusDate: getTodayIsoDate(),
      issue: (lookups.issues && lookups.issues[0]) || 'תקין (ללא תקלה)',
      notes: '',
      updatedAt: new Date().toISOString()
    };

    items.push(newItem);
    Storage.saveInventory(items);
    renderStats();
    renderTable();

    // Scroll to new row and focus
    setTimeout(() => {
      const newRow = tableEl.querySelector(`tr[data-id="${newItem.id}"]`);
      if (newRow) {
        newRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const firstInput = newRow.querySelector('select, input');
        if (firstInput) firstInput.focus();
      }
    }, 100);

    App.showToast(`נוספה שורה חדשה (#${newSeq})`, 'success', 1500);
  }

  /**
   * Open Item Dialog Form (Modal) for Add or Edit
   */
  function openItemModal(itemId = null) {
    if (!Storage.isAdminActive()) return;

    if (!itemModalEl) itemModalEl = document.getElementById('inventoryItemModal');
    if (!itemModalEl) return;

    currentEditingItemId = itemId;
    populateItemSelects();

    const titleEl = document.getElementById('invItemModalTitle');
    const subtitleEl = document.getElementById('invItemModalSubtitle');
    const btnSubmit = document.getElementById('btnSaveInventoryItem');

    const seqInput = document.getElementById('invItemSeq');
    const typeSelect = document.getElementById('invItemType');
    const brandSelect = document.getElementById('invItemBrand');
    const statusSelect = document.getElementById('invItemStatus');
    const locationSelect = document.getElementById('invItemLocation');
    const dateInput = document.getElementById('invItemStatusDate');
    const issueSelect = document.getElementById('invItemIssue');
    const notesInput = document.getElementById('invItemNotes');

    const items = Storage.getInventory();

    if (itemId) {
      // Edit existing
      const item = items.find(it => it.id === itemId);
      if (!item) return;

      if (titleEl) titleEl.textContent = `עריכת פריט ציוד #${item.seq}`;
      if (subtitleEl) subtitleEl.textContent = `${item.type || ''} • ${item.brand || ''}`;
      if (btnSubmit) btnSubmit.textContent = '✓ שמור שינויים';

      if (seqInput) seqInput.value = item.seq;
      if (typeSelect) typeSelect.value = item.type || '';
      if (brandSelect) brandSelect.value = item.brand || '';
      if (statusSelect) statusSelect.value = item.status || 'תקין / עובד';
      if (locationSelect) locationSelect.value = item.location || '';
      if (dateInput) dateInput.value = item.statusDate || getTodayIsoDate();
      if (issueSelect) issueSelect.value = item.issue || 'תקין (ללא תקלה)';
      if (notesInput) notesInput.value = item.notes || '';
    } else {
      // Add new
      const maxSeq = items.reduce((max, it) => Math.max(max, Number(it.seq) || 0), 0);
      const nextSeq = maxSeq + 1;

      if (titleEl) titleEl.textContent = 'הוספת פריט ציוד חדש לאינוונטר';
      if (subtitleEl) subtitleEl.textContent = 'הזנת נתונים באמצעות טופס דיאלוג';
      if (btnSubmit) btnSubmit.textContent = '➕ הוסף פריט';

      if (seqInput) seqInput.value = nextSeq;
      if (typeSelect) typeSelect.selectedIndex = 0;
      if (brandSelect) brandSelect.selectedIndex = 0;
      if (statusSelect) statusSelect.value = 'תקין / עובד';
      if (locationSelect) locationSelect.selectedIndex = 0;
      if (dateInput) dateInput.value = getTodayIsoDate();
      if (issueSelect) issueSelect.selectedIndex = 0;
      if (notesInput) notesInput.value = '';
    }

    itemModalEl.classList.add('active');
  }

  /**
   * Close Item Dialog Form
   */
  function closeItemModal() {
    if (!itemModalEl) return;
    itemModalEl.classList.remove('active');
    currentEditingItemId = null;
  }

  /**
   * Populate Selects in Item Dialog from Lookups
   */
  function populateItemSelects() {
    const lookups = Storage.getInventoryLookups();

    const populateSelect = (selectId, itemsArray) => {
      const select = document.getElementById(selectId);
      if (!select) return;
      const currentVal = select.value;
      select.innerHTML = '';
      (itemsArray || []).forEach(val => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val;
        select.appendChild(opt);
      });
      if (currentVal && itemsArray && itemsArray.includes(currentVal)) {
        select.value = currentVal;
      }
    };

    populateSelect('invItemType', lookups.types);
    populateSelect('invItemBrand', lookups.brands);
    populateSelect('invItemStatus', lookups.statuses);
    populateSelect('invItemLocation', lookups.locations);
    populateSelect('invItemIssue', lookups.issues);
  }

  /**
   * Handle Item Form Submit (Dialog Save)
   */
  function handleItemFormSubmit(e) {
    e.preventDefault();

    const seqInput = document.getElementById('invItemSeq');
    const typeSelect = document.getElementById('invItemType');
    const brandSelect = document.getElementById('invItemBrand');
    const statusSelect = document.getElementById('invItemStatus');
    const locationSelect = document.getElementById('invItemLocation');
    const dateInput = document.getElementById('invItemStatusDate');
    const issueSelect = document.getElementById('invItemIssue');
    const notesInput = document.getElementById('invItemNotes');

    const seq = Number(seqInput.value) || 1;
    const type = (typeSelect.value || '').trim();
    const brand = (brandSelect.value || '').trim();
    const status = (statusSelect.value || 'תקין / עובד').trim();
    const location = (locationSelect.value || '').trim();
    const statusDate = dateInput.value || getTodayIsoDate();
    const issue = (issueSelect.value || 'תקין (ללא תקלה)').trim();
    const notes = (notesInput.value || '').trim();

    if (!type) {
      App.showToast('נא לבחור סוג ציוד', 'warning');
      return;
    }

    const items = Storage.getInventory();

    if (currentEditingItemId) {
      // Edit existing
      const item = items.find(it => it.id === currentEditingItemId);
      if (item) {
        item.seq = seq;
        item.type = type;
        item.brand = brand;
        item.status = status;
        item.location = location;
        item.statusDate = statusDate;
        item.issue = issue;
        item.notes = notes;
        item.updatedAt = new Date().toISOString();
        Storage.saveInventory(items);
        App.showToast(`פריט #${seq} (${type}) עודכן בהצלחה ✓`, 'success');
      }
    } else {
      // Create new
      const newItem = {
        id: 'inv_' + Date.now(),
        seq,
        type,
        brand,
        status,
        location,
        statusDate,
        issue,
        notes,
        updatedAt: new Date().toISOString()
      };
      items.push(newItem);
      Storage.saveInventory(items);
      App.showToast(`פריט ציוד חדש #${seq} נוסף בהצלחה לאינוונטר ✓`, 'success');
    }

    closeItemModal();
    renderStats();
    renderTable();
    renderAdminModalSummary();
  }

  /**
   * Delete an Item
   */
  function deleteItem(id) {
    if (!id) return;
    const items = Storage.getInventory();
    const item = items.find(it => it.id === id);
    if (!item) return;

    if (confirm(`האם את בטוחה שברצונך למחוק מאינוונטר הציוד את:\nמס״ד #${item.seq} - ${item.type} (${item.brand})?`)) {
      const filtered = items.filter(it => it.id !== id);
      Storage.saveInventory(filtered);
      renderStats();
      renderTable();
      renderAdminModalSummary();
      App.showToast(`פריט #${item.seq} נמחק מהאינוונטר`, 'info');
    }
  }

  // ==========================================================================
  // Lookups Management (עריכת רשימות בחירה)
  // ==========================================================================

  function openLookupsModal() {
    if (!Storage.isAdminActive()) return;

    if (!lookupsModalEl) lookupsModalEl = document.getElementById('inventoryLookupsModal');
    if (!lookupsModalEl) return;

    switchLookupCategory(activeLookupCategory || 'types');
    lookupsModalEl.classList.add('active');
  }

  function closeLookupsModal() {
    if (!lookupsModalEl) return;
    lookupsModalEl.classList.remove('active');
    populateFilterDropdowns();
    renderTable();
  }

  function setupLookupsManager() {
    // Category Tab Switching
    const catButtons = document.querySelectorAll('.lookup-cat-btn');
    catButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.dataset.category;
        switchLookupCategory(cat);
      });
    });

    // Add Lookup Item Form
    const formAddLookup = document.getElementById('formAddLookupItem');
    if (formAddLookup) {
      formAddLookup.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('newLookupItemValue');
        const val = (input.value || '').trim();
        if (!val) return;

        const ok = Storage.addInventoryLookupItem(activeLookupCategory, val);
        if (ok) {
          input.value = '';
          renderLookupsList();
          populateFilterDropdowns();
          App.showToast(`"${val}" נוסף בהצלחה לרשימה ✓`, 'success');
        } else {
          App.showToast('פריט זה כבר קיים ברשימה', 'warning');
        }
      });
    }
  }

  function switchLookupCategory(category) {
    activeLookupCategory = category;

    document.querySelectorAll('.lookup-cat-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === category);
    });

    const categoryNames = {
      types: 'סוגי ציוד',
      brands: 'מותגים ודגמים',
      statuses: 'סטטוסים',
      locations: 'מיקומים וכיתות',
      issues: 'סוגי תקלות'
    };

    const titleEl = document.getElementById('lookupCategoryTitle');
    if (titleEl) {
      titleEl.textContent = `ניהול רשימת: ${categoryNames[category] || category}`;
    }

    renderLookupsList();
  }

  function renderLookupsList() {
    const listEl = document.getElementById('lookupsItemsList');
    if (!listEl) return;

    const lookups = Storage.getInventoryLookups();
    const items = lookups[activeLookupCategory] || [];

    if (items.length === 0) {
      listEl.innerHTML = '<div class="text-muted" style="padding: 1rem; text-align: center;">אין פריטים ברשימה זו עדיין. הוסף פריט חדש למטה.</div>';
      return;
    }

    let html = '';
    items.forEach((item, idx) => {
      html += `
        <div class="lookup-item-card">
          <span class="lookup-item-name">${escapeHtml(item)}</span>
          <div class="lookup-item-actions">
            <button type="button" class="btn-icon-action btn-edit-lookup" data-item="${escapeHtml(item)}" title="שינוי שם">✏️</button>
            <button type="button" class="btn-icon-action btn-delete-lookup" data-item="${escapeHtml(item)}" title="מחיקה מהרשימה">🗑️</button>
          </div>
        </div>
      `;
    });

    listEl.innerHTML = html;

    // Attach actions
    listEl.querySelectorAll('.btn-edit-lookup').forEach(btn => {
      btn.addEventListener('click', () => {
        const oldVal = btn.dataset.item;
        const newVal = prompt(`שנה שם פריט עבור "${oldVal}":`, oldVal);
        if (newVal && newVal.trim() && newVal.trim() !== oldVal) {
          Storage.updateInventoryLookupItem(activeLookupCategory, oldVal, newVal.trim());
          renderLookupsList();
          populateFilterDropdowns();
          renderTable();
          App.showToast(`שם הפריט עודכן ל-"${newVal.trim()}"`, 'success');
        }
      });
    });

    listEl.querySelectorAll('.btn-delete-lookup').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.dataset.item;
        if (confirm(`האם למחוק את "${item}" מרשימת הבחירה?`)) {
          Storage.removeInventoryLookupItem(activeLookupCategory, item);
          renderLookupsList();
          populateFilterDropdowns();
          App.showToast(`"${item}" הוסר מהרשימה`, 'info');
        }
      });
    });
  }

  /**
   * Render Inventory Summary inside Admin Modal (Tab 4 / Inventory Tab)
   */
  function renderAdminModalSummary() {
    const container = document.getElementById('adminInventorySummary');
    if (!container) return;

    const items = Storage.getInventory();
    const total = items.length;

    let countWorking = 0;
    let countProblem = 0;
    let countBroken = 0;
    let countStorage = 0;
    let countInUse = 0;

    items.forEach(it => {
      const st = String(it.status || '');
      if (st.includes('עובד') || st.includes('תקין')) countWorking++;
      else if (st.includes('בעיה') || st.includes('תקול')) countProblem++;
      else if (st.includes('מושבת') || st.includes('שבור')) countBroken++;
      else if (st.includes('מחסן')) countStorage++;
      else if (st.includes('שימוש')) countInUse++;
      else countWorking++;
    });

    container.innerHTML = `
      <div class="inv-summary-card">
        <div class="inv-summary-header">
          <div class="inv-summary-icon">📦</div>
          <div>
            <h4>מערכת אינוונטריזציה וציוד טכנולוגי</h4>
            <p class="text-muted">סך הכל ${total} מחשבים וציוד רשומים במערכת וב-Google Sheets</p>
          </div>
        </div>
        <div class="inv-mini-stats-grid">
          <div class="mini-stat-box stat-ok">
            <span class="mini-stat-num">${countWorking}</span>
            <span class="mini-stat-label">🟢 תקין / פעיל</span>
          </div>
          <div class="mini-stat-box stat-inuse">
            <span class="mini-stat-num">${countInUse}</span>
            <span class="mini-stat-label">💼 בשימוש</span>
          </div>
          <div class="mini-stat-box stat-problem">
            <span class="mini-stat-num">${countProblem}</span>
            <span class="mini-stat-label">🟠 תקול / בדיקה</span>
          </div>
          <div class="mini-stat-box stat-broken">
            <span class="mini-stat-num">${countBroken}</span>
            <span class="mini-stat-label">🔴 מושבת / שבור</span>
          </div>
          <div class="mini-stat-box stat-storage">
            <span class="mini-stat-num">${countStorage}</span>
            <span class="mini-stat-label">📦 במחסן</span>
          </div>
        </div>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 1rem;">
          <button type="button" class="btn btn-primary btn-sm" onclick="Admin.closeAdminModal(); Inventory.openModal();">
            🖥️ פתח מערכת אינוונטר מלאה (מסך מלא)
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="Inventory.openLookupsModal();">
            ⚙️ ניהול רשימות בחירה (סוגים, דגמים, תקלות)
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="Inventory.openItemModal(null);">
            ➕ הוספת פריט חדש
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Export Inventory to CSV (Excel compatible with UTF-8 BOM)
   */
  function exportCsv() {
    const items = Storage.getInventory();
    if (!items.length) {
      App.showToast('אין פריטים לייצוא', 'warning');
      return;
    }

    const headers = ['מס״ד', 'סוג ציוד', 'מותג ודגם', 'סטטוס', 'מיקום', 'תאריך שינוי סטטוס', 'פירוט תקלה', 'הערות'];

    let csvContent = '\uFEFF'; // UTF-8 BOM for Hebrew support in Excel
    csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\r\n';

    items.forEach(it => {
      const row = [
        it.seq || '',
        it.type || '',
        it.brand || '',
        it.status || '',
        it.location || '',
        it.statusDate || '',
        it.issue || '',
        it.notes || ''
      ];
      csvContent += row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',') + '\r\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory-alumim-${getTodayIsoDate()}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    App.showToast('קובץ Excel / CSV הורד בהצלחה 📥', 'success');
  }

  return {
    init,
    openModal,
    closeModal,
    openItemModal,
    closeItemModal,
    openLookupsModal,
    closeLookupsModal,
    deleteItem,
    exportCsv,
    renderAdminModalSummary
  };
})();

// Export globally
window.Inventory = Inventory;
