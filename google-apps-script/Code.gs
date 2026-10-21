/**
 * CompAlumim - Google Apps Script Backend
 * 
 * Instructions for Updating / Deploying:
 * 1. Open Google Sheets (https://docs.google.com/spreadsheets/d/1TMXT1Ml0YBzI-OOreZvsc6UT9Wg9IlufXvpMlM45lM8/edit)
 * 2. Click: Extensions -> Apps Script (הרחבות -> Apps Script)
 * 3. Delete existing code and paste this ENTIRE file
 * 4. Click: Deploy -> Manage deployments (פריסה -> ניהול פריסות)
 * 5. Click the Edit pencil icon (ערוך) on your Web App deployment
 * 6. Under "Version", select "New version" (גרסה חדשה)  <-- IMPORTANT!
 * 7. Click "Deploy" (פרוס) and authorize permissions
 * 8. Any changes sync immediately with the app!
 */

// Default Sheet Names
const SHEET_TEACHERS = 'Teachers';
const SHEET_CLASSES  = 'Classes';
const SHEET_SUBJECTS = 'Subjects';
const SHEET_SCHEDULE = 'Schedule';
const SHEET_CONFIG   = 'Config';
const SHEET_INVENTORY = 'Inventory';
const SHEET_INVENTORY_LOOKUPS = 'InventoryLookups';

// Known GID for Inventory tab if specified in Google Sheets URL
const INVENTORY_TAB_GID = 1551268083;

/**
 * Handle HTTP GET Requests: returns all school schedule & inventory data as JSON
 */
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureSheetsExist(ss);

    const invSheet = getInventorySheet(ss);
    const lookupsSheet = getInventoryLookupsSheet(ss);

    const data = {
      teachers: readSheetObjects(ss.getSheetByName(SHEET_TEACHERS)),
      classes:  readSheetObjects(ss.getSheetByName(SHEET_CLASSES)),
      subjects: readSheetObjects(ss.getSheetByName(SHEET_SUBJECTS)),
      schedule: readScheduleMap(ss.getSheetByName(SHEET_SCHEDULE)),
      overrides: readOverridesMap(ss.getSheetByName(SHEET_CONFIG)),
      inventory: invSheet ? readInventorySheet(invSheet) : [],
      inventoryLookups: lookupsSheet ? readInventoryLookups(lookupsSheet) : null
    };

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, data: data }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle HTTP POST Requests: saves data sent from CompAlumim app
 */
