'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { integrationsApi } from '@/lib/api/index';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LinkedInCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const code = searchParams.get('code');
        const state = searchParams.get('state');

        if (!code) {
            setStatus('error');
            setErrorMessage('No authorization code received from LinkedIn.');
            return;
        }

        handleCallback(code, state || '');
    }, [searchParams]);

    const handleCallback = async (code: string, state: string) => {
        try {
            await integrationsApi.linkedin.callback(code, state);
            setStatus('success');

            // Redirect back to integrations after a short delay
            setTimeout(() => {
                router.push('/dashboard/integrations');
            }, 3000);
        } catch (error: any) {
            console.error('LinkedIn authentication failed:', error);
            setStatus('error');
            setErrorMessage(error.message || 'Failed to authenticate with LinkedIn.');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <Card className="w-full max-w-md shadow-xl border-0">
                <CardHeader className="text-center pb-8">
                    <div className="mx-auto p-3 bg-blue-600 rounded-xl w-fit mb-4">
                        <Sparkles className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold">LinkedIn Integration</CardTitle>
                    <CardDescription>
                        Finishing the connection to your LinkedIn account
                    </CardDescription>
                </CardHeader>

                <CardContent className="flex flex-col items-center py-6 text-center">
                    {status === 'loading' && (
                        <>
                            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                            <p className="text-slate-600 font-medium text-lg">Authenticating with LinkedIn...</p>
                            <p className="text-slate-400 text-sm mt-2">This will only take a moment.</p>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <div className="bg-green-100 p-4 rounded-full mb-4">
                                <CheckCircle2 className="h-12 w-12 text-green-600" />
                            </div>
                            <p className="text-slate-900 font-bold text-xl">Successfully Connected!</p>
                            <p className="text-slate-500 mt-2">Your LinkedIn account has been linked to Evalyn.</p>
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
