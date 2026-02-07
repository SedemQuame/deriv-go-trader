'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';

interface DownloadUrls {
    windows: string | null;
    mac: string | null;
    linux: string | null;
}

function SuccessContent() {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get('session_id');
    const [downloadUrls, setDownloadUrls] = useState<DownloadUrls | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchDownloadUrls() {
            try {
                const res = await fetch('/api/downloads');
                const data = await res.json();

                if (res.ok) {
                    setDownloadUrls(data.urls);
                } else {
                    setError(data.error || 'Failed to load download links');
                }
            } catch (err) {
                setError('Failed to fetch download links');
            } finally {
                setLoading(false);
            }
        }

        fetchDownloadUrls();
    }, []);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
            <div className="p-8 rounded-2xl shadow-2xl max-w-lg w-full text-center" style={{ background: 'var(--background-secondary)', border: '1px solid var(--border)' }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(0, 167, 158, 0.15)', color: 'var(--success)' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h1 className="text-3xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>Payment Successful!</h1>
                <p className="mb-8" style={{ color: 'var(--foreground-secondary)' }}>
                    Thank you for your purchase.
                    {sessionId && (
                        <> Your session ID is <span className="font-mono text-xs p-1 rounded" style={{ background: 'var(--background-tertiary)' }}>{sessionId.slice(0, 10)}...</span></>
                    )}
                </p>

                {loading ? (
                    <div className="py-8">
                        <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full mx-auto" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }}></div>
                        <p className="mt-4" style={{ color: 'var(--foreground-secondary)' }}>Loading download links...</p>
                    </div>
                ) : error ? (
                    <div className="p-4 rounded-lg text-sm mb-4" style={{ background: 'rgba(255, 68, 79, 0.1)', border: '1px solid rgba(255, 68, 79, 0.2)', color: 'var(--error)' }}>
                        {error}. Please contact support.
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="font-semibold text-lg" style={{ color: 'var(--primary)' }}>Download your files:</p>

                        {downloadUrls?.windows && (
                            <a
                                href={downloadUrls.windows}
                                className="block w-full py-3 px-4 rounded-lg transition flex items-center justify-center gap-3 no-underline"
                                style={{ background: 'var(--background-tertiary)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                            >
                                <span className="text-xl">🪟</span>
                                <span>Download for Windows (.exe)</span>
                            </a>
                        )}

                        {downloadUrls?.mac && (
                            <a
                                href={downloadUrls.mac}
                                className="block w-full py-3 px-4 rounded-lg transition flex items-center justify-center gap-3 no-underline"
                                style={{ background: 'var(--background-tertiary)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                            >
                                <span className="text-xl">🍎</span>
                                <span>Download for Mac (.dmg)</span>
                            </a>
                        )}

                        {downloadUrls?.linux && (
                            <a
                                href={downloadUrls.linux}
                                className="block w-full py-3 px-4 rounded-lg transition flex items-center justify-center gap-3 no-underline"
                                style={{ background: 'var(--background-tertiary)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                            >
                                <span className="text-xl">🐧</span>
                                <span>Download for Linux (.AppImage)</span>
                            </a>
                        )}

                        {!downloadUrls?.windows && !downloadUrls?.mac && !downloadUrls?.linux && (
                            <div className="p-4 rounded-lg text-sm" style={{ background: 'rgba(255, 152, 0, 0.1)', border: '1px solid rgba(255, 152, 0, 0.2)', color: 'var(--warning)' }}>
                                Download links are being configured. Please check back shortly or contact support.
                            </div>
                        )}
                    </div>
                )}

                <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
                    <Link href="/" className="text-sm no-underline hover:opacity-80 transition" style={{ color: 'var(--foreground-muted)' }}>Return to Home</Link>
                </div>
            </div>
        </div>
    );
}

export default function Success() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
                <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }}></div>
            </div>
        }>
            <SuccessContent />
        </Suspense>
    );
}

