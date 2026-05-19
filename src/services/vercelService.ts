import axios from 'axios';

export const vercelService = {
  /**
   * Uploads a file to Vercel Blob via our proxy
   */
  async uploadToBlob(file: File | Blob): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.url;
    } catch (error: any) {
      console.error('Upload to Vercel Blob failed:', error);
      const message = error.response?.data?.error || error.message;
      throw new Error(`Gagal mengunggah file: ${message}`);
    }
  },

  /**
   * Executes a SQL query on Vercel Postgres via our proxy
   */
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    try {
      const response = await axios.post('/api/db/query', { sql, params });
      if (response.data.success) {
        return (response.data.results || []) as T[];
      }
      throw new Error(response.data.error || 'Query failed');
    } catch (error: any) {
      console.error('Vercel Postgres Query failed:', error);
      const message = error.response?.data?.error || error.message;
      throw new Error(`Kesalahan Database: ${message}`);
    }
  },

  /**
   * Initialize Database schema
   */
  async initSchema() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        nama TEXT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT,
        foto TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS drafts (
        id TEXT PRIMARY KEY,
        title TEXT,
        content TEXT,
        updatedAt TEXT,
        editorState TEXT
      )`
    ];

    for (const sql of tables) {
      await this.query(sql);
    }

    // Cek apakah admin sudah ada
    const users = await this.query('SELECT * FROM users WHERE username = $1', ['admin']);
    if (users.length === 0) {
      await this.query(
        'INSERT INTO users (id, nama, username, password, role) VALUES ($1, $2, $3, $4, $5)',
        ['1', 'Admin Utama', 'admin', 'admin123', 'admin']
      );
    }
  }
};
