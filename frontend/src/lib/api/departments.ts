import { apiClient } from './client';

export interface Department {
  id: number;
  name: string;
  description: string | null;
  lead_user_id: number | null;
  created_at: string;
  updated_at: string | null;
}

export interface DepartmentCreate {
  name: string;
  description?: string | null;
  lead_user_id?: number | null;
}

export interface DepartmentUpdate {
  name?: string | null;
  description?: string | null;
  lead_user_id?: number | null;
}

export const departmentsApi = {
  list: () => apiClient.get<Department[]>('/org/departments'),
  get: (id: number) => apiClient.get<Department>(`/org/departments/${id}`),
  create: (payload: DepartmentCreate) => apiClient.post<Department>('/org/departments', payload),
  update: (id: number, payload: DepartmentUpdate) => apiClient.patch<Department>(`/org/departments/${id}`, payload),
  remove: (id: number) => apiClient.delete<{ ok: boolean }>(`/org/departments/${id}`),
};
