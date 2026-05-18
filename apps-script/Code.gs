/**
 * GOOGLE APPS SCRIPT BACKEND API
 * 
 * Cara Deploy:
 * 1. Buka script.google.com, buat project baru.
 * 2. Copy-paste kode ini ke Code.gs.
 * 3. Buat Google Sheet baru, copy ID Sheet-nya (dari URL).
 * 4. Paste ID Sheet tersebut ke variabel SPREADSHEET_ID di bawah.
 * 5. Buat sheet dengan nama: "Users", "Soal", "PaketUjian", "Aktivitas".
 * 6. Di sheet "Users", buat kolom: id | nama | username | password_hash | role | email | status | last_login | created_at
 * 7. Klik Publish -> Deploy as web app. Set access ke "Anyone, even anonymous".
 * 8. Copy URL Web App yang dihasilkan ke file .env React (.env.local) sebagai VITE_GAS_API_URL.
 */

const SPREADSHEET_ID = 'GANTI_DENGAN_ID_SHEET_ANDA'; // <-- PENTING: Ganti ID ini

function getDb() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

// Utility for CORS and JSON response
function responseJSON(data, statusCode = 200) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Handle GET Requests
function doGet(e) {
  const action = e.parameter.action;
  
  try {
    if (action === 'ping') {
      return responseJSON({ status: 'ok', message: 'API is running' });
    }
    
    // Add other GET routes here (e.g., getSoal, getUsers)
    return responseJSON({ error: 'Action not found' }, 404);
  } catch (error) {
    return responseJSON({ error: error.message }, 500);
  }
}

// Handle POST/PUT/DELETE Requests
function doPost(e) {
  // CORS Preflight handling (GAS doesn't natively handle OPTIONS well, 
  // but we return headers if needed. Usually GAS handles it for Web Apps).
  if (!e.postData) {
    return responseJSON({ error: 'No post data' }, 400);
  }

  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    switch (action) {
      case 'login':
        return handleLogin(payload.data);
      case 'getMe':
        return handleGetMe(payload.data); // Mock token validation
      case 'syncSoal':
        return handleSyncSoal(payload.data);
      default:
        return responseJSON({ error: 'Unknown action: ' + action }, 400);
    }
  } catch (error) {
    return responseJSON({ error: error.toString() }, 500);
  }
}

// --- AUTHENTICATION LOGIC ---

function handleLogin(data) {
  const { username, password } = data;
  if (!username || !password) return responseJSON({ error: 'Username dan password wajib diisi' }, 400);

  const sheet = getDb().getSheetByName('Users');
  if(!sheet) return responseJSON({ error: 'Sheet Users tidak ditemukan' }, 500);
  
  const rules = sheet.getDataRange().getValues();
  const headers = rules[0];
  
  // Find username
  const userRowIndex = rules.findIndex((row, idx) => idx > 0 && row[headers.indexOf('username')] === username);
  
  if (userRowIndex === -1) {
    return responseJSON({ error: 'Username tidak ditemukan' }, 404);
  }
  
  const user = rules[userRowIndex];
  const storedHash = user[headers.indexOf('password_hash')];
  
  // In production, use bcrypt here (or a library loaded via Eval).
  // For simplicity in GAS without external libraries, we simulate hash checking.
  // We'll use a basic custom SHA256 helper if you store hashes, or plain for testing.
  const isValidPassword = verifyPassword(password, storedHash);
  
  if (!isValidPassword) {
    return responseJSON({ error: 'Password salah' }, 401);
  }
  
  // Update last login
  sheet.getRange(userRowIndex + 1, headers.indexOf('last_login') + 1).setValue(new Date().toISOString());

  // Generate a mock token (In real app, generate JWT or secure random token and store in session DB)
  const token = Utilities.base64Encode(username + ':' + new Date().getTime());

  return responseJSON({
    message: 'Login berhasil',
    token: token,
    user: {
      id: user[headers.indexOf('id')],
      nama: user[headers.indexOf('nama')],
      username: username,
      role: user[headers.indexOf('role')],
      email: user[headers.indexOf('email')]
    }
  });
}

function handleGetMe(data) {
  const { token } = data;
  if(!token) return responseJSON({ error: 'Unauthorized' }, 401);
  
  try {
    const decoded = Utilities.base64Decode(token);
    const decodedStr = Utilities.newBlob(decoded).getDataAsString();
    const username = decodedStr.split(':')[0];
    
    const sheet = getDb().getSheetByName('Users');
    const rules = sheet.getDataRange().getValues();
    const headers = rules[0];
    const userRowIndex = rules.findIndex((row, idx) => idx > 0 && row[headers.indexOf('username')] === username);
    
    if (userRowIndex === -1) return responseJSON({ error: 'User invalid' }, 401);
    
    const user = rules[userRowIndex];
    
    return responseJSON({
      user: {
        id: user[headers.indexOf('id')],
        nama: user[headers.indexOf('nama')],
        username: username,
        role: user[headers.indexOf('role')],
        email: user[headers.indexOf('email')]
      }
    });

  } catch(e) {
    return responseJSON({ error: 'Invalid Token' }, 401);
  }
}

// --- UTILITIES ---

function verifyPassword(plain, hashed) {
  // Demo purpose: Assuming hashing is done via a simple mechanism or plaintext for testing phase.
  // To use real SHA-256 in GAS:
  // const byteSignature = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, plain);
  // const computedHash = byteSignature.map(function(byte) { return ('0' + (byte & 0xFF).toString(16)).slice(-2);}).join('');
  // return computedHash === hashed;
  
  return plain === hashed; // IMPORTANT: Replace with hash check in production
}
