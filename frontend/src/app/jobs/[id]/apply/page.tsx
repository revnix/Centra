"use client";

import { use, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Sparkles,
    Upload,
    FileText,
    Loader2,
    CheckCircle2,
    AlertCircle,
    ArrowLeft,
    Mail,
    Calendar
} from "lucide-react";
import Link from "next/link";

const jobTitles: Record<string, string> = {
    "1": "Senior Frontend Engineer",
    "2": "Backend Engineer",
    "3": "Product Designer",
    "4": "Data Scientist"
};

export default function JobApplicationPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const jobTitle = jobTitles[id] || "Software Engineer";

    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        phone: "",
        linkedin: "",
        portfolio: "",
        coverLetter: "",
        hearAbout: ""
    });

    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState("");

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                setError("File size must be less than 5MB");
                return;
            }
            if (!['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)) {
                setError("Please upload a PDF or Word document");
                return;
            }
            setResumeFile(file);
            setError("");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!resumeFile) {
            setError("Please upload your resume");
            return;
        }

        setIsSubmitting(true);

        // Simulate API call to create candidate and send interview link
        setTimeout(() => {
            // In production:
            // 1. Upload resume to cloud storage
            // 2. Create candidate record with temp ID
            // 3. Generate interview token
            // 4. Send email with interview link

            setIsSubmitting(false);
            setIsSubmitted(true);
        }, 2000);
    };

    // Success screen
    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center p-6">
                <Card className="max-w-2xl w-full shadow-xl border-t-4 border-t-green-600">
                    <CardContent className="pt-12 pb-12 text-center space-y-6">
                        <div className="mx-auto p-4 bg-green-100 rounded-full w-fit">
                            <CheckCircle2 className="h-16 w-16 text-green-600" />
                        </div>

                        <div className="space-y-3">
                            <h2 className="text-3xl font-bold text-slate-900">Application Submitted!</h2>
                            <p className="text-lg text-slate-600">
                                Thank you for applying to <span className="font-semibold text-slate-900">{jobTitle}</span>
                            </p>
                        </div>

                        <Card className="bg-blue-50 border-blue-200 text-left">
                            <CardContent className="p-6 space-y-4">
                                <div className="flex items-start gap-3">
                                    <Mail className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                                    <div>
                                        <h3 className="font-semibold text-slate-900 mb-1">Check Your Email</h3>
                                        <p className="text-sm text-slate-600">
                                            We've sent an interview invitation to <span className="font-medium text-blue-600">{formData.email}</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <Calendar className="h-6 w-6 text-purple-600 flex-shrink-0 mt-1" />
                                    <div>
                                        <h3 className="font-semibold text-slate-900 mb-1">Next Steps</h3>
                                        <ol className="text-sm text-slate-600 space-y-1 list-decimal list-inside">
                                            <li>Complete your AI interview (30 minutes)</li>
                                            <li>Finish the coding challenge (45 minutes)</li>
                                            <li>We'll review and get back to you within 48 hours</li>
                                        </ol>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Alert className="bg-purple-50 border-purple-200 text-left">
                            <Sparkles className="h-4 w-4 text-purple-600" />
                            <AlertDescription className="text-purple-900">
                                <strong>Pro tip:</strong> The interview link expires in 48 hours.
                                Complete it at your convenience within that time.
                            </AlertDescription>
                        </Alert>

                        <div className="flex gap-3 justify-center pt-4">
                            <Button variant="outline" onClick={() => window.location.href = "/jobs"}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Browse More Jobs
                            </Button>
                            <Button onClick={() => window.location.href = "/"}>
                                Go to Homepage
                            </Button>
                        </div>

                        <p className="text-sm text-slate-500 pt-4">
                            Didn't receive the email? Check your spam folder or{" "}
                            <a href="#" className="text-blue-600 hover:underline">resend link</a>
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Application form
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
            {/* Header */}
            <header className="border-b bg-white/80 backdrop-blur-sm">
                <div className="container mx-auto px-6 py-4">
                    <Link href={`/jobs/${id}`} className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
                        <ArrowLeft className="h-5 w-5" />
                        <span>Back to Job</span>
                    </Link>
                </div>
            </header>

            <div className="container mx-auto px-6 py-12">
                <div className="max-w-3xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 mb-4">
                            <Sparkles className="h-3 w-3 mr-1" />
                            AI-Powered Hiring
                        </Badge>
                        <h1 className="text-4xl font-bold text-slate-900 mb-2">Apply for {jobTitle}</h1>
                        <p className="text-lg text-slate-600">
                            No account required • Takes 5 minutes • Get interviewed by AI
                        </p>
                    </div>

                    <Card className="shadow-xl">
                        <CardHeader>
                            <CardTitle>Application Form</CardTitle>
                            <CardDescription>
                                Fill in your details below. We'll send you an interview link via email.
                            </CardDescription>
                        </CardHeader>

                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {error && (
                                    <Alert variant="destructive" className="bg-red-50 border-red-200">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>{error}</AlertDescription>
                                    </Alert>
                                )}

                                {/* Personal Information */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-slate-900">Personal Information</h3>

                                    <div className="space-y-2">
                                        <Label htmlFor="fullName">
                                            Full Name <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="fullName"
                                            name="fullName"
                                            placeholder="John Doe"
                                            value={formData.fullName}
                                            onChange={handleInputChange}
                                            required
                                            disabled={isSubmitting}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="email">
                                                Email <span className="text-red-500">*</span>
                                            </Label>
                                            <Input
                                                id="email"
                                                name="email"
                                                type="email"
                                                placeholder="john@example.com"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                required
                                                disabled={isSubmitting}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="phone">
                                                Phone <span className="text-red-500">*</span>
                                            </Label>
                                            <Input
                                                id="phone"
                                                name="phone"
                                                type="tel"
                                                placeholder="+1 (555) 123-4567"
                                                value={formData.phone}
                                                onChange={handleInputChange}
                                                required
                                                disabled={isSubmitting}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Resume Upload */}
                                <div className="space-y-2">
                                    <Label htmlFor="resume">
                                        Resume <span className="text-red-500">*</span>
                                    </Label>
                                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                                        <input
                                            type="file"
                                            id="resume"
                                            accept=".pdf,.doc,.docx"
                                            onChange={handleFileChange}
                                            className="hidden"
                                            disabled={isSubmitting}
                                        />
                                        <label htmlFor="resume" className="cursor-pointer">
                                            {resumeFile ? (
                                                <div className="flex items-center justify-center gap-2 text-green-600">
                                                    <FileText className="h-6 w-6" />
                                                    <span className="font-medium">{resumeFile.name}</span>
                                                    <CheckCircle2 className="h-5 w-5" />
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <Upload className="h-12 w-12 mx-auto text-slate-400" />
                                                    <p className="text-slate-600 font-medium">
                                                        Click to upload or drag and drop
                                                    </p>
                                                    <p className="text-sm text-slate-500">
                                                        PDF or Word document (max 5MB)
                                                    </p>
                                                </div>
                                            )}
                                        </label>
                                    </div>
                                </div>

                                {/* Optional Links */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-slate-900">Additional Information (Optional)</h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="linkedin">LinkedIn Profile</Label>
                                            <Input
                                                id="linkedin"
                                                name="linkedin"
                                                placeholder="linkedin.com/in/yourprofile"
                                                value={formData.linkedin}
                                                onChange={handleInputChange}
                                                disabled={isSubmitting}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="portfolio">Portfolio/GitHub</Label>
                                            <Input
                                                id="portfolio"
                                                name="portfolio"
                                                placeholder="github.com/yourname"
                                                value={formData.portfolio}
                                                onChange={handleInputChange}
                                                disabled={isSubmitting}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="coverLetter">Cover Letter</Label>
                                        <Textarea
                                            id="coverLetter"
                                            name="coverLetter"
                                            placeholder="Tell us why you're a great fit for this role..."
                                            rows={4}
                                            value={formData.coverLetter}
                                            onChange={handleInputChange}
                                            disabled={isSubmitting}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="hearAbout">How did you hear about us?</Label>
                                        <Select value={formData.hearAbout} onValueChange={(val) => setFormData({ ...formData, hearAbout: val })}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select an option" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="linkedin">LinkedIn</SelectItem>
                                                <SelectItem value="indeed">Indeed</SelectItem>
                                                <SelectItem value="referral">Employee Referral</SelectItem>
                                                <SelectItem value="website">Company Website</SelectItem>
                                                <SelectItem value="other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <Alert className="bg-blue-50 border-blue-200">
                                    <Sparkles className="h-4 w-4 text-blue-600" />
                                    <AlertDescription className="text-blue-900">
                                        After submitting, you'll receive an email with your personalized interview link.
                                        The AI interview takes about 30 minutes and can be completed at your convenience.
                                    </AlertDescription>
                                </Alert>

                                <Button
                                    type="submit"
                                    size="lg"
                                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Submitting Application...
                                        </>
                                    ) : (
                                        <>
                                            Submit Application
                                            <CheckCircle2 className="ml-2 h-5 w-5" />
                                        </>
                                    )}
                                </Button>

                                <p className="text-center text-sm text-slate-500">
                                    By submitting, you agree to our{" "}
                                    <a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a> and{" "}
                                    <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>
                                </p>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
