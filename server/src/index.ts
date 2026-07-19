import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { runRouter } from './api/run.js';
import { configRouter } from './api/config.js';
import { userRouter } from './api/user.js';
import { authRouter } from './api/auth.js';
import { profileRouter } from './api/profile.js';
import { optionalAuth } from './middleware/auth.js';

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/autocard';

const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// 公开路由：注册/登录（含 GitHub OAuth）
app.use('/api/auth', authRouter);
// 公开路由：配置数据
app.use('/api/config', configRouter);
app.use('/api/profile', profileRouter);

// 可选认证路由：兼容旧版 x-user-id 和新版 JWT
app.use('/api/user', optionalAuth, userRouter);
app.use('/api/run', optionalAuth, runRouter);

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
