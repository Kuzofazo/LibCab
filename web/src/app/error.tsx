"use client";

import { useEffect } from "react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white text-center">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-500 max-w-md mb-8">
                We encountered an error while loading this page. This might be due to a recent update or a temporary issue.
            </p>
            <div className="flex gap-4">
                <button
                    onClick={() => reset()}
                    className="px-8 py-4 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-900 transition-all"
                >
                    Try again
                </button>
                <button
                    onClick={() => window.location.href = "/"}
                    className="px-8 py-4 bg-gray-100 text-gray-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                    Go Home
                </button>
            </div>
            {process.env.NODE_ENV === "development" && (
                <pre className="mt-12 text-left p-6 bg-gray-50 rounded-2xl text-xs overflow-auto max-w-3xl text-red-500 font-mono">
                    {error.message}
                    {error.stack}
                </pre>
            )}
        </div>
    );
}
