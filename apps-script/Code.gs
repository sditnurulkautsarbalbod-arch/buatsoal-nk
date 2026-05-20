/**
 * GOOGLE APPS SCRIPT BACKEND API
 *
 * Konfigurasi wajib di Script Properties:
 * - GAS_SPREADSHEET_ID: ID Google Sheet database
 * - GAS_DRIVE_FOLDER_ID: ID folder Google Drive untuk upload file
 * - GEMINI_API_KEY: (opsional) fallback API key Gemini untuk generateText
 */

const FALLBACK_SPREADSHEET_ID = 'GANTI_DENGAN_ID_SHEET_ANDA';

const SHEET_SCHEMAS = {
  Users: ['id', 'nama', 'username', 'password_hash', 'role', 'email', 'status', 'last_login', 'created_at', 'updated_at'],
  Drafts: ['id', 'title', 'content', 'updatedAt', 'editorState', 'created_at', 'updated_at'],
  BankSoal: ['id', 'question', 'jenis', 'mapel', 'kelas', 'tingkat', 'pembahasan', 'options_json', 'created_at'],
  Files: ['id', 'drive_file_id', 'url', 'pathname', 'mime_type', 'size_bytes', 'created_at'],
};

function getProp(name) {
  return PropertiesService.getScriptProperties().getProperty(name) || '';
}

function getSpreadsheetId() {
  return getProp('GAS_SPREADSHEET_ID') || FALLBACK_SPREADSHEET_ID;
}

function getDb() {
  const spreadsheetId = getSpreadsheetId();
  if (!spreadsheetId || spreadsheetId === 'GANTI_DENGAN_ID_SHEET_ANDA') {
    throw new Error('GAS_SPREADSHEET_ID belum dikonfigurasi.');
  }
  return SpreadsheetApp.openById(spreadsheetId);
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function ensureSheet(sheetName) {
  const db = getDb();
  const headers = SHEET_SCHEMAS[sheetName];
  if (!headers) throw new Error('Schema sheet tidak terdaftar: ' + sheetName);

  let sheet = db.getSheetByName(sheetName);
  if (!sheet) {
    sheet = db.insertSheet(sheetName);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return sheet;
  }

  const lastColumn = Math.max(1, sheet.getLastColumn());
  const currentHeader = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const normalized = currentHeader.map(String);

  const needsRewrite = headers.some((h, i) => normalized[i] !== h) || normalized.length < headers.length;
  if (needsRewrite) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  return sheet;
}

function getRowsAsObjects(sheetName) {
  const sheet = ensureSheet(sheetName);
  const range = sheet.getDataRange();
  const values = range.getValues();

  if (values.length <= 1) return [];

  const headers = values[0].map(String);
  const out = [];
  for (let i = 1; i < values.length; i += 1) {
    const row = values[i];
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = row[idx] == null ? '' : row[idx];
    });
    out.push(obj);
  }
  return out;
}

function appendObject(sheetName, obj) {
  const sheet = ensureSheet(sheetName);
  const headers = SHEET_SCHEMAS[sheetName];
  const row = headers.map((h) => (obj[h] == null ? '' : obj[h]));
  sheet.appendRow(row);
}

function updateById(sheetName, id, patch) {
  const sheet = ensureSheet(sheetName);
  const headers = SHEET_SCHEMAS[sheetName];
  const values = sheet.getDataRange().getValues();

  const idCol = headers.indexOf('id');
  if (idCol < 0) throw new Error('Kolom id tidak ditemukan di ' + sheetName);

  for (let r = 1; r < values.length; r += 1) {
    if (String(values[r][idCol]) === String(id)) {
      headers.forEach((h, c) => {
        if (patch[h] !== undefined) {
          sheet.getRange(r + 1, c + 1).setValue(patch[h]);
        }
      });
      return true;
    }
  }
  return false;
}

function deleteById(sheetName, id) {
  const sheet = ensureSheet(sheetName);
  const headers = SHEET_SCHEMAS[sheetName];
  const values = sheet.getDataRange().getValues();
  const idCol = headers.indexOf('id');

  for (let r = 1; r < values.length; r += 1) {
    if (String(values[r][idCol]) === String(id)) {
      sheet.deleteRow(r + 1);
      return true;
    }
  }
  return false;
}

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || '';

  try {
    if (action === 'ping') {
      return responseJSON({ status: 'ok', message: 'API is running' });
    }
    return responseJSON({ error: 'Action not found' });
  } catch (error) {
    return responseJSON({ error: String(error && error.message ? error.message : error) });
  }
}

