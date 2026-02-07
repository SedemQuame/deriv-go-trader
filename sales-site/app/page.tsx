import { ThemeToggle } from './components/ThemeToggle';
import { CheckoutButton, CheckoutButtonFull } from './components/CheckoutButton';
import { getBlogPosts } from './lib/blog';
import { pricing } from './lib/pricing';
import Link from 'next/link';

export default async function Home() {
  const posts = await getBlogPosts();
  const recentPosts = posts.slice(0, 4);

  return (
    <div className="min-h-screen font-sans" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      {/* Navbar */}
      <nav className="border-b sticky top-0 z-50 backdrop-blur-md" style={{ borderColor: 'var(--border)', background: 'var(--background-nav)' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded flex items-center justify-center text-white font-bold text-sm" style={{ background: 'var(--deriv-red)' }}>D</span>
            <span className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Deriv Go Trader</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex gap-6 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
              <a href="#features" className="hover:opacity-80 transition" style={{ color: 'var(--foreground-secondary)' }}>Features</a>
              <a href="#guides" className="hover:opacity-80 transition" style={{ color: 'var(--foreground-secondary)' }}>Guides</a>
              <a href="#pricing" className="hover:opacity-80 transition" style={{ color: 'var(--foreground-secondary)' }}>Pricing</a>
              <a href="/recover" className="hover:opacity-80 transition" style={{ color: 'var(--foreground-secondary)' }}>Restore Purchase</a>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </nav>


      {/* Hero */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Text Content */}
            <div className="text-center lg:text-left">
              <div className="inline-block mb-6 px-4 py-1.5 rounded-full" style={{ background: 'rgba(255, 68, 79, 0.1)', border: '1px solid rgba(255, 68, 79, 0.3)' }}>
                <span style={{ color: 'var(--deriv-red)' }} className="text-sm font-medium">🚀 Powered by Deriv API</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight" style={{ color: 'var(--foreground)' }}>
                Automate Your Trading <br />With Precision
              </h1>
              <p className="text-lg mb-10 leading-relaxed" style={{ color: 'var(--foreground-secondary)' }}>
                The ultimate desktop trading bot for Deriv. Advanced strategies, real-time analytics, and cross-platform performance on Windows, Mac, and Linux.
              </p>
              <CheckoutButton />
              <p className="mt-4 text-xs" style={{ color: 'var(--foreground-muted)' }}>One-time payment. Instant download.</p>

              {/* Platform Badges */}
              <div className="flex gap-4 mt-8 justify-center lg:justify-start flex-wrap">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--background-secondary)', border: '1px solid var(--border)' }}>
                  <span className="text-xl">🪟</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--foreground-secondary)' }}>Windows</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--background-secondary)', border: '1px solid var(--border)' }}>
                  <span className="text-xl">🍎</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--foreground-secondary)' }}>macOS</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--background-secondary)', border: '1px solid var(--border)' }}>
                  <span className="text-xl">🐧</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--foreground-secondary)' }}>Linux</span>
                </div>
              </div>
            </div>

            {/* Right Column - App Screenshot */}
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl" style={{ border: '1px solid var(--border)' }}>
                <img
                  src="/images/blog/light-mode.jpg"
                  alt="Deriv Go Trader Desktop Application Interface"
                  className="w-full h-auto"
                  style={{ display: 'block' }}
                />
                {/* Floating Badge */}
                <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full backdrop-blur-md" style={{ background: 'rgba(75, 180, 179, 0.9)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                  <span className="text-white text-xs font-semibold">✓ Live Dashboard</span>
                </div>
              </div>

              {/* Decorative Elements */}
              <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full blur-2xl opacity-50 pointer-events-none" style={{ background: 'var(--primary)' }}></div>
              <div className="absolute -top-6 -left-6 w-32 h-32 rounded-full blur-2xl opacity-30 pointer-events-none" style={{ background: 'var(--deriv-red)' }}></div>
            </div>
          </div>
        </div>
        {/* Ambient Background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
          <div className="absolute top-20 left-10 w-96 h-96 rounded-full blur-3xl" style={{ background: 'rgba(75, 180, 179, 0.08)' }}></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full blur-3xl" style={{ background: 'rgba(255, 68, 79, 0.05)' }}></div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24" style={{ background: 'var(--background-secondary)' }}>
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-4" style={{ color: 'var(--foreground)' }}>Why Professional Traders Choose Us</h2>
          <p className="text-center mb-16" style={{ color: 'var(--foreground-secondary)' }}>Built for traders who demand precision and reliability</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: 'Smart Martingale', desc: 'Secure capital with our intelligent, risk-capped Martingale logic.', icon: '📊' },
              { title: 'Trailing Stop Loss', desc: 'Lock in profits automatically as the market moves in your favor.', icon: '🎯' },
              { title: 'Cross-Platform', desc: 'Native performance on Windows, macOS, and Linux.', icon: '💻' },
              { title: 'Real-time Analytics', desc: 'Live charts and performance metrics right on your dashboard.', icon: '📈' },
              { title: 'Secure & Local', desc: 'Your data and API tokens never leave your machine.', icon: '🔒' },
              { title: 'Strategy Builder', desc: 'Customize indicators and signals to fit your unique style.', icon: '⚙️' }
            ].map((f, i) => (
              <div
                key={i}
                className="p-6 rounded-xl transition group"
                style={{
                  background: 'var(--background-tertiary)',
                  border: '1px solid var(--border)',
                }}
              >
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 text-2xl transition"
                  style={{ background: 'rgba(0, 167, 158, 0.1)' }}
                >{f.icon}</div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground)' }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--foreground-secondary)' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Guides Section */}
      <section id="guides" className="py-24" style={{ background: 'var(--background)' }}>
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-4" style={{ color: 'var(--foreground)' }}>Guides & Resources</h2>
          <p className="text-center mb-16" style={{ color: 'var(--foreground-secondary)' }}>Learn how to get the most out of automated trading.</p>

          <div className="grid md:grid-cols-2 gap-8">
            {recentPosts.map((post) => (
              <Link href={`/blog/${post.slug}`} key={post.slug} className="group no-underline block h-full">
                <article
                  className="p-8 rounded-2xl h-full transition-all duration-300 hover:-translate-y-1"
                  style={{
                    background: 'var(--background-secondary)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div className="text-xs font-semibold mb-3" style={{ color: 'var(--primary)' }}>
                    {new Date(post.date).toLocaleDateString()}
                  </div>
                  <h3 className="text-xl font-bold mb-3 group-hover:text-[var(--primary)] transition-colors" style={{ color: 'var(--foreground)' }}>
                    {post.title}
                  </h3>
                  <p className="leading-relaxed mb-4" style={{ color: 'var(--foreground-secondary)' }}>
                    {post.description}
                  </p>
                  <span className="text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all" style={{ color: 'var(--primary)' }}>
                    Read Guide <span>→</span>
                  </span>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="pricing" className="py-24 border-t" style={{ background: 'var(--background-secondary)', borderColor: 'var(--border)' }}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>Ready to upgrade your trading?</h2>
          <p className="mb-8" style={{ color: 'var(--foreground-secondary)' }}>Join hundreds of traders using Deriv Go Trader today.</p>
          <div className="inline-block p-8 rounded-2xl" style={{ background: 'var(--background-tertiary)', border: '1px solid var(--border)' }}>
            <div className="text-5xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>{pricing.display}</div>
            <div className="text-sm mb-6" style={{ color: 'var(--foreground-muted)' }}>Lifetime access • All platforms</div>
            <CheckoutButtonFull />
          </div>
        </div>
      </section>

      <footer className="py-8 text-center text-sm border-t" style={{ color: 'var(--foreground-muted)', borderColor: 'var(--border)', background: 'var(--background)' }}>
        &copy; {new Date().getFullYear()} Deriv Trader Tooling. All rights reserved.
      </footer>
    </div>
  );
}

