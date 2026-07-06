"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle, Loader2, Monitor, ClipboardList } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { applicationsApi } from "@/lib/api/applications";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreRing } from "@/components/ui/score-ring";
import { toast } from "sonner";

interface ScreeningResult {
    id: number;
    application_id: number;
    questions: Array<{ id: number; question: string; options: string[]; correct_index: number; difficulty: string }>;
    answers: number[] | null;
    score: number | null;
    total_questions: number;
    status: string;
    completed_at: string | null;
    recording_url: string | null;
}

const STATUS_COLORS: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-700",
    IN_PROGRESS: "bg-blue-100 text-blue-700",
    COMPLETED: "bg-green-100 text-green-700",
    EXPIRED: "bg-red-100 text-red-700",
};

export default function ScreeningResultPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [result, setResult] = useState<ScreeningResult | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [inviting, setInviting] = useState(false);

    useEffect(() => {
        apiClient
            .get<ScreeningResult>(`/screening/result/${id}`)
            .then(setResult)
            .catch((err: any) => {
                if (err?.code === "HTTP_404") setNotFound(true);
            })
            .finally(() => setIsLoading(false));
    }, [id]);

    const handleSendInvite = async () => {
        setInviting(true);
        try {
            await applicationsApi.shortlist(id);
            toast.success("Interview invite sent to candidate!");
        } catch (err: any) {
            toast.error(err?.message || "Failed to send invite");
        } finally {
            setInviting(false);
        }
    };

    const scoreColor =
        result?.score == null
            ? "text-slate-400"
            : result.score >= 70
            ? "text-green-600"
            : result.score >= 40
            ? "text-yellow-600"
            : "text-red-600";

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href={`/dashboard/applications/${id}`}>
                        <Button variant="outline" size="icon" className="rounded-full">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <ClipboardList className="w-5 h-5 text-indigo-500" />
                            Screening Test Result
                        </h1>
                        <p className="text-sm text-slate-500">Application #{id}</p>
                    </div>
                </div>
                {result?.status === "COMPLETED" && (
                    <Button
                        onClick={handleSendInvite}
                        disabled={inviting}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        {inviting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        ✉️ Send Interview Invite
                    </Button>
                )}
            </div>

            {isLoading && (
                <div className="flex items-center justify-center min-h-[300px]">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                </div>
            )}

            {!isLoading && notFound && (
                <Card>
                    <CardContent className="py-16 text-center text-slate-500">
                        No screening test has been created for this application yet.
                    </CardContent>
                </Card>
            )}

            {!isLoading && result && (
                <>
                    {/* Score summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="md:col-span-1">
                            <CardContent className="pt-6 text-center space-y-3">
                                <ScoreRing score={result.score ?? 0} size="lg" />
                                <div>
                                    <p className={`text-3xl font-bold ${scoreColor}`}>
                                        {result.score != null ? `${result.score}%` : "—"}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">Score</p>
                                </div>
                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[result.status] || "bg-slate-100 text-slate-600"}`}>
                                    {result.status}
                                </span>
                                {result.completed_at && (
                                    <p className="text-xs text-slate-400">
                                        Completed {new Date(result.completed_at).toLocaleString()}
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="md:col-span-2">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm text-slate-600">Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <Row label="Total Questions" value={String(result.total_questions)} />
                                <Row
                                    label="Correct Answers"
                                    value={
                                        result.answers && result.questions
                                            ? String(result.answers.filter((a, i) => a === result.questions[i]?.correct_index).length)
                                            : "—"
                                    }
                                />
                                <Row
                                    label="Incorrect Answers"
                                    value={
                                        result.answers && result.questions
                                            ? String(result.answers.filter((a, i) => a !== result.questions[i]?.correct_index && a !== null).length)
                                            : "—"
                                    }
                                />
                                <Row
                                    label="Skipped"
                                    value={result.answers ? String(result.answers.filter((a) => a === null).length) : "—"}
                                />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Screen recording */}
                    {result.recording_url && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Monitor className="w-4 h-4 text-indigo-500" />
                                    Screen Recording
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="aspect-video bg-black rounded-b-xl overflow-hidden">
                                    <video src={result.recording_url} controls className="w-full h-full" />
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Questions & answers */}
                    {result.questions && result.questions.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Questions &amp; Answers</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {result.questions.map((q, i) => {
                                    const candidateAnswer = result.answers?.[i] ?? null;
                                    const isCorrect = candidateAnswer === q.correct_index;
                                    return (
                                        <div key={q.id} className="space-y-2">
                                            <div className="flex items-start gap-2">
                                                {candidateAnswer !== null ? (
                                                    isCorrect
                                                        ? <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                                        : <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                                ) : (
                                                    <span className="w-5 h-5 flex-shrink-0 text-slate-300 text-xs flex items-center justify-center border rounded-full">?</span>
                                                )}
                                                <p className="text-sm font-medium text-slate-800">
                                                    <span className="text-slate-400 mr-1">Q{i + 1}.</span>
                                                    {q.question}
                                                </p>
                                            </div>
                                            <div className="ml-7 grid grid-cols-1 gap-1">
                                                {q.options.map((opt, j) => {
                                                    const isCorrectOpt = j === q.correct_index;
                                                    const isCandidateOpt = j === candidateAnswer;
                                                    let cls = "text-xs px-3 py-1.5 rounded-lg border ";
                                                    if (isCorrectOpt) cls += "border-green-400 bg-green-50 text-green-800 font-medium";
                                                    else if (isCandidateOpt && !isCorrect) cls += "border-red-300 bg-red-50 text-red-700";
                                                    else cls += "border-slate-100 bg-slate-50 text-slate-600";
                                                    return (
                                                        <div key={j} className={cls}>
                                                            {opt}
                                                            {isCorrectOpt && <span className="ml-2 text-green-600">✓ correct</span>}
                                                            {isCandidateOpt && !isCorrect && <span className="ml-2 text-red-500">← candidate</span>}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between py-1 border-b border-slate-50 last:border-0">
            <span className="text-slate-500">{label}</span>
            <span className="font-semibold text-slate-800">{value}</span>
        </div>
    );
}
