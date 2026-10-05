import { useCallback, useEffect, useState } from 'react';
import useDebounce from './useDebounce';
import useFetch from './useFetch';

/**
 * State + data for a server-paginated, searchable, sortable, filterable table.
 * fetcher(params) must resolve to { data, meta }.
 */
export default function usePagedList(fetcher, { pageSize: initialSize = 10, sortBy, sortDir = 'desc', filters: initialFilters = {} } = {}) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialSize);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ sortBy, sortDir });
  const [filters, setFilters] = useState(initialFilters);
  const [selected, setSelected] = useState([]);
  const debounced = useDebounce(search);

  const params = { page: page + 1, pageSize, search: debounced, ...sort, ...filters };
  const { data, loading, error, reload } = useFetch(() => fetcher(params), [page, pageSize, debounced, sort.sortBy, sort.sortDir, JSON.stringify(filters)]);

  useEffect(() => { setPage(0); }, [debounced, JSON.stringify(filters)]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setSelected([]); }, [data]);

  const setFilter = useCallback((key, value) => setFilters((f) => ({ ...f, [key]: value })), []);
  const fetchAll = useCallback(() => fetcher({ ...params, all: 'true', page: 1 }), [fetcher, JSON.stringify(params)]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    rows: data?.data || [], total: data?.meta?.total || 0, extra: data, loading, error, reload,
    page, setPage, pageSize, setPageSize: (n) => { setPageSize(n); setPage(0); },
    search, setSearch, sort, setSort, filters, setFilter, setFilters, selected, setSelected, fetchAll,
  };
}
