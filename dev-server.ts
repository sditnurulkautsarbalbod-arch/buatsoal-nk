import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import app from './server';
import dotenv from 'dotenv';

dotenv.config();

// Local only: Serve static files from dist
app.use('/*', serveStatic({ root: './dist' }));

console.log('AI Studio Dev Server running on http://localhost:3000');

serve({
  fetch: (req) => {
    // Inject environment variables from process.env to c.env manually for local dev
    // Hono's Node server usually doesn't populate c.env from process.env automatically
    return app.fetch(req, process.env);
  },
  port: 3000
});
