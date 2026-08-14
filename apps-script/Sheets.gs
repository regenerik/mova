var MOVA_SPREADSHEET_CACHE = null;

function movaSpreadsheet() {
  if (MOVA_SPREADSHEET_CACHE) return MOVA_SPREADSHEET_CACHE;
  const id = movaRequiredProperty("SPREADSHEET_ID");
  MOVA_SPREADSHEET_CACHE = SpreadsheetApp.openById(id);
  return MOVA_SPREADSHEET_CACHE;
}

function movaInitSheets() {
  const ss = movaSpreadsheet();
  Object.keys(MOVA_SHEETS).forEach(function(sheetName) {
    const headers = MOVA_SHEETS[sheetName];
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) sheet = ss.insertSheet(sheetName);
    movaEnsureColumns(sheet, headers.length);
    const lastColumn = Math.max(1, sheet.getLastColumn());
    const current = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].filter(String);
    const missing = headers.filter(function(header) { return current.indexOf(header) === -1; });
    const nextHeaders = current.length ? current.concat(missing) : headers;
    if (!nextHeaders.length) return;
    movaEnsureColumns(sheet, nextHeaders.length);
    sheet.getRange(1, 1, 1, nextHeaders.length).setValues([nextHeaders]);
    if (sheet.getFrozenRows() < 1) sheet.setFrozenRows(1);
    if (missing.length) {
      console.log("movaInitSheets: " + sheetName + " agrego columnas: " + missing.join(", "));
    }
  });
}

function movaEnsureColumns(sheet, count) {
  const maxColumns = sheet.getMaxColumns();
  if (maxColumns < count) sheet.insertColumnsAfter(maxColumns, count - maxColumns);
}

function movaSheet(sheetName) {
  let sheet = movaSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    movaInitSheets();
    sheet = movaSpreadsheet().getSheetByName(sheetName);
  }
  if (!sheet) throw movaError("SHEET_MISSING", "No existe la hoja " + sheetName + ". Ejecuta movaInitSheets().");
  return sheet;
}

function movaList(sheetName) {
  const sheet = movaSheet(sheetName);
  const headers = movaHeaders(sheet, sheetName);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, headers.length).getValues().map(function(row) {
    return movaRowToObject(sheetName, headers, row);
  }).filter(function(item) { return item.id || item.key; });
}

function movaGetById(sheetName, id) {
  const list = movaList(sheetName);
  const found = list.find(function(item) { return item.id === id; });
  if (!found) throw movaError("NOT_FOUND", "Registro no encontrado.");
  return found;
}

function movaExistsById(sheetName, id) {
  const sheet = movaSheet(sheetName);
  const headers = movaHeaders(sheet, sheetName);
  try {
    movaFindRowById(sheet, headers, id);
    return true;
  } catch (err) {
    if (err.code === "NOT_FOUND") return false;
    throw err;
  }
}

function movaCreate(sheetName, entity) {
  return movaWithLock(function() {
    const sheet = movaSheet(sheetName);
    const headers = movaHeaders(sheet, sheetName);
    if (entity.id) {
      try {
        const existingRow = movaFindRowById(sheet, headers, entity.id);
        return movaRowToObject(sheetName, headers, sheet.getRange(existingRow, 1, 1, headers.length).getValues()[0]);
      } catch (err) {
        if (err.code !== "NOT_FOUND") throw err;
      }
    }
    const now = new Date().toISOString();
    const next = Object.assign({}, entity, {
      id: entity.id || Utilities.getUuid(),
      hidden: entity.hidden === true,
      createdAt: entity.createdAt || now,
      updatedAt: now
    });
    sheet.appendRow(movaObjectToRow(sheetName, headers, next));
    return next;
  });
}

function movaUpdate(sheetName, entity) {
  if (!entity || !entity.id) throw movaError("BAD_REQUEST", "Falta id.");
  return movaWithLock(function() {
    const sheet = movaSheet(sheetName);
    const headers = movaHeaders(sheet, sheetName);
    const rowIndex = movaFindRowById(sheet, headers, entity.id);
    const current = movaRowToObject(sheetName, headers, sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0]);
    const next = Object.assign({}, current, entity, { updatedAt: new Date().toISOString() });
    sheet.getRange(rowIndex, 1, 1, headers.length).setValues([movaObjectToRow(sheetName, headers, next)]);
    return next;
  });
}

function movaHideEntity(sheetName, id, hidden) {
  const entity = movaGetById(sheetName, id);
  entity.hidden = hidden === true;
  return movaUpdate(sheetName, entity);
}

function movaDeleteEntity(sheetName, id) {
  return movaWithLock(function() {
    const sheet = movaSheet(sheetName);
    const headers = movaHeaders(sheet, sheetName);
    const rowIndex = movaFindRowById(sheet, headers, id);
    sheet.deleteRow(rowIndex);
    return { id: id };
  });
}

function movaFindRowById(sheet, headers, id) {
  if (sheet.getLastRow() < 2) throw movaError("NOT_FOUND", "Registro no encontrado.");
  const idIndex = headers.indexOf("id");
  const values = sheet.getRange(2, idIndex + 1, sheet.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < values.length; i++) {
    if (values[i][0] === id) return i + 2;
  }
  throw movaError("NOT_FOUND", "Registro no encontrado.");
}

function movaHeaders(sheet, sheetName) {
  const expected = MOVA_SHEETS[sheetName];
  movaEnsureColumns(sheet, expected.length);
  const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), expected.length)).getValues()[0].filter(String);
  let changed = false;
  expected.forEach(function(header) {
    if (headers.indexOf(header) === -1) {
      headers.push(header);
      changed = true;
    }
  });
  if (changed) {
    movaEnsureColumns(sheet, headers.length);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return headers;
}

function movaRowToObject(sheetName, headers, row) {
  const numberFields = MOVA_NUMBER_FIELDS[sheetName] || [];
  const jsonFields = MOVA_JSON_FIELDS[sheetName] || [];
  const stringFields = MOVA_STRING_FIELDS[sheetName] || [];
  return headers.reduce(function(acc, header, index) {
    let value = row[index];
    if (value === "") value = null;
    if (jsonFields.indexOf(header) !== -1 && typeof value === "string" && value) value = JSON.parse(value);
    if (numberFields.indexOf(header) !== -1 && value !== null) value = Number(value);
    if (stringFields.indexOf(header) !== -1 && value !== null) value = String(value);
    if (header === "hidden") value = value === true || value === "true";
    acc[header] = value;
    return acc;
  }, {});
}

function movaObjectToRow(sheetName, headers, entity) {
  const jsonFields = MOVA_JSON_FIELDS[sheetName] || [];
  return headers.map(function(header) {
    const value = entity[header];
    if (value === null || value === undefined) return "";
    if (jsonFields.indexOf(header) !== -1) return JSON.stringify(value);
    return value;
  });
}

function movaWithLock(callback) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    throw movaError("LOCK_BUSY", "Otra operacion sigue sincronizando. Volve a intentar en unos segundos.");
  }
  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}
