'use client';

import React, { useEffect, useState } from 'react';
import Script from 'next/script';

interface GoogleSignInButtonProps {
    onSuccess: (token: string, user: any) => void;
    onError?: (error: string) => void;
    role?: 'RIDER' | 'DRIVER';
}

export default function GoogleSignInButton({ onSuccess, onError, role = 'RIDER' }: GoogleSignInButtonProps) {
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Expose a global callback for the Google Identity Services script
        (window as any).handleGoogleCallback = async (response: any) => {
            setLoading(true);
            try {
                const res = await fetch('/api/auth/google', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idToken: response.credential, role })
                });

                const data = await res.json();
                if (res.ok) {
                    onSuccess(data.token, data.user);
                } else {
                    if (onError) onError(data.error || 'Google login failed');
                }
            } catch (error) {
                console.error('Google Sign-In Exception:', error);
                if (onError) onError('A network error occurred');
            } finally {
                setLoading(false);
            }
        };

        return () => {
            delete (window as any).handleGoogleCallback;
        };
    }, [onSuccess, onError, role]);

    return (
        <div className="w-full flex justify-center mt-4">
            <Script src="https://accounts.google.com/gsi/client" strategy="lazyOnload" />
            <div
                id="g_id_onload"
                data-client_id={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID"}
                data-context="signin"
                data-ux_mode="popup"
                data-callback="handleGoogleCallback"
                data-auto_prompt="false"
            ></div>

            <div
                className="g_id_signin"
                data-type="standard"
                data-shape="pill"
                data-theme="outline"
                data-text="continue_with"
                data-size="large"
                data-logo_alignment="left"
            ></div>
            
            {loading && <p className="text-xs text-center text-gray-500 mt-2">Authenticating...</p>}
        </div>
    );
}
