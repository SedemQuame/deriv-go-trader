'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DownloadUrls {
    windows: string | null;
    mac: string | null;
    linux: string | null;
}

export default function Recover() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [verified, setVerified] = useState(false);
    const [error, setError] = useState('');
    const [downloadUrls, setDownloadUrls] = useState<DownloadUrls | null>(null);
    const [urlsLoading, setUrlsLoading] = useState(false);

    const handleRecover = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setVerified(false);

        try {
            const res = await fetch('/api/recover', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();

            if (res.ok && data.valid) {
                setVerified(true);
                // Fetch download URLs after verification
                fetchDownloadUrls();
            } else {
                setError(data.message || 'Verification failed');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const fetchDownloadUrls = async () => {
        setUrlsLoading(true);
        try {
            const res = await fetch('/api/downloads');
            const data = await res.json();

            if (res.ok) {
                setDownloadUrls(data.urls);
            }
        } catch (err) {
            console.error('Failed to fetch download URLs');
        } finally {
            setUrlsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 font-sans" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
            <div className="p-8 rounded-2xl shadow-2xl max-w-lg w-full" style={{ background: 'var(--background-secondary)', border: '1px solid var(--border)' }}>
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>Recover Purchase</h1>
                    <p style={{ color: 'var(--foreground-secondary)' }}>Enter the email you used during checkout to access your downloads.</p>
                </div>

                {!verified ? (
                    <form onSubmit={handleRecover} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground-secondary)' }}>Email Address</label>
                            <input
                                type="email"
                                id="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg focus:ring-2 focus:outline-none"
                                style={{
                                    background: 'var(--background)',
                                    border: '1px solid var(--border)',
                                    color: 'var(--foreground)',
                                }}
                                placeholder="name@example.com"
                            />
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg text-sm text-center" style={{ background: 'rgba(255, 68, 79, 0.1)', border: '1px solid rgba(255, 68, 79, 0.2)', color: 'var(--error)' }}>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full font-bold py-3 px-6 rounded-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                                background: 'var(--primary)',
                                color: 'var(--primary-text)',
                            }}
                        >
                            {loading ? 'Verifying...' : 'Find My Purchase'}
                        </button>
                    </form>
                ) : (
                    <div className="space-y-6 animate-fade-in">
                        <div className="p-4 rounded-lg text-center font-medium" style={{ background: 'rgba(0, 167, 158, 0.1)', border: '1px solid rgba(0, 167, 158, 0.2)', color: 'var(--success)' }}>
                            Purchase Verified!
                        </div>

                        {urlsLoading ? (
                            <div className="py-4 text-center">
                                <div className="animate-spin w-6 h-6 border-2 border-t-transparent rounded-full mx-auto" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }}></div>
                                <p className="mt-2 text-sm" style={{ color: 'var(--foreground-secondary)' }}>Loading downloads...</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="font-semibold text-lg text-center" style={{ color: 'var(--primary)' }}>Download your files:</p>

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
                                    <div className="p-4 rounded-lg text-sm text-center" style={{ background: 'rgba(255, 152, 0, 0.1)', border: '1px solid rgba(255, 152, 0, 0.2)', color: 'var(--warning)' }}>
                                        Download links are being configured. Please check back shortly or contact support.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <div className="mt-8 pt-6 text-center" style={{ borderTop: '1px solid var(--border)' }}>
                    <Link href="/" className="text-sm no-underline hover:opacity-80 transition" style={{ color: 'var(--foreground-muted)' }}>Return to Home</Link>
                </div>
            </div>
        </div>
    );
}

