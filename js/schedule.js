/**
 * CompAlumim - Weekly Schedule Engine • בית הספר עלומים חולון
 * Mobile-First Ultra-Compact Implementation:
 * - Adaptive font sizing for teacher & subject names
 * - Room switcher (Computer Lab / Library)
 * - 8 lesson periods (only number, no time strings)
 * - Corner lock icon 🔒 for permanent lessons (no wasted row)
 * - Cheerful sound effects on interaction
 * - Dynamic week-to-week persistence
 */

const Schedule = (() => {
  // Current active date (defaults to today)
  let currentDate = new Date();

  // Active room view: 'lab' or 'library'
  let activeRoom = 'lab';

  // Days configuration (Sunday to Friday, Israel school week)
  const DAYS = [
    { index: 0, name: 'א׳', fullName: 'יום ראשון' },
    { index: 1, name: 'ב׳', fullName: 'יום שני' },
    { index: 2, name: 'ג׳', fullName: 'יום שלישי' },
    { index: 3, name: 'ד׳', fullName: 'יום רביעי' },
    { index: 4, name: 'ה׳', fullName: 'יום חמישי' },
    { index: 5, name: 'ו׳', fullName: 'יום שישי' }
  ];

  // 8 Lesson periods (only number, times removed)
  const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

  // Active editing slot reference
  let activeEditingSlot = null;

  // View Mode: 'week' (Full Week) or 'day' (Single Day with large typography)
  const KEY_VIEW_MODE = 'compalumim_view_mode';
  let activeViewMode = localStorage.getItem(KEY_VIEW_MODE) || 'week';

  // Active day index for Single-Day view (0=Sunday .. 5=Friday). If Saturday, default to Sunday (0).
  const initialDay = (new Date()).getDay();
  let activeDayIndex = (initialDay >= 0 && initialDay <= 5) ? initialDay : 0;

  /**
   * Initialize Schedule Engine
   */
  function init() {
    setupRoomSwitcher();
    setupViewModeSwitcher();
    setupDaySelectorBar();
    setupWeekNavigator();
    setupBookingModal();
    updateDropdowns();
    renderTables();
  }

  /**
   * Room Switcher between Computer Lab (חדר מחשבים) and Library (ספרייה)
   */
  function setupRoomSwitcher() {
    const tabBtns = document.querySelectorAll('.room-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (window.SoundFX) SoundFX.playClick();
        const targetRoom = btn.dataset.room;
        switchRoom(targetRoom);
      });
    });
  }

  function switchRoom(room) {
    activeRoom = room;

    document.querySelectorAll('.room-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.room === room);
    });

    const labView = document.getElementById('viewLab');
    const libView = document.getElementById('viewLibrary');
    if (labView && libView) {
      labView.classList.toggle('active', room === 'lab');
      libView.classList.toggle('active', room === 'library');
    }

    renderTables();
  }

  function getActiveRoom() {
    return activeRoom;
  }

  /**
   * View Mode Switcher: 'week' (Whole Week) vs 'day' (Single Day)
   */
  function setupViewModeSwitcher() {
    const btnWeek = document.getElementById('btnModeWeek');
    const btnDay = document.getElementById('btnModeDay');
    const daySelectorBar = document.getElementById('daySelectorBar');

    if (btnWeek) {
      btnWeek.addEventListener('click', () => {
        if (window.SoundFX) SoundFX.playClick();
        switchViewMode('week');
      });
    }

    if (btnDay) {
      btnDay.addEventListener('click', () => {
        if (window.SoundFX) SoundFX.playClick();
        switchViewMode('day');
      });
    }

    // Initialize UI to match stored activeViewMode
    if (btnWeek) btnWeek.classList.toggle('active', activeViewMode === 'week');
    if (btnDay) btnDay.classList.toggle('active', activeViewMode === 'day');
    if (daySelectorBar) {
      daySelectorBar.style.display = activeViewMode === 'day' ? 'flex' : 'none';
    }
  }

  function switchViewMode(mode) {
    activeViewMode = mode;
    localStorage.setItem(KEY_VIEW_MODE, mode);

    const btnWeek = document.getElementById('btnModeWeek');
    const btnDay = document.getElementById('btnModeDay');
    const daySelectorBar = document.getElementById('daySelectorBar');

    if (btnWeek) btnWeek.classList.toggle('active', mode === 'week');
    if (btnDay) btnDay.classList.toggle('active', mode === 'day');

    if (daySelectorBar) {
      daySelectorBar.style.display = mode === 'day' ? 'flex' : 'none';
    }

    renderTables();
  }

  function getActiveViewMode() {
    return activeViewMode;
  }

  /**
   * Setup Day Selector Bar controls (prev / next day buttons)
   */
  function setupDaySelectorBar() {
    const btnPrev = document.getElementById('btnPrevDay');
    const btnNext = document.getElementById('btnNextDay');

    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        if (window.SoundFX) SoundFX.playClick();
        if (activeDayIndex > 0) {
          activeDayIndex--;
        } else {
          // Go to previous week Friday
          currentDate.setDate(currentDate.getDate() - 7);
          activeDayIndex = 5;
        }
        renderTables();
      });
    }

    if (btnNext) {
      btnNext.addEventListener('click', () => {
        if (window.SoundFX) SoundFX.playClick();
        if (activeDayIndex < 5) {
          activeDayIndex++;
        } else {
          // Go to next week Sunday
          currentDate.setDate(currentDate.getDate() + 7);
          activeDayIndex = 0;
        }
        renderTables();
      });
    }
  }

  /**
   * Get Sunday Date object for currently active week
   */
  function getSundayOfWeek(refDate) {
    const d = new Date(refDate);
    const day = d.getDay(); // 0 is Sunday
    const diff = d.getDate() - day;
    const sunday = new Date(d.setDate(diff));
    sunday.setHours(0, 0, 0, 0);
    return sunday;
  }

  /**
   * Get formatted dates array for Sunday to Friday of active week
   */
  function getWeekDates() {
    const sunday = getSundayOfWeek(currentDate);
    const week = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 6; i++) {
      const date = new Date(sunday);
      date.setDate(sunday.getDate() + i);

      const isToday = date.getTime() === today.getTime();
      const holiday = window.Holidays ? Holidays.getHoliday(date) : null;

      const dayNum = date.getDate();
      const monthNum = date.getMonth() + 1;
      const formattedDate = `${dayNum}/${monthNum}`;

      week.push({
        dayIndex: i,
        name: DAYS[i].name,
        fullName: DAYS[i].fullName,
        date: date,
        formattedDate,
        isoDate: date.toISOString().slice(0, 10),
        isToday,
        holiday
      });
    }
    return week;
  }

  function getActiveWeekKey() {
    const sunday = getSundayOfWeek(currentDate);
    return sunday.toISOString().slice(0, 10);
  }

  /**
   * Setup Week Navigator Controls
   */
  function setupWeekNavigator() {
    const btnPrev = document.getElementById('btnPrevWeek');
    const btnNext = document.getElementById('btnNextWeek');
    const btnToday = document.getElementById('btnTodayWeek');
    const dateInput = document.getElementById('weekDatePicker');
    const btnPickDate = document.getElementById('btnPickDate');

    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        if (window.SoundFX) SoundFX.playClick();
        currentDate.setDate(currentDate.getDate() - 7);
        renderTables();
      });
    }

    if (btnNext) {
      btnNext.addEventListener('click', () => {
        if (window.SoundFX) SoundFX.playClick();
        currentDate.setDate(currentDate.getDate() + 7);
        renderTables();
      });
    }

    if (btnToday) {
      btnToday.addEventListener('click', () => {
        if (window.SoundFX) SoundFX.playClick();
        currentDate = new Date();
        renderTables();
      });
    }

    if (btnPickDate && dateInput) {
      btnPickDate.addEventListener('click', () => {
        if (window.SoundFX) SoundFX.playClick();
        try {
          if (typeof dateInput.showPicker === 'function') {
            dateInput.showPicker();
          } else {
            dateInput.click();
          }
        } catch {
          dateInput.click();
        }
      });

      dateInput.addEventListener('change', (e) => {
        if (e.target.value) {
          const selected = new Date(e.target.value + 'T00:00:00');
          if (!isNaN(selected.getTime())) {
            currentDate = selected;
            renderTables();
          }
        }
      });
    }
  }

  function updateWeekDisplay() {
    const displayEl = document.getElementById('weekDisplay');
    if (!displayEl) return;

    const weekDates = getWeekDates();
    const firstDay = weekDates[0];
    const lastDay = weekDates[5];
    displayEl.textContent = `${firstDay.formattedDate} - ${lastDay.formattedDate}`;
  }

  /**
   * Retrieve slot booking data for active week
   */
  function getSlotData(room, day, period) {
    const weekKey = getActiveWeekKey();
    const overrides = Storage.getOverrides();
    const overrideKey = `${weekKey}_${room}_${day}_${period}`;

    if (overrides[overrideKey] !== undefined) {
      return overrides[overrideKey];
    }

    const baseSchedule = Storage.getSchedule();
    const baseKey = `${room}_${day}_${period}`;
    return baseSchedule[baseKey] || null;
  }

  /**
   * Render schedule tables (Week view or Single-Day view)
   */
  function renderTables() {
    updateWeekDisplay();
    const weekDates = getWeekDates();
    const barEl = document.getElementById('daySelectorBar');

    if (activeViewMode === 'day') {
      if (barEl) barEl.style.display = 'flex';
      renderDaySelectorBar(weekDates);
      const activeDay = weekDates[activeDayIndex] || weekDates[0];
      renderSingleRoomDayTable('lab', 'tableLab', activeDay);
      renderSingleRoomDayTable('library', 'tableLibrary', activeDay);
    } else {
      if (barEl) barEl.style.display = 'none';
      renderSingleRoomWeekTable('lab', 'tableLab', weekDates);
      renderSingleRoomWeekTable('library', 'tableLibrary', weekDates);
    }

    updateRoomStats('lab', weekDates);
    updateRoomStats('library', weekDates);
  }

  /**
   * Render Day Selector Chips for Single-Day Mode
   */
  function renderDaySelectorBar(weekDates) {
    const listEl = document.getElementById('dayChipsList');
    if (!listEl) return;

    listEl.innerHTML = weekDates.map((d, i) => {
      const isActive = i === activeDayIndex;
      const todayClass = d.isToday ? 'is-today-chip' : '';
      const activeClass = isActive ? 'active' : '';
      return `
        <button type="button" class="day-chip ${activeClass} ${todayClass}" data-day-index="${i}" title="${d.fullName}">
          <span class="day-chip-name">${d.name}</span>
          <span class="day-chip-date">${d.formattedDate}</span>
        </button>
      `;
    }).join('');

    listEl.querySelectorAll('.day-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        if (window.SoundFX) SoundFX.playClick();
        activeDayIndex = parseInt(btn.dataset.dayIndex, 10);
        renderTables();
      });
    });
  }

  /**
   * Render a single room schedule table in Full Week mode (6 days)
   */
  function renderSingleRoomWeekTable(room, tableId, weekDates) {
    const tableEl = document.getElementById(tableId);
    if (!tableEl) return;

    tableEl.className = 'schedule-table';

    // Header: Period + 6 Days
    let theadHtml = `
      <thead>
        <tr>
          <th class="col-period">#</th>
    `;

    weekDates.forEach(day => {
      const todayClass = day.isToday ? 'is-today' : '';
      let holidayIcon = '';
      if (day.holiday) {
        const icon = day.holiday.isChag ? '🎉' : day.holiday.isMemorial ? '🕯️' : '✨';
        holidayIcon = `<span class="day-holiday-dot" title="${day.holiday.name}">${icon}</span>`;
      }

      theadHtml += `
        <th class="${todayClass}" title="${day.fullName}">
          <div class="day-header-cell">
            <span class="day-name">${day.name}</span>
            <span class="day-date">${day.formattedDate}</span>
            ${holidayIcon}
          </div>
        </th>
      `;
    });

    theadHtml += `
        </tr>
      </thead>
    `;

    // Body: 8 Periods
    let tbodyHtml = `<tbody>`;

    PERIODS.forEach(periodNum => {
      tbodyHtml += `<tr>`;

      // Period cell: Just the number
      tbodyHtml += `
        <td class="period-cell" title="שיעור ${periodNum}">
          ${periodNum}
        </td>
      `;

      // 6 Days (0 to 5)
      weekDates.forEach(day => {
        const slotData = getSlotData(room, day.dayIndex, periodNum);
        const todayColClass = day.isToday ? 'is-today-col' : '';

        tbodyHtml += `
          <td class="slot-cell ${todayColClass}" 
              data-room="${room}" 
              data-day="${day.dayIndex}" 
              data-period="${periodNum}">
            ${renderSlotContent(slotData, false)}
          </td>
        `;
      });

      tbodyHtml += `</tr>`;
    });

    tbodyHtml += `</tbody>`;
    tableEl.innerHTML = theadHtml + tbodyHtml;

    // Attach click listeners
    tableEl.querySelectorAll('.slot-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        const r = cell.dataset.room;
        const d = parseInt(cell.dataset.day, 10);
        const p = parseInt(cell.dataset.period, 10);
        handleSlotClick(r, d, p);
      });
    });
  }

  /**
   * Render a single room schedule table in Single-Day mode (1 wide column, large typography)
   */
  function renderSingleRoomDayTable(room, tableId, dayInfo) {
    const tableEl = document.getElementById(tableId);
    if (!tableEl) return;

    tableEl.className = 'schedule-table single-day-mode';

    let holidayIcon = '';
    if (dayInfo.holiday) {
      const icon = dayInfo.holiday.isChag ? '🎉' : dayInfo.holiday.isMemorial ? '🕯️' : '✨';
      holidayIcon = ` <span class="day-holiday-dot" title="${dayInfo.holiday.name}">${icon}</span>`;
    }

    let theadHtml = `
      <thead>
        <tr>
          <th class="col-period">שיעור</th>
          <th class="col-single-day ${dayInfo.isToday ? 'is-today' : ''}">
            <div class="day-header-cell">
              <span class="day-name">${dayInfo.fullName} (${dayInfo.formattedDate})${holidayIcon}</span>
            </div>
          </th>
        </tr>
      </thead>
    `;

    let tbodyHtml = `<tbody>`;

    PERIODS.forEach(periodNum => {
      const slotData = getSlotData(room, dayInfo.dayIndex, periodNum);

      tbodyHtml += `
        <tr>
          <td class="period-cell" title="שיעור ${periodNum}">
            <div class="period-label-wrap">
              <span class="period-num">${periodNum}</span>
              <span class="period-sublabel">שיעור</span>
            </div>
          </td>
          <td class="slot-cell" 
              data-room="${room}" 
              data-day="${dayInfo.dayIndex}" 
              data-period="${periodNum}">
            ${renderSlotContent(slotData, true, periodNum)}
          </td>
        </tr>
      `;
    });

    tbodyHtml += `</tbody>`;
    tableEl.innerHTML = theadHtml + tbodyHtml;

    // Attach click listeners
    tableEl.querySelectorAll('.slot-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        const r = cell.dataset.room;
        const d = parseInt(cell.dataset.day, 10);
        const p = parseInt(cell.dataset.period, 10);
        handleSlotClick(r, d, p);
      });
    });
  }

  /**
   * Render Slot Content: Empty vs Occupied Card
   * Includes same-line lock icon 🔒 with teacher's name and large typography for single-day mode
   */
  function renderSlotContent(slot, isSingleDay = false, periodNum = null) {
    if (!slot) {
      if (isSingleDay) {
        return `<div class="slot-empty" title="לחץ לשיבוץ">+ פנוי לשיבוץ ${periodNum ? '(שיעור ' + periodNum + ')' : ''}</div>`;
      }
      return `<div class="slot-empty" title="לחץ לשיבוץ">+</div>`;
    }

    const teacherMeta = Storage.getTeacherByName(slot.teacher);
    const classMeta = Storage.getClassByName(slot.className);
    const subjectMeta = slot.subject ? Storage.getSubjectByName(slot.subject) : null;

    const teacherColor = teacherMeta.color || '#eff6ff';
    const teacherText = teacherMeta.textColor || Admin.getContrastColor(teacherColor);

    const classColor = classMeta.color || '#fef3c7';
    const classText = classMeta.textColor || Admin.getContrastColor(classColor);

    // Same-line lock icon (no separate row / line wasted!)
    const lockHtml = slot.isPermanent
      ? `<span class="lock-inline" title="שיעור קבוע">🔒</span> `
      : '';

    let subjectBadge = '';
    if (subjectMeta) {
      const subjColor = subjectMeta.color || '#dcfce7';
      const subjText = subjectMeta.textColor || Admin.getContrastColor(subjColor);
      const sLen = (slot.subject || '').length;
      const subjFontClass = sLen > 9 ? 'subj-long' : 'subj-short';

      subjectBadge = `
        <span class="badge-item badge-subject ${subjFontClass}" style="background-color: ${subjColor}; color: ${subjText}" title="${slot.subject}">
          ${slot.subject}
        </span>
      `;
    }

    if (isSingleDay) {
      return `
        <div class="slot-card ${slot.isPermanent ? 'is-permanent' : ''}" title="${slot.teacher} • ${slot.className}${slot.subject ? ' • ' + slot.subject : ''}">
          <div class="slot-card-top">
            <span class="badge-item badge-teacher" style="background-color: ${teacherColor}; color: ${teacherText}">
              ${lockHtml}<span>${slot.teacher}</span>
            </span>
          </div>
          <div class="slot-meta-row">
            <span class="badge-item badge-class" style="background-color: ${classColor}; color: ${classText}">
              ${slot.className}
            </span>
            ${subjectBadge}
          </div>
        </div>
      `;
    }

    // Week view with adaptive font sizing and same-line lock
    const tLen = (slot.teacher || '').length;
    const teacherFontClass = tLen > 11 ? 'len-long' : tLen > 6 ? 'len-mid' : 'len-short';

    return `
      <div class="slot-card ${slot.isPermanent ? 'is-permanent' : ''}" title="${slot.teacher} • ${slot.className}${slot.subject ? ' • ' + slot.subject : ''}">
        <!-- Teacher Badge with same-line lock icon -->
        <span class="badge-item badge-teacher ${teacherFontClass}" style="background-color: ${teacherColor}; color: ${teacherText}">
          ${lockHtml}${slot.teacher}
        </span>

        <!-- Class & Subject Mini Row -->
        <div class="slot-meta-row">
          <span class="badge-item badge-class" style="background-color: ${classColor}; color: ${classText}">
            ${slot.className}
          </span>
          ${subjectBadge}
        </div>
      </div>
    `;
  }

  /**
   * Update Room Stats
   */
  function updateRoomStats(room, weekDates) {
    let occupied = 0;
    const total = 6 * 8; // 48 slots

    weekDates.forEach(day => {
      PERIODS.forEach(p => {
        if (getSlotData(room, day.dayIndex, p)) occupied++;
      });
    });

    const statEl = document.getElementById(room === 'lab' ? 'labStats' : 'libStats');
    if (statEl) {
      statEl.textContent = `${occupied}/${total} תפוס`;
    }
  }

  /**
   * Slot Click Handler
   */
  function handleSlotClick(room, day, period) {
    if (window.SoundFX) SoundFX.playClick();
    const slotData = getSlotData(room, day, period);
    const isAdmin = Storage.isAdminActive();
    const isLockedPermanent = slotData && slotData.isPermanent && !isAdmin;

    openBookingModal(room, day, period, slotData, isLockedPermanent);
  }

  /**
   * Setup Booking Modal
   */
  function setupBookingModal() {
    const modalEl = document.getElementById('bookingModal');
    const formEl = document.getElementById('bookingForm');
    const closeBtn = document.getElementById('bookingModalClose');
    const cancelBtn = document.getElementById('btnCancelBooking');
    const deleteBtn = document.getElementById('btnDeleteBooking');

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (window.SoundFX) SoundFX.playClick();
        closeBookingModal();
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        if (window.SoundFX) SoundFX.playClick();
        closeBookingModal();
      });
    }

    if (formEl) {
      formEl.addEventListener('submit', (e) => {
        e.preventDefault();
        saveCurrentBooking();
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        deleteCurrentBooking();
      });
    }
  }

  function openBookingModal(room, day, period, slotData, isLockedPermanent) {
    activeEditingSlot = { room, day, period, existing: slotData };

    const modalEl = document.getElementById('bookingModal');
    const titleEl = document.getElementById('bookingModalTitle');
    const subtitleEl = document.getElementById('bookingModalSubtitle');
    const alertEl = document.getElementById('bookingLockAlert');
    const teacherSelect = document.getElementById('selectTeacher');
    const classSelect = document.getElementById('selectClass');
    const subjectSelect = document.getElementById('selectSubject');
    const permanentCheck = document.getElementById('checkPermanent');
    const saveBtn = document.getElementById('btnSaveBooking');
    const deleteBtn = document.getElementById('btnDeleteBooking');

    const roomTitle = room === 'lab' ? 'חדר מחשבים' : 'ספרייה';
    const dayObj = DAYS[day];
    const weekDates = getWeekDates();
    const dayDate = weekDates[day].formattedDate;

    titleEl.textContent = `${roomTitle} - שיעור ${period}`;
    subtitleEl.textContent = `${dayObj.fullName} (${dayDate}) • בית הספר עלומים חולון`;

    teacherSelect.value = slotData ? slotData.teacher : '';
    classSelect.value = slotData ? slotData.className : '';
    subjectSelect.value = slotData ? (slotData.subject || '') : '';
    permanentCheck.checked = slotData ? !!slotData.isPermanent : false;

    if (isLockedPermanent) {
      alertEl.style.display = 'block';
      alertEl.innerHTML = `
        🔒 <strong>שיעור קבוע:</strong> שיעור זה מוגדר כקבוע במערכת. רק מנהלת המערכת (טטיאנה) מורשית לערוך או לבטל אותו.
      `;
      teacherSelect.disabled = true;
      classSelect.disabled = true;
      subjectSelect.disabled = true;
      permanentCheck.disabled = true;
      saveBtn.style.display = 'none';
      deleteBtn.style.display = 'none';
    } else {
      alertEl.style.display = 'none';
      teacherSelect.disabled = false;
      classSelect.disabled = false;
      subjectSelect.disabled = false;
      permanentCheck.disabled = false;
      saveBtn.style.display = 'inline-flex';
      deleteBtn.style.display = slotData ? 'inline-flex' : 'none';
    }

    modalEl.classList.add('active');
  }

  function closeBookingModal() {
    const modalEl = document.getElementById('bookingModal');
    if (modalEl) modalEl.classList.remove('active');
    activeEditingSlot = null;
  }

  function saveCurrentBooking() {
    if (!activeEditingSlot) return;

    const teacherSelect = document.getElementById('selectTeacher');
    const classSelect = document.getElementById('selectClass');
    const subjectSelect = document.getElementById('selectSubject');
    const permanentCheck = document.getElementById('checkPermanent');

    const teacher = teacherSelect.value;
    const className = classSelect.value;
    const subject = subjectSelect.value || '';
    const isPermanent = permanentCheck.checked;

    if (!teacher || !className) {
      App.showToast('נא לבחור מורה וכיתה', 'warning');
      return;
    }

    const { room, day, period } = activeEditingSlot;
    const weekKey = getActiveWeekKey();

    const newBooking = {
      room,
      day,
      period,
      teacher,
      className,
      subject,
      isPermanent,
      updatedAt: new Date().toISOString()
    };

    const schedule = Storage.getSchedule();
    const baseKey = `${room}_${day}_${period}`;
    schedule[baseKey] = newBooking;
    Storage.saveSchedule(schedule, baseKey);

    const overrides = Storage.getOverrides();
    const overrideKey = `${weekKey}_${room}_${day}_${period}`;
    if (overrides[overrideKey] !== undefined) {
      delete overrides[overrideKey];
      Storage.saveOverrides(overrides, overrideKey);
    }

    closeBookingModal();
    renderTables();

    // Play cheerful chime!
    if (window.SoundFX) SoundFX.playSuccess();

    const roomTitle = room === 'lab' ? 'חדר המחשבים' : 'הספרייה';
    App.showToast(`השיבוץ ב${roomTitle} נשמר בהצלחה! ✨`, 'success');
  }

  function deleteCurrentBooking() {
    if (!activeEditingSlot) return;

    const { room, day, period, existing } = activeEditingSlot;
    const isAdmin = Storage.isAdminActive();

    if (existing && existing.isPermanent && !isAdmin) {
      App.showToast('רק טטיאנה יכולה למחוק שיעור קבוע', 'danger');
      return;
    }

    if (!confirm('האם לבטל שיבוץ זה?')) return;

    const weekKey = getActiveWeekKey();
    const schedule = Storage.getSchedule();
    const baseKey = `${room}_${day}_${period}`;

    delete schedule[baseKey];
    Storage.saveSchedule(schedule, baseKey);

    const overrides = Storage.getOverrides();
    const overrideKey = `${weekKey}_${room}_${day}_${period}`;
    delete overrides[overrideKey];
    Storage.saveOverrides(overrides, overrideKey);

    closeBookingModal();
    renderTables();

    // Play delete sound
    if (window.SoundFX) SoundFX.playDelete();

    App.showToast('השיבוץ בוטל', 'info');
  }

  function highlightUpdatedSlot(slotKey) {
    if (!slotKey) return;
    const parts = slotKey.split('_');
    let r, d, p;
    if (parts.length === 3) {
      [r, d, p] = parts;
    } else if (parts.length >= 4) {
      // Overrides key format: week_room_day_period
      r = parts[1];
      d = parts[2];
      p = parts[3];
    }
    if (r && d !== undefined && p !== undefined) {
      const selector = `.slot-cell[data-room="${r}"][data-day="${d}"][data-period="${p}"]`;
      document.querySelectorAll(selector).forEach(cell => {
        cell.classList.remove('slot-updated-flash');
        void cell.offsetWidth;
        cell.classList.add('slot-updated-flash');
        setTimeout(() => cell.classList.remove('slot-updated-flash'), 2200);
      });
    }
  }

  function onRemoteDataChanged(changedKeys = []) {
    renderTables();
    if (Array.isArray(changedKeys) && changedKeys.length > 0) {
      changedKeys.forEach(k => highlightUpdatedSlot(k));
    }
  }

  function updateDropdowns() {
    const teacherSelect = document.getElementById('selectTeacher');
    const classSelect = document.getElementById('selectClass');
    const subjectSelect = document.getElementById('selectSubject');

    if (teacherSelect) {
      const teachers = Storage.getTeachers();
      teacherSelect.innerHTML = `<option value="">-- בחר/י מורה --</option>` +
        teachers.map(t => `<option value="${t.name}">👤 ${t.name}</option>`).join('');
    }

    if (classSelect) {
      const classes = Storage.getClasses();
      classSelect.innerHTML = `<option value="">-- בחר/י כיתה --</option>` +
        classes.map(c => `<option value="${c.name}">👥 ${c.name}</option>`).join('');
    }

    if (subjectSelect) {
      const subjects = Storage.getSubjects();
      subjectSelect.innerHTML = `<option value="">-- ללא מקצוע / בחר מקצוע --</option>` +
        subjects.map(s => `<option value="${s.name}">📖 ${s.name}</option>`).join('');
    }
  }

  return {
    init,
    renderTables,
    updateDropdowns,
    getWeekDates,
    switchRoom,
    getActiveRoom,
    switchViewMode,
    getActiveViewMode,
    highlightUpdatedSlot,
    onRemoteDataChanged
  };
})();

// Export globally
window.Schedule = Schedule;
