export class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = "ApiError";
    }
}

import { authApi } from './auth';
import { jobsApi } from './jobs';
import { interviewsApi } from './interviews';
import { applicationsApi } from './applications';

export { authApi };
export { jobsApi };
export { interviewsApi };
export { applicationsApi };
export { apiClient } from './client';
export { candidatesApi } from './candidates';
export { codingApi } from './coding';
export { integrationsApi } from './integrations';

// Compatibility export for legacy code
export const api = {
    jobs: {
        list: () => jobsApi.getPublic(),
        get: (id: string) => jobsApi.getById(id),
    },
    interviews: {
        getSession: (token: string) => interviewsApi.getSession(token),
        sendMessage: (token: string, message: string) => interviewsApi.sendMessage(token, message),
        create: (applicationId: number) => interviewsApi.create(applicationId),
        startInterview: (token: string) => interviewsApi.startInterview(token),
    },
    applications: {
        guestApply: (data: any) => applicationsApi.guestApply(data),
        list: () => applicationsApi.list(),
        get: (id: string) => applicationsApi.get(id),
    },
};
