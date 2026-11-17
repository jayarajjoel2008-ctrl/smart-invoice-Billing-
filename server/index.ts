import mongoose from 'mongoose';
import { app } from './app';
import { config } from './config';
import { ensureAdminSeed } from './adminSeed';

async function start() {
  if (config.mongoUri) {
    try {
      await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 8000, autoIndex: true });
      console.info('BillPro database connected');
      await ensureAdminSeed();
    } catch {
      // Never log connection strings; the local/demo server remains available for health diagnostics.
      console.error('BillPro database unavailable; API routes requiring persistence will fail until MongoDB is configured.');
    }
  }
  mongoose.connection.on('disconnected', () => console.warn('BillPro database disconnected'));
  app.listen(config.port, '0.0.0.0', () => console.info(`BillPro API listening on port ${config.port}`));
}

void start();