function doPost(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return responseJSON({ error: 'No post data' });
  }

  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    const data = payload.data || {};

    switch (action) {
      case 'login':
        return handleLogin(data);
      case 'getMe':
        return handleGetMe(data);
      case 'syncSoal':
        return handleSyncSoal(data);
      case 'dbQuery':
        return handleDbQuery(data);
      case 'uploadFile':
        return handleUploadFile(data);
      case 'generateText':
        return handleGenerateText(data);
      default:
        return responseJSON({ error: 'Unknown action: ' + action });
    }
  } catch (error) {
    return responseJSON({ error: String(error && error.message ? error.message : error) });
  }
}

function handleDbQuery(data) {
  const sql = String((data && data.sql) || '').trim();
  const params = (data && data.params) || [];
  if (!sql) return responseJSON({ success: false, error: 'sql wajib diisi.' });

  const normalized = sql.replace(/\s+/g, ' ').trim().toUpperCase();

  if (normalized.indexOf('CREATE TABLE IF NOT EXISTS USERS') === 0) {
    ensureSheet('Users');
    return responseJSON({ success: true, results: [] });
  }
  if (normalized.indexOf('CREATE TABLE IF NOT EXISTS DRAFTS') === 0) {
    ensureSheet('Drafts');
    return responseJSON({ success: true, results: [] });
  }
  if (normalized.indexOf('CREATE TABLE IF NOT EXISTS BANK_SOAL') === 0) {
    ensureSheet('BankSoal');
    return responseJSON({ success: true, results: [] });
  }

  if (normalized.indexOf('SELECT * FROM USERS WHERE USERNAME = $1') === 0) {
    const username = String(params[0] || '');
    const rows = getRowsAsObjects('Users').filter((u) => String(u.username) === username);
    return responseJSON({ success: true, results: rows });
  }

  if (normalized.indexOf('INSERT INTO USERS') === 0) {
    const now = new Date().toISOString();
    appendObject('Users', {
      id: params[0] || '',
      nama: params[1] || '',
      username: params[2] || '',
      password_hash: params[3] || '',
      role: params[4] || '',
      email: '',
      status: 'active',
      last_login: '',
      created_at: now,
      updated_at: now,
    });
    return responseJSON({ success: true, results: [] });
  }

  if (normalized.indexOf('INSERT INTO DRAFTS') === 0 && normalized.indexOf('ON CONFLICT(ID) DO UPDATE') > -1) {
    const now = new Date().toISOString();
    const id = String(params[0] || '');
    const patch = {
      id: id,
      title: params[1] || '',
      content: params[2] || '',
      updatedAt: params[3] || '',
      editorState: params[4] || '',
      updated_at: now,
    };

    const updated = updateById('Drafts', id, patch);
    if (!updated) {
      appendObject('Drafts', Object.assign({ created_at: now }, patch));
    }

    return responseJSON({ success: true, results: [] });
  }

  if (normalized.indexOf('SELECT * FROM DRAFTS ORDER BY UPDATEDAT DESC') === 0) {
    const rows = getRowsAsObjects('Drafts').sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    return responseJSON({ success: true, results: rows });
  }

  if (normalized.indexOf('DELETE FROM DRAFTS WHERE ID = $1') === 0) {
    deleteById('Drafts', params[0]);
    return responseJSON({ success: true, results: [] });
  }

  if (normalized.indexOf('INSERT INTO BANK_SOAL') === 0) {
    appendObject('BankSoal', {
      id: params[0] || '',
      question: params[1] || '',
      jenis: params[2] || '',
      mapel: params[3] || '',
      kelas: params[4] || '',
      tingkat: params[5] || '',
      pembahasan: params[6] || '',
      options_json: params[7] || '[]',
      created_at: params[8] || new Date().toISOString(),
    });
    return responseJSON({ success: true, results: [] });
  }

  if (normalized.indexOf('SELECT ID, QUESTION, MAPEL, KELAS, JENIS, TINGKAT, CREATED_AT FROM BANK_SOAL ORDER BY CREATED_AT DESC') === 0) {
    const rows = getRowsAsObjects('BankSoal')
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .map((r) => ({
        id: r.id,
        question: r.question,
        mapel: r.mapel,
        kelas: r.kelas,
        jenis: r.jenis,
        tingkat: r.tingkat,
        created_at: r.created_at,
      }));
    return responseJSON({ success: true, results: rows });
  }

  return responseJSON({ success: false, error: 'SQL belum didukung di GAS adapter: ' + sql });
}

