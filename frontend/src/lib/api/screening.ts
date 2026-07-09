import { apiClient } from './client';

export type ScreeningQuestionPayload = {
    question: string;
    options: string[];
    correct_index: number;
    difficulty?: 'basic' | 'intermediate' | 'advanced';
};

export type ScreeningResult = {
    id: number;
    application_id: number;
    token: string;
    questions: ScreeningQuestionPayload[];
    answers: (number | null)[] | null;
    score: number | null;
    total_questions: number;
    time_limit_minutes: number;
    status: string;
    started_at: string | null;
    completed_at: string | null;
    recording_url: string | null;
    created_at: string | null;
};

export const screeningApi = {
    /** HR: create a screening test for an application. Returns {token, test_url, id} */
    create: (
        applicationId: number | string,
        payload?: {
            questions?: ScreeningQuestionPayload[];
            raw_questions?: string[];
            time_limit_minutes?: number;
        }
    ) =>
        apiClient.post<{ token: string; test_url: string; id: number }>(
            `/screening/create/${applicationId}`,
            payload
        ),

    /** HR: get result for an application. */
    getResult: (applicationId: number | string) =>
        apiClient.get<ScreeningResult>(`/screening/result/${applicationId}`),

    /** Public: get test data by token (no auth). */
    getTest: (token: string) =>
        fetch(`/api/v1/screening/test/${token}`).then(async (res) => {
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.detail || 'Failed to load test');
            }
            return res.json();
        }),

    /** Public: submit answers (no auth). */
    submit: (token: string, answers: (number | null)[], recordingUrl?: string) =>
        fetch(`/api/v1/screening/submit/${token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answers, recording_url: recordingUrl ?? null }),
        }).then((r) => r.json()),

    /** Public: upload a recording blob. */
    uploadRecording: (blob: Blob) => {
        const fd = new FormData();
        fd.append('file', blob, 'screening.webm');
        return fetch('/api/v1/files/upload-recording', { method: 'POST', body: fd }).then((r) =>
            r.json()
        );
    },
};
