import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { UserPlus, Key, Play, ArrowRight } from 'lucide-react';

const steps = [
  {
    icon: UserPlus,
    number: '01',
    title: 'Create/Login to Deriv',
    description: 'Sign up for a Deriv account or log in to your existing one to get started.',
  },
  {
    icon: Key,
    number: '02',
    title: 'Generate API Token',
    description: 'Create an API token in your Deriv dashboard with the required permissions.',
  },
  {
    icon: Play,
    number: '03',
    title: 'Connect & Activate Bot',
    description: 'Enter your API token, configure your strategy, and activate automated trading.',
  },
];

export const HowItWorks = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="how-it-works" ref={ref} className="py-20 md:py-32 relative">
      <div className="section-container">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="heading-lg mb-4">How it Works</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Get started in minutes with a simple three-step process.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative"
            >
              <div className="glass-card p-8 h-full">
                {/* Step Number */}
                <span className="absolute top-4 right-4 text-5xl font-bold text-primary/10 font-mono">
                  {step.number}
                </span>
                
                {/* Icon */}
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <step.icon className="w-7 h-7 text-primary" />
                </div>
                
                {/* Content */}
                <h3 className="heading-md mb-3">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>

              {/* Connector Arrow (hidden on last item and mobile) */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                  <ArrowRight className="w-8 h-8 text-primary/30" />
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Control Note */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center text-sm text-muted-foreground max-w-xl mx-auto"
        >
          <span className="text-primary">Note:</span> You remain in full control of your funds. The bot trades via API permissions that you configure and can revoke at any time.
        </motion.p>
      </div>
    </section>
  );
};
