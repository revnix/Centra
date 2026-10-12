import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { employeesApi } from '@/lib/api';
import type { Employee, EmployeeCreate, EmployeeUpdate } from '@/lib/api/employees';

export const employeeKeys = {
  all: ['employees'] as const,
  list: () => [...employeeKeys.all, 'list'] as const,
};

export function useEmployees() {
  return useQuery({
    queryKey: employeeKeys.list(),
    queryFn: () => employeesApi.list(),
    staleTime: 30_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: EmployeeCreate) => employeesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.list() });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeProfileId, payload }: { employeeProfileId: number; payload: EmployeeUpdate }) =>
      employeesApi.update(employeeProfileId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.list() });
    },
  });
}

export type { Employee };
