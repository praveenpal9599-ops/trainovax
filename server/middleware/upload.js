import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';

fs.mkdirSync(env.uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, env.uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '');
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
  },
});

const IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const DOCS = [...IMAGE, 'application/pdf'];

const make = (allowed) => multer({
  storage,
  limits: { fileSize: env.uploadMaxBytes, files: 1 },
  fileFilter: (_req, file, cb) => (allowed.includes(file.mimetype)
    ? cb(null, true) : cb(ApiError.badRequest('Unsupported file type'))),
});

export const uploadImage = make(IMAGE);
export const uploadAttachment = make(DOCS);
export const fileUrl = (file) => (file ? `/uploads/${file.filename}` : null);
