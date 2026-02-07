import { NextResponse } from 'next/server';

/**
 * API route to get download URLs at runtime.
 * This solves the issue of NEXT_PUBLIC_* vars being baked in at build time.
 * The URLs are read from server-side environment variables.
 */
export async function GET() {
    // Check for both naming conventions (with and without NEXT_PUBLIC_ prefix)
    const downloadUrls = {
        windows: process.env.DOWNLOAD_URL_WINDOWS || process.env.NEXT_PUBLIC_DOWNLOAD_URL_WINDOWS || null,
        mac: process.env.DOWNLOAD_URL_MAC || process.env.NEXT_PUBLIC_DOWNLOAD_URL_MAC || null,
        linux: process.env.DOWNLOAD_URL_LINUX || process.env.NEXT_PUBLIC_DOWNLOAD_URL_LINUX || null,
    };

    // Check if any URLs are configured
    const hasUrls = Object.values(downloadUrls).some(url => url !== null);

    if (!hasUrls) {
        return NextResponse.json(
            { error: 'Download URLs not configured', urls: downloadUrls },
            { status: 503 }
        );
    }

    return NextResponse.json({ urls: downloadUrls });
}
