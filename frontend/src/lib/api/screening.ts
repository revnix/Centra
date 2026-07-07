import { apiClient } from './client';

export const screeningApi = {
    /** HR: create a screening test for an application. Returns {token, test_url, id} */
    create: (applicationId: number | string) =>
        apiClient.post<{ token: string; test_url: string; id: number }>(
            `/screening/create/${applicationId}`
        ),

    /** HR: get result for an application. */
    getResult: (applicationId: number | string) =>
        apiClient.get<any>(`/screening/result/${applicationId}`),

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
