import { useQuery, useMutation } from '@tanstack/react-query';
import { indeedApi } from '@/lib/api';

export const indeedKeys = {
    all: ['indeed'] as const,
    status: () => [...indeedKeys.all, 'status'] as const,
};

export function useIndeedStatus() {
    return useQuery({
        queryKey: indeedKeys.status(),
        queryFn: indeedApi.getStatus,
        staleTime: 60000,
    });
}

export function useConnectIndeed() {
    return useMutation({
        mutationFn: indeedApi.getConnectUrl,
        onSuccess: (data) => {
            if (data.url) {
                window.location.href = data.url;
            }
        },
    });
}
