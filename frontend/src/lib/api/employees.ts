import { apiClient } from './client';

export interface Employee {
  user_id: number;
  email: string;
  username: string;
  full_name: string | null;
  role: string;
  is_active: boolean;

  department_id: number | null;
  job_title: string | null;
  joining_date: string | null;
  manager_user_id: number | null;
  employee_profile_id: number;

  created_at: string;
  updated_at: string | null;
}

export interface EmployeeCreate {
  email: string;
  full_name?: string | null;
  username?: string | null;
  password?: string | null;
  department_id?: number | null;
  job_title?: string | null;
  joining_date?: string | null;
  manager_user_id?: number | null;
}

export interface EmployeeCreateResponse {
  employee: Employee;
  temp_password?: string | null;
}

export interface EmployeeUpdate {
  department_id?: number | null;
  job_title?: string | null;
  joining_date?: string | null;
  manager_user_id?: number | null;
  is_active?: boolean | null;
}

export const employeesApi = {
  list: () => apiClient.get<Employee[]>('/hr/employees'),
  create: (payload: EmployeeCreate) => apiClient.post<EmployeeCreateResponse>('/hr/employees', payload),
  update: (employeeProfileId: number, payload: EmployeeUpdate) =>
    apiClient.patch<Employee>(`/hr/employees/${employeeProfileId}`, payload),
};
