import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export interface MeUser {
  id: number;
  email: string;
  username: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
}

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.get<MeUser>('/users/me'),
    staleTime: 30_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}
