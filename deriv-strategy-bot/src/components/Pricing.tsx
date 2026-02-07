import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { Check, Zap } from 'lucide-react';

const features = [
  'Full Deriv API Integration',
  'All Pre-configured Strategies',
  'Risk Management Controls',
  '24/7 Automated Trading',
  'Setup Guides & Documentation',
  'Lifetime Updates Included',
];

export const Pricing = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const scrollToFaq = () => {
    const element = document.querySelector('#faq');
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="pricing" ref={ref} className="py-20 md:py-32 relative">
      <div className="section-container">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="heading-lg mb-4">Simple, One-Time Pricing</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Pay once, get lifetime access. No subscriptions, no hidden fees.
          </p>
        </motion.div>

        {/* Pricing Card */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-md mx-auto"
        >
          <div className="pricing-card p-8 relative">
            {/* Glow effect */}
            <div className="absolute -inset-px rounded-xl bg-gradient-to-b from-primary/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500" style={{ zIndex: -1 }} />
            
            {/* Badge */}
            <div className="flex justify-center mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Zap className="w-4 h-4" />
                One-Time Access
              </span>
            </div>

            {/* Price */}
            <div className="text-center mb-8">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-2xl font-medium text-muted-foreground">$</span>
                <span className="text-6xl font-bold tracking-tight">29</span>
                <span className="text-2xl font-medium text-muted-foreground">.99</span>
              </div>
              <p className="text-muted-foreground mt-2">Lifetime access + updates</p>
            </div>

            {/* Features */}
            <ul className="space-y-4 mb-8">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            {/* CTA Button */}
            <button className="w-full btn-primary text-base py-4 mb-4">
              Buy Now
            </button>

            {/* Secondary Link */}
            <button
              onClick={scrollToFaq}
              className="w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Questions? Read FAQ →
            </button>
          </div>

          {/* Guarantee */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-center text-sm text-muted-foreground mt-6"
          >
            ⚡ Instant access after purchase
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
};
