import axios from 'axios';

export interface D1Response<T = any> {
  result: {
    results: T[];
    success: boolean;
    meta: any;
  }[];
  success: boolean;
  errors: any[];
  messages: any[];
}

export const cloudflareService = {
  /**
   * Uploads a file (blob/file) to Cloudflare R2 via our proxy
   */
  async uploadToR2(file: File | Blob): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.url;
    } catch (error) {
      console.error('Upload to R2 failed:', error);
      throw new Error('Gagal mengunggah file ke storage Cloudflare.');
    }
  },

  /**
   * Executes a SQL query on Cloudflare D1 via our proxy
   */
  async queryD1<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    try {
      const response = await axios.post('/api/db/query', { sql, params });
      if (response.data.success && response.data.result?.[0]?.success) {
        return response.data.result[0].results as T[];
      }
      throw new Error(response.data.errors?.[0]?.message || 'Query failed');
    } catch (error) {
      console.error('D1 Query failed:', error);
      throw error;
    }
  },

  /**
   * Initialize Database schema
   */
  async initSchema() {
    const sql = `
      CREATE TABLE IF NOT EXISTS drafts (
        id TEXT PRIMARY KEY,
        title TEXT,
        content TEXT,
        updatedAt TEXT,
        editorState TEXT
      );
    `;
    return this.queryD1(sql);
  }
};
