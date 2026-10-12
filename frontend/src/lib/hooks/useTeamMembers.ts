import { useQuery } from '@tanstack/react-query';
import { employeesApi, type Employee } from '@/lib/api/employees';

export function useTeamMembers(enabled: boolean) {
  return useQuery({
    queryKey: ['team', 'members'],
    queryFn: () => employeesApi.myTeam(),
    enabled,
    staleTime: 10_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}
