import { useCallback, useEffect, useRef, useState } from 'react';

import type { LoadResult } from './client';

export type Resource<T> = {
  data: T | undefined;
  error: string | undefined;
  loading: boolean;
  fromCache: boolean;
  reload: () => void;
};

export function useResource<T>(
  loader: (force: boolean) => Promise<LoadResult<T>>,
  deps: unknown[],
): Resource<T> {
  const [data, setData] = useState<T | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const dataKey = useRef<string | undefined>(undefined);
  const requestKey = JSON.stringify(deps);
  const stale = dataKey.current !== undefined && dataKey.current !== requestKey;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(undefined);
    loaderRef
      .current(attempt > 0)
      .then((result) => {
        if (!active) return;
        dataKey.current = requestKey;
        setData(result.data);
        setFromCache(result.fromCache);
      })
      .catch((thrown: unknown) => {
        if (!active) return;
        setError(thrown instanceof Error ? thrown.message : 'Terjadi kesalahan tidak terduga.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return {
    data: stale ? undefined : data,
    error,
    loading,
    fromCache: stale ? false : fromCache,
    reload,
  };
}
