import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';

export function notFound(req, _res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let status = err.status || 500;
  let message = err.message || 'Internal server error';
  let details = err.details;

  if (err.code === 'ER_DUP_ENTRY') { status = 409; message = 'A record with the same unique value already exists.'; }
  else if (err.code === 'ER_NO_REFERENCED_ROW_2') { status = 400; message = 'Referenced record does not exist.'; }
  else if (err.code === 'ER_ROW_IS_REFERENCED_2') { status = 409; message = 'This record is in use and cannot be deleted.'; }
  else if (err.code === 'LIMIT_FILE_SIZE') { status = 413; message = 'File is too large.'; }
  else if (err.message === 'Not allowed by CORS') { status = 403; message = 'Origin not allowed'; }
  else if (err.type === 'entity.parse.failed') { status = 400; message = 'Malformed JSON body.'; }

  if (status >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl}`, err);
    if (env.isProd) { message = 'Internal server error'; details = undefined; }
  }
  res.status(status).json({ success: false, message, ...(details ? { details } : {}) });
}
