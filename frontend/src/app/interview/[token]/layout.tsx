"use client";

import { InterviewProvider } from "./InterviewContext";

export default function InterviewLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <InterviewProvider>
            {children}
        </InterviewProvider>
    );
}
