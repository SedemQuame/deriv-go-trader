import { motion } from 'framer-motion';
import { DashboardMockup } from './DashboardMockup';
import { Shield, Zap, Settings, BookOpen } from 'lucide-react';

const trustItems = [
  { icon: Zap, label: 'Built for Deriv API' },
  { icon: Shield, label: 'Secure Connection' },
  { icon: Settings, label: 'Risk Controls' },
  { icon: BookOpen, label: 'Step-by-step Setup' },
];

export const Hero = () => {
  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen pt-20 md:pt-24 overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 grid-pattern opacity-50" />
      
      {/* Gradient Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-glow-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-glow-pulse" style={{ animationDelay: '1.5s' }} />

      <div className="section-container relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center min-h-[calc(100vh-6rem)] py-12">
          {/* Left Content */}
          <div className="order-2 lg:order-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="heading-xl mb-6 animate-gradient-text">
                Automated Algorithmic Trading on Deriv — Built for 24/7 Execution
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-lg text-muted-foreground mb-8 leading-relaxed max-w-xl"
            >
              Connect your Deriv account securely and activate systematic strategies that trade based on predefined logic — not emotions.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4 mb-10"
            >
              <button
                onClick={() => scrollToSection('#pricing')}
                className="btn-primary text-base"
              >
                Get Access
              </button>
              <button
                onClick={() => scrollToSection('#how-it-works')}
                className="btn-secondary text-base"
              >
                How it works
              </button>
            </motion.div>

            {/* Trust Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-4"
            >
              {trustItems.map((item, index) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <item.icon className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-xs sm:text-sm">{item.label}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right Content - Dashboard Mockup */}
          <div className="order-1 lg:order-2 flex justify-center lg:justify-end">
            <DashboardMockup />
          </div>
        </div>
      </div>
    </section>
  );
};
