"use client";

import { useState, useEffect, use } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Play,
    Clock,
    CheckCircle2,
    XCircle,
    Code2,
    Loader2,
    AlertCircle,
    FileText,
    Terminal,
    RotateCcw,
    Send,
    ChevronUp,
    ChevronDown,
    X
} from "lucide-react";

/**
 * Coding Exercise Page
 * Code editor with problem description and test runner
 */

const problemDescription = {
    title: "Two Sum",
    difficulty: "Medium",
    description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.`,
    examples: [
        {
            input: "nums = [2,7,11,15], target = 9",
            output: "[0,1]",
            explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]."
        },
        {
            input: "nums = [3,2,4], target = 6",
            output: "[1,2]",
            explanation: "Because nums[1] + nums[2] == 6, we return [1, 2]."
        }
    ],
    constraints: [
        "2 <= nums.length <= 10^4",
        "-10^9 <= nums[i] <= 10^9",
        "-10^9 <= target <= 10^9",
        "Only one valid answer exists."
    ]
};

const starterCode = {
    python: `def two_sum(nums: list[int], target: int) -> list[int]:
    # Your code here
    pass

# Test your solution
print(two_sum([2, 7, 11, 15], 9))  # Expected: [0, 1]
`,
    javascript: `function twoSum(nums, target) {
    // Your code here
    
}

// Test your solution
console.log(twoSum([2, 7, 11, 15], 9));  // Expected: [0, 1]
`,
    typescript: `function twoSum(nums: number[], target: number): number[] {
    // Your code here
    
}

// Test your solution
console.log(twoSum([2, 7, 11, 15], 9));  // Expected: [0, 1]
`
};

interface TestResult {
    name: string;
    passed: boolean;
    input: string;
    expected: string;
    actual: string;
}

export default function CodingExercisePage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = use(params);
    const [language, setLanguage] = useState<"python" | "javascript" | "typescript">("python");
    const [code, setCode] = useState(starterCode.python);
    const [isRunning, setIsRunning] = useState(false);
    const [testResults, setTestResults] = useState<TestResult[]>([]);
    const [output, setOutput] = useState("");
    const [showOutputPanel, setShowOutputPanel] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(45 * 60); // 45 minutes
    const [showSubmitDialog, setShowSubmitDialog] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);

    // Timer countdown
    useEffect(() => {
        if (isCompleted) return;

        const timer = setInterval(() => {
            setTimeRemaining((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isCompleted]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    const handleLanguageChange = (lang: "python" | "javascript" | "typescript") => {
        setLanguage(lang);
        setCode(starterCode[lang]);
        setTestResults([]);
        setOutput("");
    };

    const handleReset = () => {
        setCode(starterCode[language]);
        setTestResults([]);
        setOutput("");
    };

    const runTests = async () => {
        setIsRunning(true);
        setShowOutputPanel(true); // Open panel
        setOutput("Running tests...\n");

        // Simulate test execution
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Mock test results
        const mockResults: TestResult[] = [
            {
                name: "Test Case 1",
                passed: true,
                input: "nums = [2,7,11,15], target = 9",
                expected: "[0, 1]",
                actual: "[0, 1]"
            },
            {
                name: "Test Case 2",
                passed: true,
                input: "nums = [3,2,4], target = 6",
                expected: "[1, 2]",
                actual: "[1, 2]"
            },
            {
                name: "Test Case 3",
                passed: false,
                input: "nums = [3,3], target = 6",
                expected: "[0, 1]",
                actual: "None"
            },
        ];

        setTestResults(mockResults);

        const passed = mockResults.filter(r => r.passed).length;
        setOutput(`Executed ${mockResults.length} tests\n${passed} passed, ${mockResults.length - passed} failed\n\nTime: 45ms`);
        setIsRunning(false);
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        setIsSubmitting(false);
        setShowSubmitDialog(false);
        setIsCompleted(true);
    };

    // Completed screen with demo redirect
    useEffect(() => {
        if (isCompleted) {
            const timer = setTimeout(() => {
                // Redirect to landing page (results are for HR only)
                window.location.href = "/";
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [isCompleted]);

    if (isCompleted) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <Card className="max-w-md w-full text-center shadow-lg border-t-4 border-t-green-600">
                    <CardContent className="pt-12 pb-12 space-y-6">
                        <div className="mx-auto p-4 bg-green-100 rounded-full w-fit animate-in zoom-in duration-500">
                            <CheckCircle2 className="h-12 w-12 text-green-600" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-slate-900">Interview Submitted Successfully!</h2>
                            <p className="text-slate-500">
                                We have sent a comprehensive report validation to <span className="font-semibold text-slate-700">candidate@example.com</span>
                            </p>
                        </div>

                        <div className="py-6">
                            <div className="flex items-center justify-center gap-2 text-sm text-blue-600 font-medium animate-pulse">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Taking you home...
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-lg p-4 text-xs text-slate-400 border border-slate-100">
                            Redirecting in 5 seconds
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col h-screen overflow-hidden">
            {/* Header */}
            <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Code2 className="h-5 w-5 text-blue-400" />
                        <h1 className="font-semibold text-white">{problemDescription.title}</h1>
                    </div>
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                        {problemDescription.difficulty}
                    </Badge>
                </div>

                <div className="flex items-center gap-4">
                    {/* Language Selector */}
                    <Select value={language} onValueChange={(v) => handleLanguageChange(v as any)}>
                        <SelectTrigger className="w-[140px] bg-slate-700 border-slate-600 text-white">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="python">Python</SelectItem>
                            <SelectItem value="javascript">JavaScript</SelectItem>
                            <SelectItem value="typescript">TypeScript</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Timer */}
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg font-mono font-bold ${timeRemaining < 300 ? "bg-red-500/20 text-red-400" : "bg-slate-700 text-slate-300"
                        }`}>
                        <Clock className="h-4 w-4" />
                        {formatTime(timeRemaining)}
                    </div>

                    <Button
                        variant="outline"
                        className="border-green-500/50 text-green-400 hover:bg-green-500/10"
                        onClick={() => setShowSubmitDialog(true)}
                    >
                        <Send className="mr-2 h-4 w-4" />
                        Submit All
                    </Button>
                </div>
            </header>

            {/* Main Content Split */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel - Problem Description */}
                <div className="w-[400px] bg-slate-800 border-r border-slate-700 overflow-y-auto">
                    <div className="p-4 text-slate-300">
                        <div className="flex items-center gap-2 mb-4 text-white font-semibold border-b border-slate-700 pb-2">
                            <FileText className="h-4 w-4" />
                            Description
                        </div>

                        <div className="prose prose-invert prose-sm max-w-none">
                            <p className="whitespace-pre-wrap">{problemDescription.description}</p>

                            <h4 className="text-white mt-6 mb-3">Examples</h4>
                            {problemDescription.examples.map((ex, i) => (
                                <div key={i} className="bg-slate-900/50 rounded-lg p-3 mb-3 text-sm">
                                    <p><strong className="text-slate-400">Input:</strong> <code>{ex.input}</code></p>
                                    <p><strong className="text-slate-400">Output:</strong> <code>{ex.output}</code></p>
                                    {ex.explanation && (
                                        <p className="text-slate-500 mt-1">{ex.explanation}</p>
                                    )}
                                </div>
                            ))}

                            <h4 className="text-white mt-6 mb-3">Constraints</h4>
                            <ul className="text-sm space-y-1">
                                {problemDescription.constraints.map((c, i) => (
                                    <li key={i} className="text-slate-400"><code>{c}</code></li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Right Panel - Code Editor + Bottom Output */}
                <div className="flex-1 flex flex-col relative">
                    {/* Code Editor Area */}
                    <div className={`flex-1 p-4 transition-all duration-300 ${showOutputPanel ? 'pb-[200px]' : ''}`}>
                        <textarea
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="w-full h-full bg-slate-950 text-slate-100 font-mono text-sm p-4 rounded-lg border border-slate-700 resize-none focus:outline-none focus:border-blue-500"
                            spellCheck={false}
                        />
                    </div>

                    {/* Bottom Floating Control Bar */}
                    <div className="absolute bottom-4 right-4 flex gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleReset}
                            className="bg-slate-800 text-slate-400 hover:text-white border border-slate-700"
                        >
                            <RotateCcw className="mr-2 h-3 w-3" />
                            Reset Code
                        </Button>
                        <Button
                            onClick={runTests}
                            disabled={isRunning}
                            className="bg-green-600 hover:bg-green-700 shadow-lg"
                        >
                            {isRunning ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Running...
                                </>
                            ) : (
                                <>
                                    <Play className="mr-2 h-4 w-4" />
                                    Run Tests
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Collapsible Output Panel */}
                    <div
                        className={`absolute bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 transition-all duration-300 ease-in-out flex flex-col ${showOutputPanel ? 'h-[250px]' : 'h-0 border-t-0'
                            }`}
                    >
                        {showOutputPanel && (
                            <>
                                <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
                                    <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                                        <Terminal className="h-4 w-4" />
                                        Test Results
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 hover:bg-slate-700"
                                        onClick={() => setShowOutputPanel(false)}
                                    >
                                        <X className="h-4 w-4 text-slate-400" />
                                    </Button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4">
                                    {testResults.length > 0 ? (
                                        <div className="space-y-3">
                                            {testResults.map((result, i) => (
                                                <div
                                                    key={i}
                                                    className={`rounded p-3 text-sm flex items-start gap-3 ${result.passed ? "bg-green-950/30 border border-green-900" : "bg-red-950/30 border border-red-900"
                                                        }`}
                                                >
                                                    {result.passed ? (
                                                        <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                                    ) : (
                                                        <XCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                                                    )}
                                                    <div className="space-y-1">
                                                        <div className={`font-medium ${result.passed ? "text-green-400" : "text-red-400"}`}>
                                                            {result.name}
                                                        </div>
                                                        <div className="text-xs text-slate-400 font-mono">
                                                            Input: {result.input}
                                                        </div>
                                                        {!result.passed && (
                                                            <div className="text-xs font-mono">
                                                                <span className="text-slate-500">Expected:</span> <span className="text-green-400">{result.expected}</span>
                                                                <span className="text-slate-500 ml-3">Actual:</span> <span className="text-red-400">{result.actual}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="mt-2 text-xs text-slate-500 font-mono">
                                                {output.split('\n').pop()}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-slate-400 font-mono text-sm">
                                            {output || "Run code to see output..."}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Submit Confirmation Dialog */}
            <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Submit Final Solution?</DialogTitle>
                        <DialogDescription>
                            This will submit both your AI interview and coding challenge.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="bg-slate-50 rounded-lg p-4 text-sm space-y-1">
                        <p><strong>Tests passed:</strong> {testResults.filter(r => r.passed).length} of {testResults.length}</p>
                        <p><strong>Time remaining:</strong> {formatTime(timeRemaining)}</p>
                    </div>
                    {testResults.length === 0 && (
                        <Alert className="bg-amber-50 border-amber-200">
                            <AlertCircle className="h-4 w-4 text-amber-600" />
                            <AlertDescription className="text-amber-700">
                                You haven&apos;t run any tests yet.
                            </AlertDescription>
                        </Alert>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                "Submit All"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
