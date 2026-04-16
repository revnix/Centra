"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { authApi } from "@/lib/api";
import { UserRole } from "@/lib/types";

export default function SignupPage() {
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        company: "",
        password: "",
        confirmPassword: ""
    });
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        // Validation
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (!acceptTerms) {
            setError("Please accept the terms and conditions");
            return;
        }

        setIsLoading(true);

        try {
            // Mapping frontend signup to backend register
            // Note: backend expects 'role' in UserCreate. Defaulting to ADMIN for this flow as per original logic.
            const response = await authApi.register({
                email: formData.email,
                full_name: formData.fullName,
                password: formData.password,
                role: 'ADMIN' as any
            });

            localStorage.setItem("access_token", response.access_token.access_token);

            // Set cookie for middleware
            document.cookie = `access_token=${response.access_token.access_token}; path=/; max-age=86400; SameSite=Lax`;

            localStorage.setItem("userRole", response.user.role);
            localStorage.setItem("userEmail", response.user.email);

            window.location.href = "/dashboard/jobs";
        } catch (err: any) {
            console.error("Signup failed:", err);
            setError(err.message || "Failed to create account. Please try again.");
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
                        <CardTitle className="text-3xl font-bold">Create your account</CardTitle>
                        <CardDescription className="text-base mt-2">
                            Start hiring smarter with AI today
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSignup} className="space-y-4">
                        {error && (
                            <Alert variant="destructive" className="bg-red-50 border-red-200">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="fullName" className="text-sm font-medium">
                                Full Name
                            </Label>
                            <Input
                                id="fullName"
                                name="fullName"
                                type="text"
                                placeholder="John Doe"
                                value={formData.fullName}
                                onChange={handleInputChange}
                                required
                                className="h-11"
                                disabled={isLoading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-medium">
                                Work Email
                            </Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="you@company.com"
                                value={formData.email}
                                onChange={handleInputChange}
                                required
                                className="h-11"
                                disabled={isLoading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="company" className="text-sm font-medium">
                                Company Name
                            </Label>
                            <Input
                                id="company"
                                name="company"
                                type="text"
                                placeholder="Acme Inc."
                                value={formData.company}
                                onChange={handleInputChange}
                                required
                                className="h-11"
                                disabled={isLoading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm font-medium">
                                Password
                            </Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={handleInputChange}
                                required
                                className="h-11"
                                disabled={isLoading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword" className="text-sm font-medium">
                                Confirm Password
                            </Label>
                            <Input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                placeholder="••••••••"
                                value={formData.confirmPassword}
                                onChange={handleInputChange}
                                required
                                className="h-11"
                                disabled={isLoading}
                            />
                        </div>

                        <div className="flex items-start space-x-2 pt-2">
                            <Checkbox
                                id="terms"
                                checked={acceptTerms}
                                onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                                disabled={isLoading}
                            />
                            <label
                                htmlFor="terms"
                                className="text-sm text-slate-600 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                I agree to the{" "}
                                <Link href="/terms" className="text-blue-600 hover:underline">
                                    Terms of Service
                                </Link>{" "}
                                and{" "}
                                <Link href="/privacy" className="text-blue-600 hover:underline">
                                    Privacy Policy
                                </Link>
                            </label>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-base font-medium mt-6"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating account...
                                </>
                            ) : (
                                "Create Account"
                            )}
                        </Button>

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="bg-white px-4 text-slate-500">Or sign up with</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                className="h-11"
                                onClick={() => setError("SSO not configured yet")}
                            >
                                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Google
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="h-11"
                                onClick={() => setError("SSO not configured yet")}
                            >
                                <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                </svg>
                                LinkedIn
                            </Button>
                        </div>
                    </form>

                    <div className="mt-6 text-center text-sm text-slate-600">
                        Already have an account?{" "}
                        <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium hover:underline">
                            Sign in
                        </Link>
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-100">
                        <div className="text-xs text-slate-500 text-center space-y-2">
                            <p className="flex items-center justify-center gap-2">
                                <CheckCircle2 className="h-3 w-3 text-green-600" />
                                Free 14-day trial • No credit card required
                            </p>
                            <p className="flex items-center justify-center gap-2">
                                <CheckCircle2 className="h-3 w-3 text-green-600" />
                                Cancel anytime • Full feature access
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
