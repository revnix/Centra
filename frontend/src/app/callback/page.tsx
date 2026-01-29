'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { integrationsApi } from '@/lib/api/index';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { Suspense } from 'react';

function GenericCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState('');
    const [platformName, setPlatformName] = useState('Integration');

    useEffect(() => {
        const code = searchParams.get('code');
        const state = searchParams.get('state');

        // Detect platform from URL or state if possible
        // For now, if it's the root /callback, it's likely Indeed based on .env
        const path = typeof window !== 'undefined' ? window.location.pathname : '';
        const platform = path.includes('linkedin') ? 'linkedin' : 'indeed';
        setPlatformName(platform.charAt(0).toUpperCase() + platform.slice(1));

        if (!code) {
            setStatus('error');
            setErrorMessage(`No authorization code received from ${platformName}.`);
            return;
        }

        handleCallback(platform, code, state || '');
    }, [searchParams, platformName]);

    const handleCallback = async (platform: string, code: string, state: string) => {
        try {
            if (platform === 'linkedin') {
                await integrationsApi.linkedin.callback(code, state);
            } else {
                await integrationsApi.indeed.callback(code, state);
            }

            setStatus('success');

            // Redirect back to integrations after a short delay
            setTimeout(() => {
                router.push('/dashboard/integrations');
            }, 3000);
        } catch (error: any) {
            console.error(`${platformName} authentication failed:`, error);
            setStatus('error');
            setErrorMessage(error.message || `Failed to authenticate with ${platformName}.`);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <Card className="w-full max-w-md shadow-xl border-0">
                <CardHeader className="text-center pb-8">
                    <div className="mx-auto p-3 bg-blue-600 rounded-xl w-fit mb-4">
                        <Sparkles className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold">{platformName} Integration</CardTitle>
                    <CardDescription>
                        Finishing the connection to your {platformName} account
                    </CardDescription>
                </CardHeader>

                <CardContent className="flex flex-col items-center py-6 text-center">
                    {status === 'loading' && (
                        <>
                            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                            <p className="text-slate-600 font-medium text-lg">Authenticating with {platformName}...</p>
                            <p className="text-slate-400 text-sm mt-2">This will only take a moment.</p>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <div className="bg-green-100 p-4 rounded-full mb-4">
                                <CheckCircle2 className="h-12 w-12 text-green-600" />
                            </div>
                            <p className="text-slate-900 font-bold text-xl">Successfully Connected!</p>
                            <p className="text-slate-500 mt-2">Your {platformName} account has been linked to Evalyn.</p>
                            <p className="text-slate-400 text-sm mt-6 animate-pulse">Redirecting you back...</p>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <div className="bg-red-100 p-4 rounded-full mb-4">
                                <AlertCircle className="h-12 w-12 text-red-600" />
                            </div>
                            <p className="text-slate-900 font-bold text-xl">Connection Failed</p>
                            <p className="text-red-500 mt-2">{errorMessage}</p>
                            <Button
                                className="mt-8 bg-blue-600 hover:bg-blue-700 w-full"
                                onClick={() => router.push('/dashboard/integrations')}
                            >
                                Back to Integrations
                            </Button>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default function GenericCallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            </div>
        }>
            <GenericCallbackContent />
        </Suspense>
    );
}
