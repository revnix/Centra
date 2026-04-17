'use client';

/**
 * useJobGeneration — FastAPI-backed implementation
 *
 * The previous implementation used @langchain/langgraph-sdk/react useStream,
 * which requires the LangGraph Server API routes (/threads, /assistants, /runs).
 * When langgraph dev is started with a custom http.app, those routes are NOT
 * exposed — all requests hit the FastAPI app which returns 404.
 *
 * This replacement calls the existing /jobs/generate-draft FastAPI endpoint
 * and exposes the same interface so that page.tsx requires zero changes.
 */

import { useState, useRef } from 'react';
import { jobsApi } from '@/lib/api/jobs';

export interface JobGenerationInput {
    role: string;
    location: string;
    skills: string[];
    company_name: string;
    employment_type: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
    experience_level: 'Junior' | 'Mid' | 'Senior' | 'Lead';
}

/** Shape the backend draft response into the generatedPost format expected by page.tsx */
function buildPost(input: JobGenerationInput, draft: any) {
    return {
        job_title: input.role,
        location: input.location,
        summary: draft?.summary ?? '',
        skills: draft?.skills ?? [],
        responsibilities: draft?.responsibilities ?? [],
        requirements: draft?.requirements ?? [],
        preferred_qualifications: draft?.preferred_qualifications ?? [],
        benefits: draft?.benefits ?? [],
        suggested_salary_min: draft?.suggested_salary_min ?? null,
        suggested_salary_max: draft?.suggested_salary_max ?? null,
        suggested_salary_currency: draft?.suggested_salary_currency ?? 'PKR',
        suggested_salary_period: draft?.suggested_salary_period ?? 'monthly',
    };
}

export function useJobGeneration() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<any>(null);
    const [generatedPost, setGeneratedPost] = useState<any>(null);
    const [isAwaitingReview, setIsAwaitingReview] = useState(false);
    const [values, setValues] = useState<any>(null);
    const latestInput = useRef<JobGenerationInput | null>(null);

    /** Generate a new job post from scratch */
    const generateJob = async (input: JobGenerationInput) => {
        latestInput.current = input;
        setIsLoading(true);
        setError(null);
        setGeneratedPost(null);
        setIsAwaitingReview(false);
        setValues(null);

        try {
            const draft = await jobsApi.generateDraft({
                title: input.role,
                department: input.company_name,
                location: input.location,
                experience_level: input.experience_level,
                job_type: input.employment_type,
            });

            const post = buildPost(input, draft);
            setGeneratedPost(post);
            setValues({ jd: { post, status: 'awaiting_review' } });
            setIsAwaitingReview(true);
        } catch (err: any) {
            setError(err);
        } finally {
            setIsLoading(false);
        }
    };

    /** Approve — just close the review state; the caller handles DB save */
    const approveJob = async () => {
        setIsAwaitingReview(false);
    };

    /** Regenerate with HR feedback */
    const rejectWithFeedback = async (feedbackText: string) => {
        const input = latestInput.current;
        setIsLoading(true);
        setError(null);

        try {
            const draft = await jobsApi.generateDraft({
                title: input ? `${input.role} (${feedbackText.substring(0, 60)})` : feedbackText,
                department: input?.company_name,
                location: input?.location,
                experience_level: input?.experience_level ?? 'Mid',
                job_type: input?.employment_type ?? 'full-time',
            });

            const post = buildPost(
                input ?? {
                    role: generatedPost?.job_title ?? 'Software Engineer',
                    location: generatedPost?.location ?? 'Remote',
                    skills: generatedPost?.skills ?? [],
                    company_name: '',
                    employment_type: 'Full-time',
                    experience_level: 'Mid',
                },
                draft
            );

            setGeneratedPost(post);
            setValues({ jd: { post, status: 'awaiting_review' } });
            setIsAwaitingReview(true);
        } catch (err: any) {
            setError(err);
        } finally {
            setIsLoading(false);
        }
    };

    return {
        // State
        isLoading,
        error,
        values,

        // HITL compat (no-op — not needed with FastAPI backend)
        interrupt: null,
        isAwaitingReview,

        // Generated job post
        generatedPost,
        status: isAwaitingReview ? 'awaiting_review' : null,

        // Actions
        generateJob,
        approveJob,
        rejectWithFeedback,

        // Stop stream (no-op)
        stop: () => {},
    };
}
