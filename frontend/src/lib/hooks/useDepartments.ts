import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { departmentsApi } from '@/lib/api';
import type { Department, DepartmentCreate, DepartmentUpdate } from '@/lib/api/departments';

export const departmentKeys = {
  all: ['departments'] as const,
  list: () => [...departmentKeys.all, 'list'] as const,
  detail: (id: number) => [...departmentKeys.all, 'detail', id] as const,
};

export function useDepartments() {
  return useQuery({
    queryKey: departmentKeys.list(),
    queryFn: () => departmentsApi.list(),
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: DepartmentCreate) => departmentsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: departmentKeys.list() });
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: DepartmentUpdate }) =>
      departmentsApi.update(id, payload),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: departmentKeys.list() });
      queryClient.invalidateQueries({ queryKey: departmentKeys.detail(vars.id) });
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => departmentsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: departmentKeys.list() });
    },
  });
}

export type { Department };
