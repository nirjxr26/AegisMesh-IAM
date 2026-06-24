import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export function useEntityList({
    entityKey,
    fetchFn,
    createFn,
    deleteFn,
    initialFilters = {},
    perPage = 20,
}) {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState(initialFilters.search || '');
    const [debouncedSearch, setDebouncedSearch] = useState(search);
    const [filters, setFilters] = useState(initialFilters);
    const [page, setPage] = useState(1);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const queryParams = useMemo(() => {
        return {
            page,
            limit: perPage,
            search: debouncedSearch,
            ...filters,
        };
    }, [page, perPage, debouncedSearch, filters]);

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: [entityKey, queryParams],
        queryFn: () => fetchFn(queryParams).then((res) => res.data),
    });

    const createMutation = useMutation({
        mutationFn: createFn,
        onSuccess: () => {
            queryClient.invalidateQueries([entityKey]);
            toast.success(`${entityKey.charAt(0).toUpperCase() + entityKey.slice(1, -1)} created successfully`);
        },
        onError: (err) => {
            toast.error(err.response?.data?.error || `Failed to create ${entityKey.slice(0, -1)}`);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteFn,
        onSuccess: () => {
            queryClient.invalidateQueries([entityKey]);
            toast.success(`${entityKey.charAt(0).toUpperCase() + entityKey.slice(1, -1)} deleted`);
        },
        onError: (err) => {
            toast.error(err.response?.data?.error || `Failed to delete ${entityKey.slice(0, -1)}`);
        },
    });

    return {
        data: data?.data || [],
        pagination: data?.pagination || { total: 0, page: 1, limit: perPage, totalPages: 1 },
        isLoading,
        isError,
        search,
        setSearch,
        filters,
        setFilters,
        page,
        setPage,
        createMutation,
        deleteMutation,
        refetch,
    };
}
