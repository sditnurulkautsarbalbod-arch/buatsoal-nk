import axios from 'axios';

export const vercelService = {
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

};
