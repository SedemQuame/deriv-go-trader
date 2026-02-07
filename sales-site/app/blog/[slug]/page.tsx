import { getBlogPost, getBlogPosts } from '../../lib/blog';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

interface Props {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata(
    { params }: Props,
): Promise<Metadata> {
    const { slug } = await params;
    const post = await getBlogPost(slug);

    if (!post) {
        return {
            title: 'Post Not Found',
        };
    }

    return {
        title: `${post.title} | Deriv Go Trader`,
        description: post.description,
        openGraph: {
            title: post.title,
            description: post.description,
            type: 'article',
            publishedTime: post.date,
            authors: ['Deriv Go Trader Team'],
        },
        twitter: {
            card: 'summary_large_image',
            title: post.title,
            description: post.description,
        },
    };
}

// Generate static params for all blog posts at build time
export async function generateStaticParams() {
    const posts = await getBlogPosts();
    return posts.map((post) => ({
        slug: post.slug,
    }));
}

export default async function BlogPost({ params }: Props) {
    const { slug } = await params;
    const post = await getBlogPost(slug);

    if (!post) {
        notFound();
    }

    return (
        <article className="min-h-screen font-sans flex flex-col" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
            {/* Navigation */}
            <nav className="border-b sticky top-0 z-50 backdrop-blur-md" style={{ borderColor: 'var(--border)', background: 'var(--background-nav)' }}>
                <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition no-underline">
                        <span className="w-8 h-8 rounded flex items-center justify-center text-white font-bold text-sm" style={{ background: 'var(--deriv-red)' }}>D</span>
                        <span className="font-bold text-lg" style={{ color: 'var(--foreground)' }}>Deriv Go Trader</span>
                    </Link>
                    <Link href="/" className="text-sm hover:opacity-80 transition" style={{ color: 'var(--foreground-secondary)' }}>
                        ← Back to Home
                    </Link>
                </div>
            </nav>

            <main className="flex-grow container max-w-4xl mx-auto px-6 py-12">
                <header className="mb-10 text-center">
                    <div className="text-sm mb-4" style={{ color: 'var(--primary)' }}>
                        {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight" style={{ color: 'var(--foreground)' }}>
                        {post.title}
                    </h1>
                    <p className="text-xl max-w-2xl mx-auto leading-relaxed" style={{ color: 'var(--foreground-secondary)' }}>
                        {post.description}
                    </p>
                </header>

                <div
                    className="prose prose-lg mx-auto prose-invert"
                    style={{
                        '--tw-prose-body': 'var(--foreground-secondary)',
                        '--tw-prose-headings': 'var(--foreground)',
                        '--tw-prose-links': 'var(--primary)',
                        '--tw-prose-bold': 'var(--foreground)',
                        '--tw-prose-counters': 'var(--primary)',
                        '--tw-prose-bullets': 'var(--primary)',
                        '--tw-prose-hr': 'var(--border)',
                        '--tw-prose-quotes': 'var(--foreground-secondary)',
                        '--tw-prose-quote-borders': 'var(--primary)',
                        '--tw-prose-captions': 'var(--foreground-muted)',
                        '--tw-prose-code': 'var(--foreground)',
                        '--tw-prose-pre-code': 'var(--foreground)',
                        '--tw-prose-pre-bg': 'var(--background-secondary)',
                    } as React.CSSProperties}
                >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {post.content}
                    </ReactMarkdown>
                </div>
            </main>

            <footer className="py-8 text-center text-sm border-t mt-12" style={{ color: 'var(--foreground-muted)', borderColor: 'var(--border)', background: 'var(--background)' }}>
                <div className="max-w-4xl mx-auto px-6">
                    <p>&copy; {new Date().getFullYear()} Deriv Trader Tooling. All rights reserved.</p>
                </div>
            </footer>
        </article>
    );
}
