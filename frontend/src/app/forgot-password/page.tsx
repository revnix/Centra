"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/lib/api/client";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            await apiClient.post("/auth/forgot-password", { email });
            setIsSubmitted(true);
        } catch (err: any) {
            setError(err?.message || "Failed to send reset link. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center p-6">
            <Card className="w-full max-w-md shadow-xl border-0">
                <CardHeader className="space-y-4 text-center pb-8">
                    <div className="mx-auto p-3 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl w-fit">
                        <Sparkles className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <CardTitle className="text-3xl font-bold">Forgot Password?</CardTitle>
                        <CardDescription className="text-base mt-2">
                            Enter your email and we'll send you a link to reset your password.
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent>
                    {!isSubmitted ? (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <Alert variant="destructive" className="bg-red-50 border-red-200">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-medium">
                                    Email Address
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="h-11"
                                    disabled={isLoading}
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-base font-medium"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sending Link...
                                    </>
                                ) : (
                                    "Send Reset Link"
                                )}
                            </Button>

                            <Link
                                href="/login"
                                className="flex items-center justify-center text-sm text-slate-600 hover:text-blue-600 transition-colors"
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to login
                            </Link>
                        </form>
                    ) : (
                        <div className="text-center space-y-6 py-4">
                            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="h-10 w-10 text-green-600" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-semibold">Check your email</h3>
                                <p className="text-slate-600">
                                    We've sent a password reset link to <strong>{email}</strong>.
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                className="w-full h-11"
                                onClick={() => setIsSubmitted(false)}
                            >
                                Didn't get the email? Try again
                            </Button>
                            <Link
                                href="/login"
                                className="block text-sm text-blue-600 hover:underline font-medium"
                            >
                                Return to login
                            </Link>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
