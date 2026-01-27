'use client';

import { useStream } from '@langchain/langgraph-sdk/react';
import type { EvalynState, HITLInterrupt, HITLResponse, JDState } from '@/lib/types/langgraph';

const getLangGraphApiUrl = () => {
    if (typeof window !== "undefined") {
        const host = window.location.hostname === "localhost" ? "127.0.0.1" : window.location.hostname;
        return `http://${host}:2024`;
    }
    return 'http://localhost:2024';
};

const LANGGRAPH_API_URL = getLangGraphApiUrl();

export interface JobGenerationInput {
    role: string;
    location: string;
    skills: string[];
    company_name: string;
    employment_type: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
    experience_level: 'Junior' | 'Mid' | 'Senior' | 'Lead';
}

export function useJobGeneration() {
    const stream = useStream<EvalynState, { InterruptType: HITLInterrupt }>({
        assistantId: 'workflow',  // matches graph_id in langgraph.json
        apiUrl: LANGGRAPH_API_URL,
    });

    // Start job generation with initial input
    const generateJob = (input: JobGenerationInput) => {
        const initialState: { jd: JDState } = {
            jd: {
                role: input.role,
                location: input.location,
                skills: input.skills,
                company_name: input.company_name,
                employment_type: input.employment_type,
                experience_level: input.experience_level,
                feedback: null,
                status: 'draft',
                post: null,
            },
        };

        stream.submit(initialState);
    };

    // Approve the generated job post
    const approveJob = async () => {
        const response: HITLResponse = { status: 'approved' };
        await stream.submit(null, {
            command: {
                resume: response,
            },
        });
    };

    // Reject and provide feedback for regeneration
    const rejectWithFeedback = async (feedback: string) => {
        // The backend expects a simple string or a dict. 
        // Based on our previous fixes, it handles {"status": "rejected", "feedback": "..."}
        const response: HITLResponse = { status: 'rejected', feedback };
        await stream.submit(null, {
            command: {
                resume: response,
            },
        });
    };

    // Extract interrupt value with proper typing
    // LangGraph SDK react hook puts the value attribute of the first interrupt in stream.interrupt
    const interruptValue = stream.interrupt?.value as HITLInterrupt | undefined;

    // Type-safe access to values
    const values = stream.values as unknown as EvalynState | undefined;

    return {
        // State
        isLoading: stream.isLoading,
        error: stream.error,
        values: values,

        // HITL
        interrupt: interruptValue,
        isAwaitingReview: !!stream.interrupt,

        // Generated job post (from interrupt or state)
        generatedPost: interruptValue?.job_post || values?.jd?.post || null,
        status: values?.jd?.status || null,

        // Actions
        generateJob,
        approveJob,
        rejectWithFeedback,

        // Stop stream
        stop: stream.stop,
    };
}
