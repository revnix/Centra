"use client";

import React, { useState } from "react";
import { Upload, Check, Loader2, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface DocumentUploaderProps {
    label: string;
    description: string;
    value?: string;
    onUpload: (url: string) => void;
}

export function DocumentUploader({ label, description, value, onUpload }: DocumentUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Simulate upload
        setUploading(true);
        setProgress(0);
        
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 95) {
                    clearInterval(interval);
                    return 95;
                }
                return prev + 5;
            });
        }, 100);

        setTimeout(() => {
            clearInterval(interval);
            setProgress(100);
            setTimeout(() => {
                setUploading(false);
                const mockUrl = `https://evalyn-storage.mock/${file.name.replace(/\s/g, '_')}`;
                onUpload(mockUrl);
                toast.success(`${label} uploaded successfully`);
            }, 500);
        }, 2500);
    };

    return (
        <div className="p-4 border rounded-xl bg-white/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                        {value ? <Check className="w-4 h-4 text-green-500" /> : <FileText className="w-4 h-4 text-slate-400" />}
                        {label}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">{description}</p>
                </div>
                
                {!value && !uploading && (
                    <div className="relative">
                        <input
                            type="file"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            onChange={handleFileChange}
                            accept=".pdf,.jpg,.jpeg,.png"
                        />
                        <Button variant="outline" size="sm" className="gap-2">
                            <Upload className="w-3.5 h-3.5" />
                            Upload
                        </Button>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {uploading && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-4 pt-4 border-t space-y-2 overflow-hidden"
                    >
                        <div className="flex justify-between text-[10px] font-medium text-slate-500">
                            <span>Processing document...</span>
                            <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-1" />
                    </motion.div>
                )}

                {value && !uploading && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-4 pt-4 border-t flex items-center justify-between text-xs text-slate-600 bg-slate-50/50 -mx-4 -mb-4 p-4 rounded-b-xl"
                    >
                        <span className="truncate max-w-[200px] flex items-center gap-1.5 font-medium">
                            <Check className="w-3 h-3 text-green-500" />
                            {value.split('/').pop()}
                        </span>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 text-slate-400 hover:text-red-500"
                            onClick={() => onUpload("")}
                        >
                            <X className="w-3.5 h-3.5" />
                            Replace
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