function doPost(e) {
  try {
    const contents = e.postData ? e.postData.contents : '';
    if (!contents) {
      return jsonResponse({ ok: false, error: 'Empty post body' });
    }

    const payload = JSON.parse(contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureSheetsExist(ss);

    if (payload.action === 'setAll' && payload.data) {
      const d = payload.data;

      if (d.teachers) writeSheetObjects(ss.getSheetByName(SHEET_TEACHERS), d.teachers, ['id', 'name', 'color', 'textColor']);
      if (d.classes)  writeSheetObjects(ss.getSheetByName(SHEET_CLASSES), d.classes, ['id', 'name', 'color', 'textColor']);
      if (d.subjects) writeSheetObjects(ss.getSheetByName(SHEET_SUBJECTS), d.subjects, ['id', 'name', 'color', 'textColor']);
      if (d.schedule) writeScheduleMap(ss.getSheetByName(SHEET_SCHEDULE), d.schedule);
      if (d.overrides) writeOverridesMap(ss.getSheetByName(SHEET_CONFIG), d.overrides);
      if (d.inventory) {
        const invSheet = getInventorySheet(ss) || ss.insertSheet(SHEET_INVENTORY);
        writeInventorySheet(invSheet, d.inventory);
      }
      if (d.inventoryLookups) {
        const lookupsSheet = getInventoryLookupsSheet(ss) || ss.insertSheet(SHEET_INVENTORY_LOOKUPS);
        writeInventoryLookups(lookupsSheet, d.inventoryLookups);
      }

      return jsonResponse({ ok: true, message: 'All data synchronized successfully' });
    }

    if (payload.action === 'saveInventory' && payload.data) {
      const d = payload.data;
      if (d.inventory) {
        const invSheet = getInventorySheet(ss) || ss.insertSheet(SHEET_INVENTORY);
        writeInventorySheet(invSheet, d.inventory);
      }
      if (d.inventoryLookups) {
        const lookupsSheet = getInventoryLookupsSheet(ss) || ss.insertSheet(SHEET_INVENTORY_LOOKUPS);
        writeInventoryLookups(lookupsSheet, d.inventoryLookups);
      }

      return jsonResponse({ ok: true, message: 'Inventory synchronized successfully' });
    }

    return jsonResponse({ ok: false, error: 'Unknown action' });

  } catch (err) {
    return jsonResponse({ ok: false, error: err.toString() });
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Intelligent Inventory Sheet Finder:
 * 1. Checks specific tab GID (1551268083) from spreadsheet URL
 * 2. Checks common tab names in Hebrew, English, Russian
 * 3. Checks fuzzy / case-insensitive matching
 */
function getInventorySheet(ss) {
  if (!ss) return null;
  const sheets = ss.getSheets();

  // 1. Check by explicit GID
  const byGid = sheets.find(s => s.getSheetId() === INVENTORY_TAB_GID);
  if (byGid) return byGid;

  // 2. Exact match on known names
  const knownNames = [
    'Inventory', 'inventory', 'אינוונטר', 'אינוונטריזציה',
    'ציוד', 'מחשבים', 'מחשבים וציוד', 'Инвентаризация', 'Инвентарь', 'Equipment'
  ];
  for (let i = 0; i < knownNames.length; i++) {
    const s = ss.getSheetByName(knownNames[i]);
    if (s) return s;
  }

  // 3. Case-insensitive / partial match
  const byFuzzy = sheets.find(s => {
    const n = s.getName().toLowerCase().trim();
    return n.includes('invent') || n.includes('אינוונטר') || n.includes('ציוד') || n.includes('инвент');
  });
  if (byFuzzy) return byFuzzy;

  return null;
}

/**
 * Intelligent Lookups Sheet Finder
 */
function getInventoryLookupsSheet(ss) {
  if (!ss) return null;
  const knownNames = ['InventoryLookups', 'Lookups', 'רשימות_אינוונטר', 'אינוונטר_הגדרות', 'Справочники'];
  for (let i = 0; i < knownNames.length; i++) {
    const s = ss.getSheetByName(knownNames[i]);
    if (s) return s;
  }
  return null;
}

/**
 * Ensure necessary sheets and headers exist
 */
function ensureSheetsExist(ss) {
  const definitions = [
    { name: SHEET_TEACHERS, headers: ['id', 'name', 'color', 'textColor'] },
    { name: SHEET_CLASSES,  headers: ['id', 'name', 'color', 'textColor'] },
    { name: SHEET_SUBJECTS, headers: ['id', 'name', 'color', 'textColor'] },
    { name: SHEET_SCHEDULE, headers: ['key', 'room', 'day', 'period', 'teacher', 'teacher2', 'className', 'subject', 'isPermanent', 'updatedAt'] },
    { name: SHEET_CONFIG,   headers: ['key', 'jsonValue'] }
  ];

  definitions.forEach(def => {
    let sheet = ss.getSheetByName(def.name);
    if (!sheet) {
      sheet = ss.insertSheet(def.name);
      sheet.appendRow(def.headers);
      sheet.getRange(1, 1, 1, def.headers.length).setFontWeight('bold').setBackground('#f1f5f9');
    }
  });

  // Ensure Inventory sheet exists
  let invSheet = getInventorySheet(ss);
  if (!invSheet) {
    invSheet = ss.insertSheet(SHEET_INVENTORY);
    const invHeaders = ['seq', 'sn', 'type', 'brand', 'status', 'location', 'statusDate', 'issue', 'notes', 'updatedAt', 'id'];
    invSheet.appendRow(invHeaders);
    invSheet.getRange(1, 1, 1, invHeaders.length).setFontWeight('bold').setBackground('#f1f5f9');
  }

  // Ensure InventoryLookups sheet exists
  let lookupsSheet = getInventoryLookupsSheet(ss);
  if (!lookupsSheet) {
    lookupsSheet = ss.insertSheet(SHEET_INVENTORY_LOOKUPS);
    const lookupHeaders = ['types', 'brands', 'statuses', 'locations', 'issues'];
    lookupsSheet.appendRow(lookupHeaders);
    lookupsSheet.getRange(1, 1, 1, lookupHeaders.length).setFontWeight('bold').setBackground('#f1f5f9');
  }
}

/**
 * Read table as array of objects using first row as keys
 */
function readSheetObjects(sheet) {
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0];
  const results = [];

  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    if (!row[0] && !row[1]) continue;
    const item = {};
    headers.forEach((h, c) => {
      item[h] = row[c];
    });
    results.push(item);
  }
  return results;
}

/**
 * Read Inventory items with multi-lingual header support (Hebrew, Russian, English)
 * and robust handling for Date cell values & SN column.
 */
function readInventorySheet(sheet) {
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0].map(h => String(h || '').trim().toLowerCase());

  // Alias dictionary mapping localized column names to standard keys
  const fieldAliases = {
    seq: ['seq', 'מס״ד', 'מסד', 'מספר סידורי', '№', 'номер', 'num'],
    sn: ['sn', 'id (sn)', 'id(sn)', 'id / sn', 's/n', 'serial', 'serialnumber', 'מזהה', 'מספר סידורי (sn)', 'סריאלי', 'серийный номер', 'ид', 'серийник'],
    type: ['type', 'סוג ציוד', 'סוג', 'тип', 'тип оборудования', 'устройство'],
    brand: ['brand', 'model', 'מותג / דגם', 'מותג', 'דגם', 'מותג ודגם', 'бренд', 'модель', 'марка'],
    status: ['status', 'סטטוס', 'מצב', 'статус', 'состояние'],
    location: ['location', 'room', 'מיקום', 'כיתה', 'חדר', 'местоположение', 'кабинет', 'локация'],
    statusDate: ['statusdate', 'date', 'תאריך שינוי סטטוס', 'תאריך סטטוס', 'תאריך', 'дата', 'дата статуса'],
    issue: ['issue', 'problem', 'fault', 'פירוט תקלה', 'תקלה', 'בעיה', 'неисправность', 'проблема', 'поломка'],
    notes: ['notes', 'note', 'comments', 'הערות', 'הערה', 'примечания', 'заметки', 'комментарии'],
    updatedAt: ['updatedat', 'עודכן', 'обновлено'],
    id: ['internal_id', '_id', 'uid']
  };

  // Find column index for each field
  const colIndexMap = {};
  Object.keys(fieldAliases).forEach(field => {
    const aliases = fieldAliases[field];
    for (let c = 0; c < headers.length; c++) {
      const h = headers[c];
      if (aliases.includes(h) || aliases.some(a => h.indexOf(a) !== -1)) {
        if (colIndexMap[field] === undefined) {
          colIndexMap[field] = c;
          break;
        }
      }
    }
  });

  const results = [];
  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    const hasContent = row.some(cell => cell !== '' && cell !== null && cell !== undefined);
    if (!hasContent) continue;

    const getVal = (field) => {
      const idx = colIndexMap[field];
      if (idx !== undefined && row[idx] !== undefined && row[idx] !== null) {
        return row[idx];
      }
      return '';
    };

    const seqVal = getVal('seq');
    const snVal = getVal('sn');
    const typeVal = getVal('type');
    const brandVal = getVal('brand');
    const locationVal = getVal('location');

    // Skip row if it doesn't represent any device
    if (!typeVal && !brandVal && !locationVal && !snVal && !seqVal) continue;

    const idVal = getVal('id') || ('inv_' + r + '_' + Date.now());

    // Format Date object if Google Sheets formatted it as Date
    let dateStr = getVal('statusDate');
    if (dateStr instanceof Date) {
      const yr = dateStr.getFullYear();
      const mo = String(dateStr.getMonth() + 1).padStart(2, '0');
      const da = String(dateStr.getDate()).padStart(2, '0');
      dateStr = `${yr}-${mo}-${da}`;
    }

    results.push({
      id: String(idVal),
      seq: Number(seqVal) || r,
      sn: String(snVal || '').trim(),
      type: String(typeVal || '').trim(),
      brand: String(brandVal || '').trim(),
      status: String(getVal('status') || 'תקין / עובד').trim(),
      location: String(locationVal || '').trim(),
      statusDate: String(dateStr || '').trim(),
      issue: String(getVal('issue') || 'תקין (ללא תקלה)').trim(),
      notes: String(getVal('notes') || '').trim(),
      updatedAt: String(getVal('updatedAt') || new Date().toISOString()).trim()
    });
  }

  return results;
}

