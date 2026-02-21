import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { runRouter } from './api/run.js';
import { configRouter } from './api/config.js';

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/autocard';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/run', runRouter);
app.use('/api/config', configRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

async function start() {
  await mongoose.connect(MONGODB_URI);
  console.log('MongoDB connected');
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch(console.error);
