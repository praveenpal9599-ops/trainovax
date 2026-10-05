import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Run an async loader and track data / loading / error.
 * `deps` re-trigger the loader. Returns reload() and setData() for optimistic updates.
 */
export default function useFetch(loader, deps = [], { enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const seq = useRef(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const run = useCallback(async ({ silent = false } = {}) => {
    const id = ++seq.current;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const result = await loaderRef.current();
      if (id === seq.current) setData(result);
      return result;
    } catch (err) {
      if (id === seq.current) setError(err);
      return undefined;
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (enabled) run(); }, [enabled, ...deps]);

  return { data, setData, loading, error, reload: run };
}
