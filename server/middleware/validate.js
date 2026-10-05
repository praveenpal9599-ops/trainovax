import ApiError from '../utils/ApiError.js';

/** Validate and coerce req.body / req.query / req.params with Zod schemas. */
export const validate = (schemas) => (req, _res, next) => {
  try {
    for (const key of ['params', 'query', 'body']) {
      if (!schemas[key]) continue;
      const result = schemas[key].safeParse(req[key] ?? {});
      if (!result.success) {
        const details = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
        throw ApiError.badRequest(details[0]?.message ? `${details[0].field || key}: ${details[0].message}` : 'Validation failed', details);
      }
      if (key === 'query') Object.defineProperty(req, 'validatedQuery', { value: result.data });
      else req[key] = result.data;
    }
    next();
  } catch (err) { next(err); }
};
