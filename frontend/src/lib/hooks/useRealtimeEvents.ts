import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimeEvent, EventType } from '@/lib/types';
import { candidateKeys } from './useCandidates';
import { interviewKeys } from './useInterviews';
import { codingKeys } from './useCoding';
import { jobKeys } from './useJobs';

const SSE_ENDPOINT = process.env.NEXT_PUBLIC_API_BASE_URL
    ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/events/stream`
    : 'http://localhost:8000/api/events/stream';

/**
 * Hook to subscribe to real-time Server-Sent Events
 * Automatically invalidates relevant queries when events occur
 */
export function useRealtimeEvents(eventTypes?: EventType[]) {
    const queryClient = useQueryClient();

    const handleEvent = useCallback(
        (event: RealtimeEvent) => {
            console.log('[SSE Event]', event.type, event.data);

            switch (event.type) {
                case 'candidate.stage_changed': {
                    const { candidateId, jobId } = event.data;
                    // Invalidate candidate details and job's candidate list
                    queryClient.invalidateQueries({ queryKey: candidateKeys.detail(candidateId) });
                    queryClient.invalidateQueries({ queryKey: candidateKeys.lists() });
                    break;
                }

                case 'candidate.review_required': {
                    const { candidateId } = event.data;
                    queryClient.invalidateQueries({ queryKey: candidateKeys.detail(candidateId) });
                    queryClient.invalidateQueries({ queryKey: candidateKeys.lists() });

                    // TODO: Show toast notification
                    if (typeof window !== 'undefined') {
                        console.log('🔔 Review required for candidate:', candidateId);
                    }
                    break;
                }

                case 'interview.completed': {
                    const { interviewId, candidateId } = event.data;
                    queryClient.invalidateQueries({ queryKey: interviewKeys.detail(interviewId) });
                    queryClient.invalidateQueries({ queryKey: candidateKeys.detail(candidateId) });

                    // TODO: Show toast notification
                    if (typeof window !== 'undefined') {
                        console.log('✅ Interview completed:', interviewId);
                    }
                    break;
                }

                case 'coding.submitted': {
                    const { exerciseId, candidateId } = event.data;
                    queryClient.invalidateQueries({ queryKey: codingKeys.detail(exerciseId) });
                    queryClient.invalidateQueries({ queryKey: candidateKeys.detail(candidateId) });
                    break;
                }

                case 'job.published': {
                    const { jobId } = event.data;
                    queryClient.invalidateQueries({ queryKey: jobKeys.detail(jobId) });
                    queryClient.invalidateQueries({ queryKey: jobKeys.lists() });
                    break;
                }

                case 'job.closed': {
                    const { jobId } = event.data;
                    queryClient.invalidateQueries({ queryKey: jobKeys.detail(jobId) });
                    queryClient.invalidateQueries({ queryKey: jobKeys.lists() });
                    break;
                }

                default:
                    console.warn('[SSE] Unknown event type:', event.type);
            }
        },
        [queryClient]
    );

    useEffect(() => {
        // Only run on client side
        if (typeof window === 'undefined') return;

        const token = localStorage.getItem('access_token');
        if (!token) {
            console.warn('[SSE] No access token, skipping SSE connection');
            return;
        }

        const url = new URL(SSE_ENDPOINT);
        if (eventTypes && eventTypes.length > 0) {
            url.searchParams.set('events', eventTypes.join(','));
        }

        const eventSource = new EventSource(url.toString());

        eventSource.onopen = () => {
            console.log('[SSE] Connection established');
        };

        eventSource.onmessage = (event) => {
            try {
                const data: RealtimeEvent = JSON.parse(event.data);
                handleEvent(data);
            } catch (error) {
                console.error('[SSE] Failed to parse event:', error);
            }
        };

        eventSource.onerror = (error) => {
            console.error('[SSE] Connection error:', error);
            eventSource.close();
        };

        // Cleanup on unmount
        return () => {
            console.log('[SSE] Closing connection');
            eventSource.close();
        };
    }, [eventTypes, handleEvent]);
}
