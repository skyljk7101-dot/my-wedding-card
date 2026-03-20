const SHEET_NAME = 'guestbook';
const HAS_HEADER_ROW = true;
const GUESTBOOK_MESSAGE_PREFIX = '__GBV1__';
const ADMIN_KEY_PROPERTY = 'GUESTBOOK_ADMIN_KEY';
const SHEET_TIME_ZONE = 'Asia/Seoul';
const TS_COLUMN_FORMAT = 'yyyy"년" m"월" d"일" hh"시" mm"분" ss"초"';
const SHEET_SERIAL_EPOCH_MS = Date.UTC(1899, 11, 30);
const BANNED_KEYWORDS = ['바카라', '카지노', '도박', '토토', '성인용품', '씨발', '개새끼', '병신', '지랄']; // 차단할 키워드 목록

function doGet(e) {
  try {
    const action = String((e && e.parameter && e.parameter.action) || 'list');
    if (action === 'list') {
      const cache = CacheService.getScriptCache();
      const cachedData = cache.get('GB_LIST_PUBLIC');
      if (cachedData) {
        try {
          return jsonOutput(JSON.parse(cachedData));
        } catch (err) { /* JSON 파싱 실패 시 무시하고 새로 조회 */ }
      }
      const list = listGuestbook_({ includeIp: false });
      cache.put('GB_LIST_PUBLIC', JSON.stringify(list), 60); // 60초 동안 캐싱
      return jsonOutput(list);
    }

    if (action === 'listAdmin') {
      requireAdminKey_(String((e && e.parameter && e.parameter.adminKey) || ''));
      return jsonOutput(listGuestbook_({ includeIp: true }));
    }

    return jsonOutput({ ok: false, error: 'invalid action' });
  } catch (error) {
    return jsonOutput({ ok: false, error: String((error && error.message) || error || 'unknown') });
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

    if (name.length > 50 || msg.length > 1000) {
      return jsonOutput({ ok: false, error: 'payload too large' });
    }

    const isBanned = BANNED_KEYWORDS.some(keyword => name.includes(keyword) || msg.includes(keyword));
    if (isBanned) {
      return jsonOutput({ ok: false, error: 'blocked keyword included' });
    }

    const ts = Date.now();
    appendGuestbookRow_(ts, name, msg, ip || fallbackIp);
    CacheService.getScriptCache().remove('GB_LIST_PUBLIC'); // 새 글 작성 시 캐시 즉시 초기화

    return jsonOutput({ ok: true, ts: ts });
  } catch (error) {
    return jsonOutput({ ok: false, error: String((error && error.message) || error || 'unknown') });
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
  const range = sheet.getRange(startRow, 1, numRows, 4);
  const values = range.getValues();
  const displayValues = range.getDisplayValues();

  return values
    .map(function(row, index) {
      const displayRow = displayValues[index] || [];
      if (!row[0] && !row[1] && !row[2] && !row[3] && !displayRow[0] && !displayRow[1] && !displayRow[2] && !displayRow[3]) {
        return null;
      }

      const decoded = decodeMessagePayload_(String(row[2] || displayRow[2] || ''));
      const ip = String(row[3] || displayRow[3] || '').trim() || String(decoded.ip || '').trim();
      const item = {
        ts: toTimestamp_(row[0], displayRow[0]),
        name: String(row[1] || displayRow[1] || ''),
        msg: String(decoded.msg || ''),
      };

      if (includeIp) {
        item.ip = ip;
      }

      return item;
    })
    .filter(function(item) {
      return item !== null;
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
  ss.setSpreadsheetTimeZone(SHEET_TIME_ZONE);
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  ensureHeaderRow_(sheet);
  normalizeLegacyTimestampColumn_(sheet);
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

function normalizeLegacyTimestampColumn_(sheet) {
  const startRow = HAS_HEADER_ROW ? 2 : 1;
  const lastRow = sheet.getLastRow();
  if (lastRow < startRow) return;

  const range = sheet.getRange(startRow, 1, lastRow - startRow + 1, 1);
  const values = range.getValues();
  const displayValues = range.getDisplayValues();
  let changed = false;

  const normalizedValues = values.map(function(row, index) {
    const originalValue = row[0];
    const displayValue = displayValues[index] ? displayValues[index][0] : '';
    const normalizedValue = normalizeTimestampCellValue_(originalValue, displayValue);

    if (!cellValuesEqual_(originalValue, normalizedValue)) {
      changed = true;
    }

    return [normalizedValue];
  });

  if (changed) {
    range.setValues(normalizedValues);
  }

  range.setNumberFormat(TS_COLUMN_FORMAT);
}

function normalizeTimestampCellValue_(value, displayValue) {
  if (isValidDate_(value)) {
    return value;
  }

  if (typeof value === 'number' && isFinite(value)) {
    if (value > 100000000000) {
      return new Date(value);
    }

    if (value > 30000 && value < 100000) {
      return sheetSerialToDate_(value);
    }
  }

  const candidates = [];
  const rawValue = String(value || '').trim();
  const rawDisplayValue = String(displayValue || '').trim();

  if (rawValue) candidates.push(rawValue);
  if (rawDisplayValue && rawDisplayValue !== rawValue) candidates.push(rawDisplayValue);

  for (let i = 0; i < candidates.length; i += 1) {
    const candidate = candidates[i];
    const normalized = parseTimestampString_(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return value;
}

function parseTimestampString_(raw) {
  const value = String(raw || '').trim();
  if (!value) return null;

  const numeric = Number(value);
  if (isFinite(numeric)) {
    if (numeric > 100000000000) {
      return new Date(numeric);
    }

    if (numeric > 30000 && numeric < 100000) {
      return sheetSerialToDate_(numeric);
    }
  }

  const koreanFull = value.match(/^(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*(오전|오후)?\s*(\d{1,2})시\s*(\d{1,2})분\s*(\d{1,2})초$/);
  if (koreanFull) {
    return buildDateFromParts_(
      koreanFull[1],
      koreanFull[2],
      koreanFull[3],
      koreanFull[5],
      koreanFull[6],
      koreanFull[7],
      koreanFull[4]
    );
  }

  const dotted = value.match(/^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(오전|오후)?\s*(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
  if (dotted) {
    return buildDateFromParts_(
      dotted[1],
      dotted[2],
      dotted[3],
      dotted[5],
      dotted[6],
      dotted[7] || 0,
      dotted[4]
    );
  }

  const slashOrDash = value.match(/^(\d{4})[-/.]\s*(\d{1,2})[-/.]\s*(\d{1,2})\s*(오전|오후)?\s*(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
  if (slashOrDash) {
    return buildDateFromParts_(
      slashOrDash[1],
      slashOrDash[2],
      slashOrDash[3],
      slashOrDash[5],
      slashOrDash[6],
      slashOrDash[7] || 0,
      slashOrDash[4]
    );
  }

  const parsed = Date.parse(value);
  if (isFinite(parsed) && parsed > 0) {
    return new Date(parsed);
  }

  return null;
}

function buildDateFromParts_(year, month, day, hour, minute, second, meridiem) {
  let normalizedHour = Number(hour);
  const normalizedMinute = Number(minute);
  const normalizedSecond = Number(second || 0);

  if (meridiem === '오전' && normalizedHour === 12) {
    normalizedHour = 0;
  } else if (meridiem === '오후' && normalizedHour < 12) {
    normalizedHour += 12;
  }

  const candidate = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    normalizedHour,
    normalizedMinute,
    normalizedSecond
  );

  return isValidDate_(candidate) ? candidate : null;
}

function sheetSerialToDate_(serialValue) {
  return new Date(SHEET_SERIAL_EPOCH_MS + Math.round(Number(serialValue) * 86400000));
}

function cellValuesEqual_(left, right) {
  if (isValidDate_(left) && isValidDate_(right)) {
    return left.getTime() === right.getTime();
  }

  return left === right;
}

function isValidDate_(value) {
  return Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime());
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

function toTimestamp_(value, displayValue) {
  if (isValidDate_(value)) {
    return value.getTime();
  }

  const normalized = normalizeTimestampCellValue_(value, displayValue);
  if (isValidDate_(normalized)) {
    return normalized.getTime();
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
      msg: String((parsed && parsed.msg) || ''),
      ip: String((parsed && parsed.ip) || ''),
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

function migrateGuestbookTsColumn() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone(SHEET_TIME_ZONE);

  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return;

  ensureHeaderRow_(sheet);
  normalizeLegacyTimestampColumn_(sheet);
}

/**
 * 방명록 데이터를 Google Drive에 JSON 파일로 백업합니다.
 * Apps Script 편집기에서 직접 실행하거나 시간 기반 트리거를 설정하여 자동화할 수 있습니다.
 */
function backupGuestbookToDrive() {
  const list = listGuestbook_({ includeIp: true });
  const timestamp = Utilities.formatDate(new Date(), SHEET_TIME_ZONE, 'yyyyMMdd_HHmmss');
  const fileName = 'Guestbook_Backup_' + timestamp + '.json';
  const fileContent = JSON.stringify(list, null, 2);
  
  const file = DriveApp.createFile(fileName, fileContent, MimeType.PLAIN_TEXT);
  Logger.log('백업 파일이 생성되었습니다: ' + file.getUrl());
}
