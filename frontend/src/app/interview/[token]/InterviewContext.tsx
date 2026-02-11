"use client";

import React, { createContext, useContext, useRef, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface InterviewContextType {
    isRecording: boolean;
    stream: MediaStream | null;
    startScreenShare: () => Promise<MediaStream | null>;
    stopScreenShare: () => void;
}

const InterviewContext = createContext<InterviewContextType | undefined>(undefined);

export function InterviewProvider({ children }: { children: React.ReactNode }) {
    const params = useParams();
    // Handle potential array of tokens (though unlikely in this route structure)
    const token = Array.isArray(params?.token) ? params.token[0] : params?.token as string;

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);

    const [isRecording, setIsRecording] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);

    const startRecording = (mediaStream: MediaStream) => {
        if (!mediaStream) return;
        if (isRecording) return;

        // Use a supported mimeType
        const mimeType = 'video/webm;codecs=vp8,opus';
        const options = MediaRecorder.isTypeSupported(mimeType) ? { mimeType } : {};

        try {
            const recorder = new MediaRecorder(mediaStream, options);
            mediaRecorderRef.current = recorder;
            recordedChunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    recordedChunksRef.current.push(e.data);
                }
            };

            recorder.onstop = async () => {
                const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
                if (blob.size > 0) {
                    const formData = new FormData();
                    formData.append('file', blob, 'recording.webm');
                    try {
                        toast.info("Uploading screen recording...");
                        await api.interviews.uploadRecording(token, formData);
                        toast.success("Screen recording saved successfully");
                    } catch (error) {
                        console.error("Failed to upload recording", error);
                        toast.error("Failed to save screen recording");
                    }
                }
                setIsRecording(false);
                recordedChunksRef.current = [];
            };

            recorder.start(1000);
            setIsRecording(true);
            console.log("Screen recording started via Context");
        } catch (err) {
            console.error("MediaRecorder error:", err);
            toast.error("Failed to start screen recording");
        }
    };

    const startScreenShare = async () => {
        try {
            if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
                const mediaStream = await navigator.mediaDevices.getDisplayMedia({ video: true });

                streamRef.current = mediaStream;
                setStream(mediaStream);

                // Handle user manually stopping share via browser UI
                mediaStream.getVideoTracks()[0].onended = () => {
                    toast.warning("Screen sharing stopped. It is required for the interview.");
                    stopScreenShare();
                };

                // Start recording automatically
                startRecording(mediaStream);

                return mediaStream;
            } else {
                toast.error("Screen sharing is not supported by your browser.");
                return null;
            }
        } catch (err) {
            console.error("Screen share error:", err);
            toast.error("Screen sharing is required to proceed.");
            return null;
        }
    };

    const stopScreenShare = () => {
        // Stop Recorder
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }

        // Stop Tracks
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
            setStream(null);
        }
    };

    // Cleanup on unmount (e.g. tab close)
    useEffect(() => {
        return () => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    return (
        <InterviewContext.Provider value={{ isRecording, stream, startScreenShare, stopScreenShare }}>
            {children}
        </InterviewContext.Provider>
    );
}

export function useInterview() {
    const context = useContext(InterviewContext);
    if (context === undefined) {
        throw new Error("useInterview must be used within an InterviewProvider");
    }
    return context;
}
