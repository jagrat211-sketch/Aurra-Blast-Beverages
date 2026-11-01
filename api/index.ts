import 'dotenv/config';
import { createApp } from '../server/app.js';
import { initDatabase } from '../server/db.js';

let initialized = false;
function getApp() {
  if (!initialized) {
    try {
      initDatabase();
    } catch (err) {
      console.warn('Vercel serverless database init note:', err);
    }
    initialized = true;
  }
  return createApp();
}

const app = getApp();
export default app;
