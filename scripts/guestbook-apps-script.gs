const SHEET_NAME = 'guestbook';
const HAS_HEADER_ROW = true;
const GUESTBOOK_MESSAGE_PREFIX = '__GBV1__';
const ADMIN_KEY_PROPERTY = 'GUESTBOOK_ADMIN_KEY';
const TS_COLUMN_FORMAT = 'yyyy"년" m"월" d"일"';

function doGet(e) {
  try {
    const action = String((e && e.parameter && e.parameter.action) || 'list');
    if (action === 'list') {
      return jsonOutput(listGuestbook_({ includeIp: false }));
    }

    if (action === 'listAdmin') {
      requireAdminKey_(String((e && e.parameter && e.parameter.adminKey) || ''));
      return jsonOutput(listGuestbook_({ includeIp: true }));
    }

    return jsonOutput({ ok: false, error: 'invalid action' });
  } catch (error) {
    return jsonOutput({ ok: false, error: String(error && error.message || error || 'unknown') });
  }
}

function doPost(e) {
  try {
    const payload = parsePayload_(e);
    if (!payload) {
      return jsonOutput({ ok: false, error: 'invalid json' });
    }

    const action = String(payload.action || '');
    if (action !== 'add') {
      return jsonOutput({ ok: false, error: 'invalid action' });
    }

    const name = String(payload.name || '').trim();
    const ip = String(payload.ip || '').trim();
    const decoded = decodeMessagePayload_(String(payload.msg || ''));
    const msg = String(decoded.msg || '').trim();
    const fallbackIp = String(decoded.ip || '').trim();

    if (!name || !msg) {
      return jsonOutput({ ok: false, error: 'missing fields' });
    }

    const ts = Date.now();
    appendGuestbookRow_(ts, name, msg, ip || fallbackIp);
    return jsonOutput({ ok: true, ts: ts });
  } catch (error) {
    return jsonOutput({ ok: false, error: String(error && error.message || error || 'unknown') });
  }
}

function listGuestbook_(options) {
  const includeIp = Boolean(options && options.includeIp);
  const sheet = getGuestbookSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow <= (HAS_HEADER_ROW ? 1 : 0)) {
    return [];
  }

  const startRow = HAS_HEADER_ROW ? 2 : 1;
  const numRows = lastRow - startRow + 1;
  const values = sheet.getRange(startRow, 1, numRows, 4).getValues();

  return values
    .filter(function(row) {
      return row[0] || row[1] || row[2] || row[3];
    })
    .map(function(row) {
      const decoded = decodeMessagePayload_(String(row[2] || ''));
      const ip = String(row[3] || '').trim() || String(decoded.ip || '').trim();
      const item = {
        ts: toTimestamp_(row[0]),
        name: String(row[1] || ''),
        msg: String(decoded.msg || ''),
      };
      if (includeIp) {
        item.ip = ip;
      }
      return item;
    });
}

function appendGuestbookRow_(ts, name, msg, ip) {
  const sheet = getGuestbookSheet_();
  ensureHeaderRow_(sheet);
  const rowIndex = sheet.getLastRow() + 1;
  sheet.getRange(rowIndex, 1, 1, 4).setValues([[new Date(ts), name, msg, ip]]);
  sheet.getRange(rowIndex, 1).setNumberFormat(TS_COLUMN_FORMAT);
}

function getGuestbookSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  ensureHeaderRow_(sheet);
  return sheet;
}

function ensureHeaderRow_(sheet) {
  if (!HAS_HEADER_ROW) return;
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['ts', 'name', 'msg', 'ip']);
    sheet.getRange('A:A').setNumberFormat(TS_COLUMN_FORMAT);
    return;
  }

  const header = sheet.getRange(1, 1, 1, 4).getValues()[0];
  if (header[0] !== 'ts' || header[1] !== 'name' || header[2] !== 'msg' || header[3] !== 'ip') {
    sheet.insertRows(1, 1);
    sheet.getRange(1, 1, 1, 4).setValues([['ts', 'name', 'msg', 'ip']]);
  }
  sheet.getRange('A:A').setNumberFormat(TS_COLUMN_FORMAT);
}

function parsePayload_(e) {
  const raw = e && e.postData && e.postData.contents;
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function requireAdminKey_(providedKey) {
  const expectedKey = PropertiesService.getScriptProperties().getProperty(ADMIN_KEY_PROPERTY);
  if (!expectedKey) {
    throw new Error('admin key not configured');
  }

  if (!providedKey || providedKey !== expectedKey) {
    throw new Error('forbidden');
  }
}

function toTimestamp_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return value.getTime();
  }

  const numeric = Number(value || 0);
  return isFinite(numeric) && numeric > 0 ? numeric : 0;
}

function decodeMessagePayload_(message) {
  const raw = String(message || '');
  if (raw.indexOf(GUESTBOOK_MESSAGE_PREFIX) !== 0) {
    return { msg: raw, ip: '' };
  }

  try {
    const encoded = raw.slice(GUESTBOOK_MESSAGE_PREFIX.length);
    const json = Utilities.newBlob(Utilities.base64DecodeWebSafe(encoded)).getDataAsString();
    const parsed = JSON.parse(json);
    return {
      msg: String(parsed && parsed.msg || ''),
      ip: String(parsed && parsed.ip || ''),
    };
  } catch (error) {
    return { msg: raw, ip: '' };
  }
}

function jsonOutput(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
