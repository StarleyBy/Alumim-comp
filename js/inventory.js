/**
 * CompAlumim - Inventory Management Engine (אינוונטריזציה / Инвентаризация)
 * Exclusively for Admin (Tatiana):
 * - Multi-language support for Admin: Hebrew (עברית) & Russian (Русский)
 * - Optional ID (SN) device serial number tracking
 * - Real-time Google Sheets synchronization & offline caching
 * - In-table direct editing (редактирование таблицы прямо в интерфейсе)
 * - Dialog Form Modal for adding & editing items
 * - Customizable dropdown lists (Lookups)
 * - Search, multi-criteria filtering, top statistics overview, CSV & Print export
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
  let isSyncing = false;
  let currentLang = 'he';

  /**
   * Comprehensive Bilingual Dictionary (עברית & Русский)
   */
  const I18N = {
    he: {
      langToggleText: '🌐 Русский',
      langToggleTitle: 'עבור לממשק ברוסית (לאדמין בלבד)',
      modalTitle: 'אינוונטר ציוד ומחשבים • בית הספר עלומים חולון',
      modalSubtitle: 'מעקב מצאי, תקינות, מיקומי כיתות, תקלות וסנכרון ענן (למנהלת בלבד)',
      statTotal: 'סה״כ ציוד',
      statOk: 'תקין ופעיל',
      statInUse: 'בשימוש',
      statProblem: 'תקול / בעיה',
      statBroken: 'מושבת / שבור',
      statStorage: 'במחסן',
      searchPlaceholder: 'חיפוש חופשי (מס״ד, ID/SN, דגם, מיקום, תקלה, הערה)...',
      allStatuses: 'כל הסטטוסים (הכל)',
      allTypes: 'כל סוגי הציוד (הכל)',
      allLocations: 'כל המיקומים (הכל)',
      btnAddItem: 'הוסף פריט חדש',
      btnInlineEdit: 'עריכה ישירה בטבלה',
      btnInlineEditDone: 'סיום עריכה ישירה',
      btnAddRow: 'הוסף שורה',
      btnLookups: 'רשימות בחירה',
      btnExportCsv: 'ייצוא CSV',
      btnPrint: 'הדפסה',
      btnSync: 'סנכרון ענן',
      syncing: 'מסנכרן...',
      synced: 'הנתונים סונכרנו בהצלחה עם Google Sheets ✓',
      syncError: 'שגיאה בסנכרון עם Google Sheets',
      filteredCount: (count, total) => `מציג ${count} מתוך ${total} פריטים`,
      hintText: '💡 ניתן לערוך ישירות בטבלה או לפתוח דיאלוג בלחיצה כפולה על שורה.',
      emptyTitle: 'לא נמצאו פריטי ציוד',
      emptyDesc: 'נסה לשנות את מסנני החיפוש או הוסף פריט חדש לאינוונטר',
      btnEmptyAdd: '➕ הוסף פריט ציוד ראשון',
      colSeq: 'מס״ד',
      colSn: 'ID (SN)',
      colType: 'סוג ציוד',
      colBrand: 'מותג / דגם',
      colStatus: 'סטטוס',
      colLocation: 'מיקום',
      colStatusDate: 'תאריך סטטוס',
      colIssue: 'פירוט תקלה',
      colNotes: 'הערות',
      colActions: 'פעולות',
      actionsEdit: 'עריכה בדיאלוג',
      actionsDelete: 'מחיקת פריט',
      actionsSave: 'שמור שינויים',
      itemModalAddTitle: 'הוספת פריט ציוד חדש לאינוונטר',
      itemModalEditTitle: (seq) => `עריכת פריט ציוד #${seq}`,
      itemModalSubtitleAdd: 'הזנת נתונים באמצעות טופס דיאלוג',
      fieldSeq: 'מס״ד (מספר סידורי):',
      fieldSn: 'מזהה מכשיר / מספר סידורי (ID / SN) — אופציונלי:',
      fieldSnPlaceholder: 'לדוגמה: SN-948201 / חולון-042 (אם קיים)',
      fieldStatusDate: 'תאריך שינוי סטטוס:',
      fieldType: 'סוג ציוד:',
      fieldBrand: 'מותג / דגם:',
      fieldStatus: 'סטטוס ציוד:',
      fieldLocation: 'מיקום / שיוך / אצל מי:',
      fieldIssue: 'פירוט תקלה (במידה ויש):',
      fieldNotes: 'הערות נוספות (ספק, אחריות, הערות טכנאי):',
      fieldNotesPlaceholder: 'לדוגמה: עמדה מספר 14, אחריות עד 2027...',
      btnQuickAddType: '+ סוג חדש',
      btnQuickAddBrand: '+ מותג חדש',
      btnQuickAddLocation: '+ מיקום חדש',
      btnQuickAddIssue: '+ תקלה חדשה',
      btnCancel: 'ביטול',
      btnSaveItem: '✓ שמור פריט',
      btnSaveItemEdit: '✓ שמור שינויים',
      lookupsTitle: 'ניהול רשימות בחירה',
      lookupsSubtitle: 'הוספה, עריכה ומחיקה של אפשרויות ברשימות הנפתחות',
      tabTypes: '🏷️ סוגי ציוד',
      tabBrands: '💻 מותגים ודגמים',
      tabStatuses: '🚦 סטטוסים',
      tabLocations: '📍 מיקומים וכיתות',
      tabIssues: '⚠️ תקלות נפוצות',
      catNames: {
        types: 'סוגי ציוד',
        brands: 'מותגים ודגמים',
        statuses: 'סטטוסים',
        locations: 'מיקומים וכיתות',
        issues: 'סוגי תקלות'
      },
      addLookupPlaceholder: 'הזן פריט חדש להוספה...',
      btnAddLookup: '➕ הוסף לרשימה',
      btnClose: 'סגור',
      btnFinishClose: 'סיום וסגירה',
      deleteConfirm: (seq, type, brand) => `האם את בטוחה שברצונך למחוק מאינוונטר הציוד את:\nמס״ד #${seq} - ${type} (${brand})?`,
      toastAdded: (seq, type) => `פריט ציוד חדש #${seq} נוסף בהצלחה לאינוונטר ✓`,
      toastUpdated: (seq, type) => `פריט #${seq} (${type}) עודכן בהצלחה ✓`,
      toastDeleted: (seq) => `פריט #${seq} נמחק מהאינוונטר`,
      toastLookupAdded: (val, cat) => `"${val}" נוסף בהצלחה לרשימת ה-${cat}`,
      toastLookupExists: 'פריט זה כבר קיים ברשימה',
      toastInlineOn: 'מצב עריכה ישירה בטבלה הופעל: ניתן לערוך תאים ישירות!',
      toastInlineOff: 'מצב עריכה ישירה נסגר. כל הנתונים נשמרו.',
      toastAccessDenied: 'גישה חסומה: רק למנהלת המערכת (טטיאנה) יש הרשאה לניהול אינוונטר'
    },
    ru: {
      langToggleText: '🌐 עברית',
      langToggleTitle: 'Переключить на иврит',
      modalTitle: 'Инвентаризация оборудования и компьютеров • Школа Алумим Холон',
      modalSubtitle: 'Учет оборудования, исправность, кабинеты, неисправности и синхронизация (только для админа)',
      statTotal: 'Всего оборудования',
      statOk: 'Исправно / Работает',
      statInUse: 'В использовании',
      statProblem: 'Есть проблема / Неисправно',
      statBroken: 'Сломано / Списано',
      statStorage: 'На складе',
      searchPlaceholder: 'Поиск (№, ID/SN, модель, кабинет, неисправность, заметка)...',
      allStatuses: 'Все статусы (Все)',
      allTypes: 'Все типы оборудования (Все)',
      allLocations: 'Все кабинеты / локации (Все)',
      btnAddItem: 'Добавить устройство',
      btnInlineEdit: 'Прямое редактирование',
      btnInlineEditDone: 'Завершить редактирование',
      btnAddRow: 'Добавить строку',
      btnLookups: 'Справочники',
      btnExportCsv: 'Экспорт в CSV',
      btnPrint: 'Печать',
      btnSync: 'Синхронизация Google',
      syncing: 'Синхронизация...',
      synced: 'Данные успешно синхронизированы с Google Таблицей ✓',
      syncError: 'Ошибка синхронизации с Google Таблицей',
      filteredCount: (count, total) => `Показано ${count} из ${total} устройств`,
      hintText: '💡 Можно редактировать прямо в таблице или открыть карточку двойным кликом по строке.',
      emptyTitle: 'Оборудование не найдено',
      emptyDesc: 'Попробуйте изменить параметры поиска или добавьте первое устройство в инвентарь',
      btnEmptyAdd: '➕ Добавить первое устройство',
      colSeq: '№',
      colSn: 'ID (SN)',
      colType: 'Тип оборудования',
      colBrand: 'Бренд / Модель',
      colStatus: 'Статус',
      colLocation: 'Кабинет / Место',
      colStatusDate: 'Дата статуса',
      colIssue: 'Неисправность',
      colNotes: 'Примечания',
      colActions: 'Действия',
      actionsEdit: 'Редактировать в карточке',
      actionsDelete: 'Удалить устройство',
      actionsSave: 'Сохранить изменения',
      itemModalAddTitle: 'Добавление оборудования в инвентарь',
      itemModalEditTitle: (seq) => `Редактирование устройства #${seq}`,
      itemModalSubtitleAdd: 'Ввод данных через форму карточки',
      fieldSeq: '№ (Порядковый номер):',
      fieldSn: 'ID / Серийный номер устройства (ID / SN) — необязательно:',
      fieldSnPlaceholder: 'Например: SN-948201 / PC-042 (если есть)',
      fieldStatusDate: 'Дата изменения статуса:',
      fieldType: 'Тип оборудования:',
      fieldBrand: 'Бренд / Модель:',
      fieldStatus: 'Статус оборудования:',
      fieldLocation: 'Кабинет / Место / У кого:',
      fieldIssue: 'Описание неисправности (если есть):',
      fieldNotes: 'Дополнительные примечания (гарантия, поставщик, комментарий):',
      fieldNotesPlaceholder: 'Например: рабочее место 14, гарантия до 2027...',
      btnQuickAddType: '+ Новый тип',
      btnQuickAddBrand: '+ Новая модель',
      btnQuickAddLocation: '+ Новая локация',
      btnQuickAddIssue: '+ Новая поломка',
      btnCancel: 'Отмена',
      btnSaveItem: '✓ Сохранить',
      btnSaveItemEdit: '✓ Сохранить изменения',
      lookupsTitle: 'Управление справочниками',
      lookupsSubtitle: 'Добавление, редактирование и удаление вариантов в выпадающих списках',
      tabTypes: '🏷️ Типы оборудования',
      tabBrands: '💻 Бренды и модели',
      tabStatuses: '🚦 Статусы',
      tabLocations: '📍 Кабинеты и локации',
      tabIssues: '⚠️ Частые неисправности',
      catNames: {
        types: 'Типы оборудования',
        brands: 'Бренды и модели',
        statuses: 'Статусы',
        locations: 'Кабинеты и локации',
        issues: 'Типы неисправностей'
      },
      addLookupPlaceholder: 'Введите новое значение для списка...',
      btnAddLookup: '➕ Добавить в список',
      btnClose: 'Закрыть',
      btnFinishClose: 'Готово и закрыть',
      deleteConfirm: (seq, type, brand) => `Вы уверены, что хотите удалить из инвентаря:\n№ #${seq} - ${type} (${brand})?`,
      toastAdded: (seq, type) => `Новое устройство #${seq} успешно добавлено в инвентарь ✓`,
      toastUpdated: (seq, type) => `Устройство #${seq} (${type}) успешно обновлено ✓`,
      toastDeleted: (seq) => `Устройство #${seq} удалено из инвентаря`,
      toastLookupAdded: (val, cat) => `"${val}" успешно добавлено в категорию "${cat}"`,
      toastLookupExists: 'Такой пункт уже существует в списке',
      toastInlineOn: 'Режим прямого редактирования в таблице включен: можно изменять ячейки!',
      toastInlineOff: 'Режим прямого редактирования закрыт. Все данные сохранены.',
      toastAccessDenied: 'Доступ закрыт: только администратор (Татьяна) имеет права на управление инвентарем'
    }
  };

  function t(key, ...args) {
    const dict = I18N[currentLang] || I18N['he'];
    const val = dict[key] !== undefined ? dict[key] : (I18N['he'][key] || key);
    if (typeof val === 'function') {
      return val(...args);
    }
    return val;
  }

  /**
   * Status appearance and icons with multi-language labels
   */
  const STATUS_CONFIG = {
    'תקין / עובד': {
      className: 'status-ok',
      icon: '🟢',
      labelHe: 'תקין / עובד',
      labelRu: 'Исправно / Работает',
      bg: 'rgba(22, 163, 74, 0.12)',
      text: '#15803d',
      border: 'rgba(22, 163, 74, 0.35)'
    },
    'יש בעיה / תקול': {
      className: 'status-problem',
      icon: '🟠',
      labelHe: 'יש בעיה / תקול',
      labelRu: 'Есть проблема / Неисправно',
      bg: 'rgba(217, 119, 6, 0.12)',
      text: '#b45309',
      border: 'rgba(217, 119, 6, 0.35)'
    },
    'מושבת / שבור': {
      className: 'status-broken',
      icon: '🔴',
      labelHe: 'מושבת / שבור',
      labelRu: 'Сломано / Списано',
      bg: 'rgba(220, 38, 38, 0.12)',
      text: '#b91c1c',
      border: 'rgba(220, 38, 38, 0.35)'
    },
    'במחסן': {
      className: 'status-storage',
      icon: '📦',
      labelHe: 'במחסן',
      labelRu: 'На складе',
      bg: 'rgba(100, 116, 139, 0.12)',
      text: '#475569',
      border: 'rgba(100, 116, 139, 0.35)'
    },
    'בשימוש': {
      className: 'status-inuse',
      icon: '💼',
      labelHe: 'בשימוש',
      labelRu: 'В использовании',
      bg: 'rgba(37, 99, 235, 0.12)',
      text: '#1d4ed8',
      border: 'rgba(37, 99, 235, 0.35)'
    }
  };

  function escapeHtml(str) {
    if (!str && str !== 0) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatDateDisplay(dateStr) {
    if (!dateStr) return '—';
    const parts = String(dateStr).slice(0, 10).split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  function getTodayIsoDate() {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  }

  function getStatusConfig(status) {
    if (status && STATUS_CONFIG[status]) return STATUS_CONFIG[status];
    if (status) {
      const s = String(status).toLowerCase();
      if (s.includes('עובד') || s.includes('תקין') || s.includes('исправ') || s.includes('работ')) return STATUS_CONFIG['תקין / עובד'];
      if (s.includes('בעיה') || s.includes('תקול') || s.includes('проблем') || s.includes('неисправ')) return STATUS_CONFIG['יש בעיה / תקול'];
      if (s.includes('מושבת') || s.includes('שבור') || s.includes('сломан') || s.includes('списан')) return STATUS_CONFIG['מושבת / שבור'];
      if (s.includes('מחסן') || s.includes('склад')) return STATUS_CONFIG['במחסן'];
      if (s.includes('שימוש') || s.includes('использ')) return STATUS_CONFIG['בשימוש'];
    }
    return {
      className: 'status-default',
      icon: '🔹',
      labelHe: status || 'לא הוגדר',
      labelRu: status || 'Не указан',
      bg: 'rgba(100, 116, 139, 0.08)',
      text: '#64748b',
      border: 'rgba(100, 116, 139, 0.25)'
    };
  }

  function getStatusLabel(status) {
    const cfg = getStatusConfig(status);
    return currentLang === 'ru' ? cfg.labelRu : cfg.labelHe;
  }

  /**
   * Initialize Inventory Module
   */
  function init() {
    currentLang = Storage.getInventoryLang() || 'he';

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

    // Language Toggle Button
    const btnToggleLang = document.getElementById('btnToggleInvLang');
    if (btnToggleLang) {
      btnToggleLang.addEventListener('click', toggleLanguage);
    }

    // Cloud Sync Button
    const btnSyncNow = document.getElementById('btnSyncInventoryNow');
    if (btnSyncNow) {
      btnSyncNow.addEventListener('click', handleSyncNowClick);
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

    // Setup Quick Add buttons next to selects in Item Dialog
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

    applyLanguageUI();
  }

  /**
   * Toggle between Hebrew and Russian specifically for Inventory
   */
  function toggleLanguage() {
    currentLang = currentLang === 'he' ? 'ru' : 'he';
    Storage.setInventoryLang(currentLang);
    applyLanguageUI();
    populateFilterDropdowns();
    renderStats();
    renderTable();
    if (lookupsModalEl && lookupsModalEl.classList.contains('active')) {
      switchLookupCategory(activeLookupCategory);
    }
    const toastMsg = currentLang === 'ru' ? 'Язык инвентаря переключен на русский 🇷🇺' : 'שפת האינוונטר שונתה לעברית 🇮🇱';
    App.showToast(toastMsg, 'info', 1600);
  }

  /**
   * Apply language strings and direction to inventory modals
   */
  function applyLanguageUI() {
    const isRu = currentLang === 'ru';
    const dir = isRu ? 'ltr' : 'rtl';

    // Apply direction to modals (main page stays untouched)
    [modalEl, itemModalEl, lookupsModalEl].forEach(el => {
      if (el) el.setAttribute('dir', dir);
    });

    // Language Toggle button
    const btnToggleLang = document.getElementById('btnToggleInvLang');
    const txtLangToggle = document.getElementById('txtInvLangToggle');
    if (txtLangToggle) txtLangToggle.textContent = isRu ? 'עברית' : 'Русский';
    if (btnToggleLang) btnToggleLang.title = t('langToggleTitle');

    // Modal Header Titles
    const titleEl = document.getElementById('invModalTitle');
    const subtitleEl = document.getElementById('invModalSubtitle');
    if (titleEl) titleEl.textContent = t('modalTitle');
    if (subtitleEl) subtitleEl.textContent = t('modalSubtitle');

    // Stat card labels
    const setLabel = (selector, key) => {
      const el = document.querySelector(selector);
      if (el) el.textContent = t(key);
    };
    setLabel('.stat-total .stat-label', 'statTotal');
    setLabel('.stat-ok .stat-label', 'statOk');
    setLabel('.stat-inuse .stat-label', 'statInUse');
    setLabel('.stat-problem .stat-label', 'statProblem');
    setLabel('.stat-broken .stat-label', 'statBroken');
    setLabel('.stat-storage .stat-label', 'statStorage');

    // Search placeholder
    if (searchInputEl) {
      searchInputEl.placeholder = t('searchPlaceholder');
    }

    // Action button labels
    const btnAddItem = document.getElementById('btnAddInventoryItem');
    if (btnAddItem) {
      const span = btnAddItem.querySelector('span:last-child');
      if (span) span.textContent = t('btnAddItem');
      btnAddItem.title = isRu ? 'Добавить оборудование через форму' : 'הוספת פריט חדש באמצעות דיאלוג';
    }

    const btnAddInlineRow = document.getElementById('btnAddInlineRow');
    if (btnAddInlineRow) {
      const span = btnAddInlineRow.querySelector('span:last-child');
      if (span) span.textContent = t('btnAddRow');
    }

    const btnManageLookups = document.getElementById('btnManageLookups');
    if (btnManageLookups) {
      const span = btnManageLookups.querySelector('span:last-child');
      if (span) span.textContent = t('btnLookups');
    }

    const txtExport = document.getElementById('txtExportCsvBtn');
    if (txtExport) txtExport.textContent = t('btnExportCsv');

    const txtPrint = document.getElementById('txtPrintBtn');
    if (txtPrint) txtPrint.textContent = t('btnPrint');

    const txtSync = document.getElementById('txtSyncInvBtn');
    if (txtSync && !isSyncing) txtSync.textContent = t('btnSync');

    // Hint text
    const hintEl = document.querySelector('.inv-hint-text');
    if (hintEl) hintEl.textContent = t('hintText');

    // Modal Footers
    const btnModalFooterClose = document.getElementById('inventoryModalFooterClose');
    if (btnModalFooterClose) btnModalFooterClose.textContent = t('btnClose');

    // Item Dialog labels
    const lblSeq = document.getElementById('lblInvItemSeq');
    if (lblSeq) lblSeq.innerHTML = `<span class="required">*</span> ${t('fieldSeq')}`;

    const lblStatusDate = document.getElementById('lblInvItemStatusDate');
    if (lblStatusDate) lblStatusDate.innerHTML = `<span class="required">*</span> ${t('fieldStatusDate')}`;

    const lblSn = document.getElementById('lblInvItemSn');
    if (lblSn) lblSn.textContent = t('fieldSn');

    const inputSn = document.getElementById('invItemSn');
    if (inputSn) inputSn.placeholder = t('fieldSnPlaceholder');

    const lblType = document.querySelector('label[for="invItemType"]');
    if (lblType) lblType.innerHTML = `<span class="required">*</span> ${t('fieldType')}`;

    const lblBrand = document.querySelector('label[for="invItemBrand"]');
    if (lblBrand) lblBrand.innerHTML = `<span class="required">*</span> ${t('fieldBrand')}`;

    const lblStatus = document.querySelector('label[for="invItemStatus"]');
    if (lblStatus) lblStatus.innerHTML = `<span class="required">*</span> ${t('fieldStatus')}`;

    const lblLoc = document.querySelector('label[for="invItemLocation"]');
    if (lblLoc) lblLoc.innerHTML = `<span class="required">*</span> ${t('fieldLocation')}`;

    const lblIssue = document.querySelector('label[for="invItemIssue"]');
    if (lblIssue) lblIssue.textContent = t('fieldIssue');

    const lblNotes = document.querySelector('label[for="invItemNotes"]');
    if (lblNotes) lblNotes.textContent = t('fieldNotes');

    const inputNotes = document.getElementById('invItemNotes');
    if (inputNotes) inputNotes.placeholder = t('fieldNotesPlaceholder');

    // Quick add button labels
    const setQuickBtn = (cat, key) => {
      const btn = document.querySelector(`.btn-quick-add-lookup[data-category="${cat}"]`);
      if (btn) btn.textContent = t(key);
    };
    setQuickBtn('types', 'btnQuickAddType');
    setQuickBtn('brands', 'btnQuickAddBrand');
    setQuickBtn('locations', 'btnQuickAddLocation');
    setQuickBtn('issues', 'btnQuickAddIssue');

    const btnCancel = document.getElementById('btnCancelInventoryItem');
    if (btnCancel) btnCancel.textContent = t('btnCancel');

    // Lookups modal labels
    const lookupsTitleEl = document.getElementById('invLookupsModalTitle');
    if (lookupsTitleEl) lookupsTitleEl.textContent = t('lookupsTitle');
    const lookupsSub = document.querySelector('#inventoryLookupsModal .modal-subtitle');
    if (lookupsSub) lookupsSub.textContent = t('lookupsSubtitle');

    const tabBtnTypes = document.querySelector('.lookup-cat-btn[data-category="types"]');
    if (tabBtnTypes) tabBtnTypes.textContent = t('tabTypes');
    const tabBtnBrands = document.querySelector('.lookup-cat-btn[data-category="brands"]');
    if (tabBtnBrands) tabBtnBrands.textContent = t('tabBrands');
    const tabBtnStatuses = document.querySelector('.lookup-cat-btn[data-category="statuses"]');
    if (tabBtnStatuses) tabBtnStatuses.textContent = t('tabStatuses');
    const tabBtnLocations = document.querySelector('.lookup-cat-btn[data-category="locations"]');
    if (tabBtnLocations) tabBtnLocations.textContent = t('tabLocations');
    const tabBtnIssues = document.querySelector('.lookup-cat-btn[data-category="issues"]');
    if (tabBtnIssues) tabBtnIssues.textContent = t('tabIssues');

    const inputNewLookup = document.getElementById('newLookupItemValue');
    if (inputNewLookup) inputNewLookup.placeholder = t('addLookupPlaceholder');

    const btnAddLookupSubmit = document.querySelector('#formAddLookupItem button[type="submit"]');
    if (btnAddLookupSubmit) btnAddLookupSubmit.textContent = t('btnAddLookup');

    const btnLookupsFinish = document.getElementById('inventoryLookupsFooterClose');
    if (btnLookupsFinish) btnLookupsFinish.textContent = t('btnFinishClose');
  }

  /**
   * Manual Cloud Sync Button Handler
   */
  async function handleSyncNowClick() {
    if (isSyncing) return;
    const gsUrl = Storage.getGoogleSheetsUrl();
    if (!gsUrl) {
      App.showToast(currentLang === 'ru' ? 'URL таблицы Google Sheets не настроен в настройках админа' : 'כתובת Google Sheets אינה מוגדרת בהגדרות מנהל', 'warning', 3000);
      return;
    }

    isSyncing = true;
    const syncIcon = document.getElementById('syncInvIcon');
    const syncText = document.getElementById('txtSyncInvBtn');
    if (syncIcon) syncIcon.classList.add('spin-icon');
    if (syncText) syncText.textContent = t('syncing');

    try {
      await Storage.syncInventoryWithSheets();
      populateFilterDropdowns();
      renderStats();
      renderTable();
      renderAdminModalSummary();
      App.showToast(t('synced'), 'success', 2500);
    } catch (err) {
      console.error('Inventory sync error:', err);
      App.showToast(t('syncError'), 'danger', 3000);
    } finally {
      isSyncing = false;
      if (syncIcon) syncIcon.classList.remove('spin-icon');
      if (syncText) syncText.textContent = t('btnSync');
    }
  }

  /**
   * Setup "+ חדש" / "+ Новый" quick buttons
   */
  function setupQuickAddButtons() {
    const quickAddButtons = document.querySelectorAll('.btn-quick-add-lookup');
    quickAddButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const category = btn.dataset.category;
        const targetSelectId = btn.dataset.target;
        if (!category || !targetSelectId) return;

        const catNamesDict = I18N[currentLang].catNames || I18N['he'].catNames;
        const title = catNamesDict[category] || 'פריט חדש';
        const promptMsg = currentLang === 'ru' ? `Введите новое значение для категории "${title}":` : `הזן ${title} חדש לרשימה:`;
        const newVal = prompt(promptMsg);
        if (newVal && newVal.trim()) {
          const trimmed = newVal.trim();
          Storage.addInventoryLookupItem(category, trimmed);
          populateItemSelects();
          const targetSelect = document.getElementById(targetSelectId);
          if (targetSelect) {
            targetSelect.value = trimmed;
          }
          populateFilterDropdowns();
          App.showToast(t('toastLookupAdded', trimmed, title), 'success');
        }
      });
    });
  }

  /**
   * Open Main Inventory Modal (Admin Only)
   */
  function openModal() {
    if (!Storage.isAdminActive()) {
      App.showToast(t('toastAccessDenied'), 'danger');
      return;
    }

    if (!modalEl) modalEl = document.getElementById('inventoryModal');
    if (!modalEl) return;

    if (searchInputEl) searchInputEl.value = '';
    if (filterStatusEl) filterStatusEl.value = '';
    if (filterTypeEl) filterTypeEl.value = '';
    if (filterLocationEl) filterLocationEl.value = '';

    applyLanguageUI();
    populateFilterDropdowns();
    renderStats();
    renderTable();

    modalEl.classList.add('active');

    // Trigger auto background sync on open if Google Sheets is connected
    if (Storage.getGoogleSheetsUrl()) {
      Storage.pullFromSheets().then(res => {
        if (res && res.changed) {
          populateFilterDropdowns();
          renderStats();
          renderTable();
        }
      });
    }
  }

  function closeModal() {
    if (!modalEl) return;
    modalEl.classList.remove('active');
  }

  /**
   * Populate Filters (Status, Types, Locations)
   */
  function populateFilterDropdowns() {
    const lookups = Storage.getInventoryLookups();

    // Status filter
    if (filterStatusEl) {
      const currentVal = filterStatusEl.value;
      filterStatusEl.innerHTML = `<option value="">${escapeHtml(t('allStatuses'))}</option>`;
      (lookups.statuses || []).forEach(st => {
        const opt = document.createElement('option');
        opt.value = st;
        const icon = (STATUS_CONFIG[st] && STATUS_CONFIG[st].icon) || '🔹';
        opt.textContent = `${icon} ${getStatusLabel(st)}`;
        filterStatusEl.appendChild(opt);
      });
      filterStatusEl.value = currentVal;
    }

    // Type filter
    if (filterTypeEl) {
      const currentVal = filterTypeEl.value;
      filterTypeEl.innerHTML = `<option value="">${escapeHtml(t('allTypes'))}</option>`;
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
      filterLocationEl.innerHTML = `<option value="">${escapeHtml(t('allLocations'))}</option>`;
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
      const st = String(it.status || '').toLowerCase();
      if (st.includes('עובד') || st.includes('תקין') || st.includes('исправ') || st.includes('работ')) countWorking++;
      else if (st.includes('בעיה') || st.includes('תקול') || st.includes('проблем') || st.includes('неисправ')) countProblem++;
      else if (st.includes('מושבת') || st.includes('שבור') || st.includes('сломан') || st.includes('списан')) countBroken++;
      else if (st.includes('מחסן') || st.includes('склад')) countStorage++;
      else if (st.includes('שימוש') || st.includes('использ')) countInUse++;
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
   * Render Inventory Data Table with ID (SN) and multi-language support
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
        const str = `${it.seq} ${it.sn || ''} ${it.type} ${it.brand} ${it.status} ${it.location} ${it.issue} ${it.notes}`.toLowerCase();
        if (!str.includes(searchTerm)) return false;
      }
      return true;
    });

    // Sort by seq ascending
    filtered.sort((a, b) => (Number(a.seq) || 0) - (Number(b.seq) || 0));

    // Update count indicator
    const counterEl = document.getElementById('invFilteredCount');
    if (counterEl) {
      counterEl.textContent = t('filteredCount', filtered.length, items.length);
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
        ? `<span>✓</span><span>${escapeHtml(t('btnInlineEditDone'))}</span>`
        : `<span>✏️</span><span>${escapeHtml(t('btnInlineEdit'))}</span>`;
    }

    if (filtered.length === 0) {
      tableEl.innerHTML = `
        <thead>
          <tr>
            <th style="width: 48px;">${escapeHtml(t('colSeq'))}</th>
            <th style="min-width: 110px;">${escapeHtml(t('colSn'))}</th>
            <th>${escapeHtml(t('colType'))}</th>
            <th>${escapeHtml(t('colBrand'))}</th>
            <th>${escapeHtml(t('colStatus'))}</th>
            <th>${escapeHtml(t('colLocation'))}</th>
            <th>${escapeHtml(t('colStatusDate'))}</th>
            <th>${escapeHtml(t('colIssue'))}</th>
            <th>${escapeHtml(t('colNotes'))}</th>
            <th style="width: 95px; text-align: center;">${escapeHtml(t('colActions'))}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colspan="10" class="inv-empty-state">
              <div class="empty-icon">📦</div>
              <div class="empty-title">${escapeHtml(t('emptyTitle'))}</div>
              <div class="empty-desc">${escapeHtml(t('emptyDesc'))}</div>
              <button type="button" class="btn btn-primary btn-sm" onclick="Inventory.openItemModal(null)">
                ${escapeHtml(t('btnEmptyAdd'))}
              </button>
            </td>
          </tr>
        </tbody>
      `;
      return;
    }

    // Build Table Header
    let html = `
      <thead>
        <tr>
          <th style="width: 48px;" title="${currentLang === 'ru' ? 'Порядковый номер' : 'מספר סידורי'}">${escapeHtml(t('colSeq'))}</th>
          <th style="min-width: 115px;" title="${currentLang === 'ru' ? 'Идентификатор / Серийный номер (необязательно)' : 'מזהה / מספר סידורי של המכשיר (אופציונלי)'}">${escapeHtml(t('colSn'))}</th>
          <th style="min-width: 130px;">${escapeHtml(t('colType'))}</th>
          <th style="min-width: 150px;">${escapeHtml(t('colBrand'))}</th>
          <th style="min-width: 130px;">${escapeHtml(t('colStatus'))}</th>
          <th style="min-width: 140px;">${escapeHtml(t('colLocation'))}</th>
          <th style="min-width: 115px;">${escapeHtml(t('colStatusDate'))}</th>
          <th style="min-width: 140px;">${escapeHtml(t('colIssue'))}</th>
          <th style="min-width: 150px;">${escapeHtml(t('colNotes'))}</th>
          <th style="width: 90px; text-align: center;">${escapeHtml(t('colActions'))}</th>
        </tr>
      </thead>
      <tbody>
    `;

    filtered.forEach(item => {
      const stCfg = getStatusConfig(item.status);
      const stLabel = getStatusLabel(item.status);
      const isIssue = item.issue && !item.issue.includes('תקין') && !item.issue.includes('ללא תקלה') && !item.issue.includes('исправ') && !item.issue.includes('нет');

      if (!isInlineEditMode) {
        // Normal Display Mode
        html += `
          <tr class="inv-row" data-id="${escapeHtml(item.id)}" title="${currentLang === 'ru' ? 'Двойной клик для редактирования' : 'לחץ פעמיים לעריכה מהירה'}">
            <td class="inv-cell-seq"><strong>#${escapeHtml(item.seq)}</strong></td>
            <td class="inv-cell-sn">
              ${item.sn
                ? `<span class="inv-sn-badge"><code>${escapeHtml(item.sn)}</code></span>`
                : `<span class="text-muted">—</span>`
              }
            </td>
            <td class="inv-cell-type">
              <span class="inv-type-pill">${escapeHtml(item.type || '—')}</span>
            </td>
            <td class="inv-cell-brand"><strong>${escapeHtml(item.brand || '—')}</strong></td>
            <td class="inv-cell-status">
              <span class="inv-status-badge ${stCfg.className}" style="background: ${stCfg.bg}; color: ${stCfg.text}; border-color: ${stCfg.border};">
                <span class="status-dot">${stCfg.icon}</span>
                <span>${escapeHtml(stLabel)}</span>
              </span>
            </td>
            <td class="inv-cell-location">
              <span class="inv-location-pill">📍 ${escapeHtml(item.location || '—')}</span>
            </td>
            <td class="inv-cell-date">${escapeHtml(formatDateDisplay(item.statusDate))}</td>
            <td class="inv-cell-issue">
              ${isIssue
                ? `<span class="inv-issue-badge warning">⚠️ ${escapeHtml(item.issue)}</span>`
                : `<span class="inv-issue-badge ok">✓ ${escapeHtml(item.issue || (currentLang === 'ru' ? 'Исправно' : 'תקין'))}</span>`
              }
            </td>
            <td class="inv-cell-notes" title="${escapeHtml(item.notes || '')}">
              ${item.notes ? `<span class="notes-text">${escapeHtml(item.notes)}</span>` : '<span class="text-muted">—</span>'}
            </td>
            <td class="inv-cell-actions">
              <div class="row-actions">
                <button type="button" class="btn-icon-action btn-edit-row" data-id="${escapeHtml(item.id)}" title="${escapeHtml(t('actionsEdit'))}">
                  ✏️
                </button>
                <button type="button" class="btn-icon-action btn-delete-row" data-id="${escapeHtml(item.id)}" title="${escapeHtml(t('actionsDelete'))}">
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
              <input type="number" class="inv-inline-input input-seq" data-id="${escapeHtml(item.id)}" data-field="seq" value="${escapeHtml(item.seq)}" style="width: 48px; text-align: center;">
            </td>
            <td class="inv-cell-sn">
              <input type="text" class="inv-inline-input input-sn" data-id="${escapeHtml(item.id)}" data-field="sn" value="${escapeHtml(item.sn || '')}" placeholder="ID / SN" style="font-family: monospace;">
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
                ${(lookups.statuses || []).map(s => `<option value="${escapeHtml(s)}" ${s === item.status ? 'selected' : ''}>${escapeHtml(getStatusLabel(s))}</option>`).join('')}
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
              <input type="text" class="inv-inline-input" data-id="${escapeHtml(item.id)}" data-field="notes" value="${escapeHtml(item.notes || '')}" placeholder="${currentLang === 'ru' ? 'Заметка/номер...' : 'הערה/סידורי...'}">
            </td>
            <td class="inv-cell-actions">
              <div class="row-actions">
                <button type="button" class="btn-icon-action btn-inline-save" data-id="${escapeHtml(item.id)}" title="${escapeHtml(t('actionsSave'))}">
                  ✓
                </button>
                <button type="button" class="btn-icon-action btn-delete-row" data-id="${escapeHtml(item.id)}" title="${escapeHtml(t('actionsDelete'))}">
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

    attachTableRowEvents();
  }

  /**
   * Attach Row Events
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

      tableEl.querySelectorAll('.btn-inline-save').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          App.showToast(currentLang === 'ru' ? 'Сохранено ✓' : 'נשמר בהצלחה ✓', 'success', 1200);
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

    if (field === 'status') {
      const today = getTodayIsoDate();
      item.statusDate = today;
      const dateInput = tableEl.querySelector(`.input-date[data-id="${id}"]`);
      if (dateInput) dateInput.value = today;
    }

    item.updatedAt = new Date().toISOString();

    Storage.saveInventory(items);
    renderStats();
    renderAdminModalSummary();
  }

  function toggleInlineEditMode() {
    isInlineEditMode = !isInlineEditMode;
    renderTable();
    if (isInlineEditMode) {
      App.showToast(t('toastInlineOn'), 'info', 2200);
    } else {
      App.showToast(t('toastInlineOff'), 'success', 1800);
    }
  }

  function addNewRowInline() {
    const items = Storage.getInventory();
    const lookups = Storage.getInventoryLookups();

    const maxSeq = items.reduce((max, it) => Math.max(max, Number(it.seq) || 0), 0);
    const newSeq = maxSeq + 1;

    const newItem = {
      id: 'inv_' + Date.now(),
      seq: newSeq,
      sn: '',
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

    setTimeout(() => {
      const newRow = tableEl.querySelector(`tr[data-id="${newItem.id}"]`);
      if (newRow) {
        newRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const firstInput = newRow.querySelector('select, input');
        if (firstInput) firstInput.focus();
      }
    }, 100);

    App.showToast(currentLang === 'ru' ? `Добавлена новая строка (#${newSeq})` : `נוספה שורה חדשה (#${newSeq})`, 'success', 1500);
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
    applyLanguageUI();

    const titleEl = document.getElementById('invItemModalTitle');
    const subtitleEl = document.getElementById('invItemModalSubtitle');
    const btnSubmit = document.getElementById('btnSaveInventoryItem');

    const seqInput = document.getElementById('invItemSeq');
    const snInput = document.getElementById('invItemSn');
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

      if (titleEl) titleEl.textContent = t('itemModalEditTitle', item.seq);
      if (subtitleEl) subtitleEl.textContent = `${item.type || ''} • ${item.brand || ''}${item.sn ? ' • SN: ' + item.sn : ''}`;
      if (btnSubmit) btnSubmit.textContent = t('btnSaveItemEdit');

      if (seqInput) seqInput.value = item.seq;
      if (snInput) snInput.value = item.sn || '';
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

      if (titleEl) titleEl.textContent = t('itemModalAddTitle');
      if (subtitleEl) subtitleEl.textContent = t('itemModalSubtitleAdd');
      if (btnSubmit) btnSubmit.textContent = t('btnSaveItem');

      if (seqInput) seqInput.value = nextSeq;
      if (snInput) snInput.value = '';
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

  function closeItemModal() {
    if (!itemModalEl) return;
    itemModalEl.classList.remove('active');
    currentEditingItemId = null;
  }

  function populateItemSelects() {
    const lookups = Storage.getInventoryLookups();

    const populateSelect = (selectId, itemsArray, isStatus = false) => {
      const select = document.getElementById(selectId);
      if (!select) return;
      const currentVal = select.value;
      select.innerHTML = '';
      (itemsArray || []).forEach(val => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = isStatus ? getStatusLabel(val) : val;
        select.appendChild(opt);
      });
      if (currentVal && itemsArray && itemsArray.includes(currentVal)) {
        select.value = currentVal;
      }
    };

    populateSelect('invItemType', lookups.types);
    populateSelect('invItemBrand', lookups.brands);
    populateSelect('invItemStatus', lookups.statuses, true);
    populateSelect('invItemLocation', lookups.locations);
    populateSelect('invItemIssue', lookups.issues);
  }

  /**
   * Handle Item Form Submit (Dialog Save)
   */
  function handleItemFormSubmit(e) {
    e.preventDefault();

    const seqInput = document.getElementById('invItemSeq');
    const snInput = document.getElementById('invItemSn');
    const typeSelect = document.getElementById('invItemType');
    const brandSelect = document.getElementById('invItemBrand');
    const statusSelect = document.getElementById('invItemStatus');
    const locationSelect = document.getElementById('invItemLocation');
    const dateInput = document.getElementById('invItemStatusDate');
    const issueSelect = document.getElementById('invItemIssue');
    const notesInput = document.getElementById('invItemNotes');

    const seq = Number(seqInput.value) || 1;
    const sn = (snInput ? snInput.value || '' : '').trim();
    const type = (typeSelect.value || '').trim();
    const brand = (brandSelect.value || '').trim();
    const status = (statusSelect.value || 'תקין / עובד').trim();
    const location = (locationSelect.value || '').trim();
    const statusDate = dateInput.value || getTodayIsoDate();
    const issue = (issueSelect.value || 'תקין (ללא תקלה)').trim();
    const notes = (notesInput.value || '').trim();

    if (!type) {
      App.showToast(currentLang === 'ru' ? 'Пожалуйста, выберите тип оборудования' : 'נא לבחור סוג ציוד', 'warning');
      return;
    }

    const items = Storage.getInventory();

    if (currentEditingItemId) {
      // Edit existing
      const item = items.find(it => it.id === currentEditingItemId);
      if (item) {
        item.seq = seq;
        item.sn = sn;
        item.type = type;
        item.brand = brand;
        item.status = status;
        item.location = location;
        item.statusDate = statusDate;
        item.issue = issue;
        item.notes = notes;
        item.updatedAt = new Date().toISOString();
        Storage.saveInventory(items);
        App.showToast(t('toastUpdated', seq, type), 'success');
      }
    } else {
      // Create new
      const newItem = {
        id: 'inv_' + Date.now(),
        seq,
        sn,
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
      App.showToast(t('toastAdded', seq, type), 'success');
    }

    closeItemModal();
    renderStats();
    renderTable();
    renderAdminModalSummary();
  }

  function deleteItem(id) {
    if (!id) return;
    const items = Storage.getInventory();
    const item = items.find(it => it.id === id);
    if (!item) return;

    if (confirm(t('deleteConfirm', item.seq, item.type, item.brand))) {
      const filtered = items.filter(it => it.id !== id);
      Storage.saveInventory(filtered);
      renderStats();
      renderTable();
      renderAdminModalSummary();
      App.showToast(t('toastDeleted', item.seq), 'info');
    }
  }

  // ==========================================================================
  // Lookups Management
  // ==========================================================================

  function openLookupsModal() {
    if (!Storage.isAdminActive()) return;

    if (!lookupsModalEl) lookupsModalEl = document.getElementById('inventoryLookupsModal');
    if (!lookupsModalEl) return;

    applyLanguageUI();
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
    const catButtons = document.querySelectorAll('.lookup-cat-btn');
    catButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.dataset.category;
        switchLookupCategory(cat);
      });
    });

    const formAddLookup = document.getElementById('formAddLookupItem');
    if (formAddLookup) {
      formAddLookup.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('newLookupItemValue');
        const val = (input.value || '').trim();
        if (!val) return;

        const catNamesDict = I18N[currentLang].catNames || I18N['he'].catNames;
        const catTitle = catNamesDict[activeLookupCategory] || activeLookupCategory;

        const ok = Storage.addInventoryLookupItem(activeLookupCategory, val);
        if (ok) {
          input.value = '';
          renderLookupsList();
          populateFilterDropdowns();
          App.showToast(t('toastLookupAdded', val, catTitle), 'success');
        } else {
          App.showToast(t('toastLookupExists'), 'warning');
        }
      });
    }
  }

  function switchLookupCategory(category) {
    activeLookupCategory = category;

    document.querySelectorAll('.lookup-cat-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === category);
    });

    const catNamesDict = I18N[currentLang].catNames || I18N['he'].catNames;
    const titleEl = document.getElementById('lookupCategoryTitle');
    if (titleEl) {
      const prefix = currentLang === 'ru' ? 'Управление справочником: ' : 'ניהול רשימת: ';
      titleEl.textContent = `${prefix}${catNamesDict[category] || category}`;
    }

    renderLookupsList();
  }

  function renderLookupsList() {
    const listEl = document.getElementById('lookupsItemsList');
    if (!listEl) return;

    const lookups = Storage.getInventoryLookups();
    const items = lookups[activeLookupCategory] || [];

    if (items.length === 0) {
      const emptyText = currentLang === 'ru' ? 'В этом справочнике пока нет записей. Добавьте пункт ниже.' : 'אין פריטים ברשימה זו עדיין. הוסף פריט חדש למטה.';
      listEl.innerHTML = `<div class="text-muted" style="padding: 1rem; text-align: center;">${emptyText}</div>`;
      return;
    }

    let html = '';
    items.forEach((item) => {
      const displayItem = activeLookupCategory === 'statuses' ? getStatusLabel(item) : item;
      html += `
        <div class="lookup-item-card">
          <span class="lookup-item-name">${escapeHtml(displayItem)}</span>
          <div class="lookup-item-actions">
            <button type="button" class="btn-icon-action btn-edit-lookup" data-item="${escapeHtml(item)}" title="${currentLang === 'ru' ? 'Изменить название' : 'שינוי שם'}">✏️</button>
            <button type="button" class="btn-icon-action btn-delete-lookup" data-item="${escapeHtml(item)}" title="${currentLang === 'ru' ? 'Удалить из списка' : 'מחיקה מהרשימה'}">🗑️</button>
          </div>
        </div>
      `;
    });

    listEl.innerHTML = html;

    listEl.querySelectorAll('.btn-edit-lookup').forEach(btn => {
      btn.addEventListener('click', () => {
        const oldVal = btn.dataset.item;
        const promptMsg = currentLang === 'ru' ? `Изменить значение для "${oldVal}":` : `שנה שם פריט עבור "${oldVal}":`;
        const newVal = prompt(promptMsg, oldVal);
        if (newVal && newVal.trim() && newVal.trim() !== oldVal) {
          Storage.updateInventoryLookupItem(activeLookupCategory, oldVal, newVal.trim());
          renderLookupsList();
          populateFilterDropdowns();
          renderTable();
          const toastMsg = currentLang === 'ru' ? `Значение обновлено на "${newVal.trim()}"` : `שם הפריט עודכן ל-"${newVal.trim()}"`;
          App.showToast(toastMsg, 'success');
        }
      });
    });

    listEl.querySelectorAll('.btn-delete-lookup').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.dataset.item;
        const confirmMsg = currentLang === 'ru' ? `Удалить "${item}" из списка?` : `האם למחוק את "${item}" מרשימת הבחירה?`;
        if (confirm(confirmMsg)) {
          Storage.removeInventoryLookupItem(activeLookupCategory, item);
          renderLookupsList();
          populateFilterDropdowns();
          const toastMsg = currentLang === 'ru' ? `"${item}" удалено из списка` : `"${item}" הוסר מהרשימה`;
          App.showToast(toastMsg, 'info');
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
      const st = String(it.status || '').toLowerCase();
      if (st.includes('עובד') || st.includes('תקין') || st.includes('исправ') || st.includes('работ')) countWorking++;
      else if (st.includes('בעיה') || st.includes('תקול') || st.includes('проблем') || st.includes('неисправ')) countProblem++;
      else if (st.includes('מושבת') || st.includes('שבור') || st.includes('сломан') || st.includes('списан')) countBroken++;
      else if (st.includes('מחסן') || st.includes('склад')) countStorage++;
      else if (st.includes('שימוש') || st.includes('использ')) countInUse++;
      else countWorking++;
    });

    container.innerHTML = `
      <div class="inv-summary-card">
        <div class="inv-summary-header">
          <div class="inv-summary-icon">📦</div>
          <div>
            <h4>מערכת אינוונטריזציה וציוד טכנולוגי</h4>
            <p class="text-muted">סך הכל ${total} מחשבים וציוד רשומים במערכת וב-Google Sheets (כולל עמודת ID/SN)</p>
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
      App.showToast(currentLang === 'ru' ? 'Нет данных для экспорта' : 'אין פריטים לייצוא', 'warning');
      return;
    }

    const isRu = currentLang === 'ru';
    const headers = isRu
      ? ['№', 'ID (SN)', 'Тип оборудования', 'Бренд и модель', 'Статус', 'Местоположение', 'Дата статуса', 'Неисправность', 'Примечания']
      : ['מס״ד', 'ID (SN)', 'סוג ציוד', 'מותג ודגם', 'סטטוס', 'מיקום', 'תאריך שינוי סטטוס', 'פירוט תקלה', 'הערות'];

    let csvContent = '\uFEFF'; // UTF-8 BOM
    csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\r\n';

    items.forEach(it => {
      const stLabel = getStatusLabel(it.status);
      const row = [
        it.seq || '',
        it.sn || '',
        it.type || '',
        it.brand || '',
        stLabel || it.status || '',
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

    App.showToast(currentLang === 'ru' ? 'Файл Excel / CSV успешно скачан 📥' : 'קובץ Excel / CSV הורד בהצלחה 📥', 'success');
  }

  return {
    init,
    openModal,
    closeModal,
    openItemModal,
    closeItemModal,
    openLookupsModal,
    closeLookupsModal,
    toggleLanguage,
    deleteItem,
    exportCsv,
    renderAdminModalSummary
  };
})();

// Export globally
window.Inventory = Inventory;