/**
 * Write Inventory items to sheet
 */
function writeInventorySheet(sheet, items) {
  if (!sheet) return;
  const headers = ['seq', 'sn', 'type', 'brand', 'status', 'location', 'statusDate', 'issue', 'notes', 'updatedAt', 'id'];
  sheet.clearContents();
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f1f5f9');

  if (!items || !items.length) return;

  const rows = items.map((item, idx) => {
    return [
      Number(item.seq) || (idx + 1),
      String(item.sn || '').trim(),
      String(item.type || '').trim(),
      String(item.brand || '').trim(),
      String(item.status || 'תקין / עובד').trim(),
      String(item.location || '').trim(),
      String(item.statusDate || '').trim(),
      String(item.issue || 'תקין (ללא תקלה)').trim(),
      String(item.notes || '').trim(),
      String(item.updatedAt || new Date().toISOString()).trim(),
      String(item.id || ('inv_' + (idx + 1)))
    ];
  });

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

/**
 * Write array of objects to sheet (generic)
 */
function writeSheetObjects(sheet, items, headers) {
  if (!sheet) return;
  sheet.clearContents();
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f1f5f9');

  if (!items || !items.length) return;

  const rows = items.map(item => {
    return headers.map(h => item[h] !== undefined ? item[h] : '');
  });

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

/**
 * Read Schedule object map from Schedule sheet
 */
function readScheduleMap(sheet) {
  if (!sheet) return {};
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return {};

  const headers = data[0];
  const t2Idx = headers.indexOf('teacher2');
  const classIdx = headers.indexOf('className');
  const subjIdx = headers.indexOf('subject');
  const permIdx = headers.indexOf('isPermanent');
  const updIdx = headers.indexOf('updatedAt');

  const map = {};
  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    const key = row[0];
    if (!key) continue;

    let t1 = String(row[4] || '').trim();
    let t2 = t2Idx !== -1 ? String(row[t2Idx] || '').trim() : '';

    if (!t2 && t1) {
      const splitMatch = t1.split(/\s*(?:[+/&,]|(?:\s+ו(?:\s+|$)))\s*/);
      if (splitMatch.length >= 2 && splitMatch[0] && splitMatch[1]) {
        t1 = splitMatch[0].trim();
        t2 = splitMatch[1].trim();
      }
    }

    map[key] = {
      room: row[1],
      day: Number(row[2]),
      period: Number(row[3]),
      teacher: t1,
      teacher2: t2,
      className: classIdx !== -1 ? row[classIdx] : row[5],
      subject: (subjIdx !== -1 ? row[subjIdx] : row[6]) || '',
      isPermanent: String(permIdx !== -1 ? row[permIdx] : row[7]).toLowerCase() === 'true',
      updatedAt: (updIdx !== -1 ? row[updIdx] : row[8]) || ''
    };
  }
  return map;
}

/**
 * Write Schedule object map to Schedule sheet
 */
function writeScheduleMap(sheet, schedule) {
  if (!sheet) return;
  const headers = ['key', 'room', 'day', 'period', 'teacher', 'teacher2', 'className', 'subject', 'isPermanent', 'updatedAt'];
  sheet.clearContents();
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f1f5f9');

  const keys = Object.keys(schedule || {});
  if (!keys.length) return;

  const rows = keys.map(k => {
    const s = schedule[k];
    return [
      k,
      s.room || '',
      s.day !== undefined ? s.day : '',
      s.period !== undefined ? s.period : '',
      s.teacher || '',
      s.teacher2 || '',
      s.className || '',
      s.subject || '',
      !!s.isPermanent,
      s.updatedAt || ''
    ];
  });

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

/**
 * Read overrides map from Config sheet
 */
function readOverridesMap(sheet) {
  if (!sheet) return {};
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return {};

  for (let r = 1; r < data.length; r++) {
    if (data[r][0] === 'overrides' && data[r][1]) {
      try {
        return JSON.parse(data[r][1]);
      } catch {
        return {};
      }
    }
  }
  return {};
}

/**
 * Write overrides map to Config sheet
 */
function writeOverridesMap(sheet, overrides) {
  if (!sheet) return;
  const jsonStr = JSON.stringify(overrides || {});
  const data = sheet.getDataRange().getValues();

  for (let r = 1; r < data.length; r++) {
    if (data[r][0] === 'overrides') {
      sheet.getRange(r + 1, 2).setValue(jsonStr);
      return;
    }
  }

  sheet.appendRow(['overrides', jsonStr]);
}

/**
 * Read Inventory Lookup categories (types, brands, statuses, locations, issues)
 */
function readInventoryLookups(sheet) {
  if (!sheet) return null;
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return null;

  const headers = data[0];
  const lookups = {
    types: [],
    brands: [],
    statuses: [],
    locations: [],
    issues: []
  };

  headers.forEach((h, c) => {
    const key = String(h).trim();
    if (lookups[key] !== undefined) {
      for (let r = 1; r < data.length; r++) {
        const val = String(data[r][c] || '').trim();
        if (val && !lookups[key].includes(val)) {
          lookups[key].push(val);
        }
      }
    }
  });

  return lookups;
}

/**
 * Write Inventory Lookup categories
 */
function writeInventoryLookups(sheet, lookups) {
  if (!sheet || !lookups) return;
  const headers = ['types', 'brands', 'statuses', 'locations', 'issues'];
  sheet.clearContents();
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f1f5f9');

  const maxLen = Math.max(
    (lookups.types || []).length,
    (lookups.brands || []).length,
    (lookups.statuses || []).length,
    (lookups.locations || []).length,
    (lookups.issues || []).length
  );

  if (maxLen === 0) return;

  const rows = [];
  for (let r = 0; r < maxLen; r++) {
    rows.push([
      (lookups.types && lookups.types[r]) || '',
      (lookups.brands && lookups.brands[r]) || '',
      (lookups.statuses && lookups.statuses[r]) || '',
      (lookups.locations && lookups.locations[r]) || '',
      (lookups.issues && lookups.issues[r]) || ''
    ]);
  }

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}
