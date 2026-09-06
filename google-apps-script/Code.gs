/**
 * CompAlumim - Google Apps Script Backend
 * 
 * Instructions:
 * 1. Open Google Sheets (https://sheets.new)
 * 2. Click: Extensions -> Apps Script (הרחבות -> Apps Script)
 * 3. Delete existing code and paste this entire file
 * 4. Click: Deploy -> New deployment (פריסה -> פריסה חדשה)
 * 5. Select type: "Web app" (אפליקציית אינטרנט)
 *    - Description: "CompAlumim Sync"
 *    - Execute as: "Me" (אני)
 *    - Who has access: "Anyone" (כל אחד)  <-- IMPORTANT!
 * 6. Click "Deploy" (פרוס) and authorize permissions
 * 7. Copy the "Web app URL" and paste it into CompAlumim Admin Settings!
 */

// Sheet Names
const SHEET_TEACHERS = 'Teachers';
const SHEET_CLASSES  = 'Classes';
const SHEET_SUBJECTS = 'Subjects';
const SHEET_SCHEDULE = 'Schedule';
const SHEET_CONFIG   = 'Config';

/**
 * Handle HTTP GET Requests: returns all school schedule data as JSON
 */
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureSheetsExist(ss);

    const data = {
      teachers: readSheetObjects(ss.getSheetByName(SHEET_TEACHERS)),
      classes:  readSheetObjects(ss.getSheetByName(SHEET_CLASSES)),
      subjects: readSheetObjects(ss.getSheetByName(SHEET_SUBJECTS)),
      schedule: readScheduleMap(ss.getSheetByName(SHEET_SCHEDULE)),
      overrides: readOverridesMap(ss.getSheetByName(SHEET_CONFIG))
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

      return jsonResponse({ ok: true, message: 'All data synchronized successfully' });
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
 * Ensure necessary sheets and headers exist
 */
function ensureSheetsExist(ss) {
  const definitions = [
    { name: SHEET_TEACHERS, headers: ['id', 'name', 'color', 'textColor'] },
    { name: SHEET_CLASSES,  headers: ['id', 'name', 'color', 'textColor'] },
    { name: SHEET_SUBJECTS, headers: ['id', 'name', 'color', 'textColor'] },
    { name: SHEET_SCHEDULE, headers: ['key', 'room', 'day', 'period', 'teacher', 'className', 'subject', 'isPermanent', 'updatedAt'] },
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
 * Write array of objects to sheet
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

  const map = {};
  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    const key = row[0];
    if (!key) continue;

    map[key] = {
      room: row[1],
      day: Number(row[2]),
      period: Number(row[3]),
      teacher: row[4],
      className: row[5],
      subject: row[6] || '',
      isPermanent: String(row[7]).toLowerCase() === 'true',
      updatedAt: row[8] || ''
    };
  }
  return map;
}

/**
 * Write Schedule object map to Schedule sheet
 */
function writeScheduleMap(sheet, schedule) {
  if (!sheet) return;
  const headers = ['key', 'room', 'day', 'period', 'teacher', 'className', 'subject', 'isPermanent', 'updatedAt'];
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