function handleUploadFile(data) {
  const filename = String((data && data.filename) || '').trim();
  const content = String((data && data.content) || '').trim();
  const contentType = String((data && data.contentType) || 'application/octet-stream');

  if (!filename || !content) {
    return responseJSON({ error: 'filename dan content wajib diisi.' });
  }

  const folderId = getProp('GAS_DRIVE_FOLDER_ID');
  if (!folderId) {
    return responseJSON({ error: 'GAS_DRIVE_FOLDER_ID belum dikonfigurasi.' });
  }

  const bytes = Utilities.base64Decode(content);
  const blob = Utilities.newBlob(bytes, contentType, filename);
  const folder = DriveApp.getFolderById(folderId);
  const file = folder.createFile(blob);

  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (err) {
    // keep private if sharing policy blocks this action
  }

  const now = new Date().toISOString();
  const fileUrl = file.getUrl();

  appendObject('Files', {
    id: Utilities.getUuid(),
    drive_file_id: file.getId(),
    url: fileUrl,
    pathname: 'drive/' + file.getId() + '/' + filename,
    mime_type: contentType,
    size_bytes: bytes.length,
    created_at: now,
  });

  return responseJSON({
    url: fileUrl,
    pathname: 'drive/' + file.getId() + '/' + filename,
  });
}

function handleGenerateText(data) {
  const prompt = String((data && data.prompt) || '').trim();
  const apiKey = String((data && data.apiKey) || '').trim() || getProp('GEMINI_API_KEY');

  if (!prompt) return responseJSON({ error: 'Prompt wajib berupa teks.' });
  if (!apiKey) return responseJSON({ error: 'GEMINI_API_KEY tidak ditemukan.' });

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + encodeURIComponent(apiKey);
  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
  };

  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(body),
    muteHttpExceptions: true,
  });

  const status = response.getResponseCode();
  const text = response.getContentText() || '';
  if (status < 200 || status >= 300) {
    return responseJSON({ error: 'Gemini request gagal: ' + text });
  }

  let parsed = {};
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    return responseJSON({ error: 'Respons Gemini tidak valid JSON.' });
  }

  const candidates = parsed.candidates || [];
  const out = candidates[0] && candidates[0].content && candidates[0].content.parts && candidates[0].content.parts[0]
    ? String(candidates[0].content.parts[0].text || '')
    : '';

  if (!out.trim()) {
    return responseJSON({ error: 'Model tidak mengembalikan teks.' });
  }

  return responseJSON({ text: out });
}

function handleSyncSoal(data) {
  const rows = data && Array.isArray(data.rows) ? data.rows : [];
  if (!rows.length) {
    return responseJSON({ success: true, synced: 0 });
  }

  rows.forEach((row) => {
    appendObject('BankSoal', {
      id: row.id || Utilities.getUuid(),
      question: row.question || '',
      jenis: row.jenis || '',
      mapel: row.mapel || '',
      kelas: row.kelas || '',
      tingkat: row.tingkat || '',
      pembahasan: row.pembahasan || '',
      options_json: row.options_json || '[]',
      created_at: row.created_at || new Date().toISOString(),
    });
  });

  return responseJSON({ success: true, synced: rows.length });
}

function handleLogin(data) {
  const username = String((data && data.username) || '').trim();
  const password = String((data && data.password) || '').trim();
  if (!username || !password) return responseJSON({ error: 'Username dan password wajib diisi' });

  const users = getRowsAsObjects('Users');
  const user = users.find((u) => String(u.username) === username);

  if (!user) {
    return responseJSON({ error: 'Username tidak ditemukan' });
  }

  const isValidPassword = verifyPassword(password, String(user.password_hash || ''));
  if (!isValidPassword) {
    return responseJSON({ error: 'Password salah' });
  }

  updateById('Users', String(user.id), {
    last_login: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const token = Utilities.base64Encode(username + ':' + new Date().getTime());

  return responseJSON({
    message: 'Login berhasil',
    token: token,
    user: {
      id: user.id,
      nama: user.nama,
      username: username,
      role: user.role,
      email: user.email,
    },
  });
}

function handleGetMe(data) {
  const token = String((data && data.token) || '').trim();
  if (!token) return responseJSON({ error: 'Unauthorized' });

  try {
    const decoded = Utilities.base64Decode(token);
    const decodedStr = Utilities.newBlob(decoded).getDataAsString();
    const username = decodedStr.split(':')[0];

    const users = getRowsAsObjects('Users');
    const user = users.find((u) => String(u.username) === username);

    if (!user) return responseJSON({ error: 'User invalid' });

    return responseJSON({
      user: {
        id: user.id,
        nama: user.nama,
        username: username,
        role: user.role,
        email: user.email,
      },
    });
  } catch (e) {
    return responseJSON({ error: 'Invalid Token' });
  }
}

function verifyPassword(plain, hashed) {
  return plain === hashed;
}
