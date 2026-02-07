import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { Clock, RefreshCcw, Layers } from 'lucide-react';

const stats = [
  {
    icon: Clock,
    value: '~10 mins',
    label: 'Setup time',
    description: 'Quick configuration',
  },
  {
    icon: RefreshCcw,
    value: '24/7',
    label: 'Automation',
    description: 'Continuous execution',
  },
  {
    icon: Layers,
    value: 'Multiple',
    label: 'Strategies',
    description: 'Preset configurations',
  },
];

export const SocialProof = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className="py-20 relative">
      <div className="section-container">
        {/* Stats Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="glass-card p-6 text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <stat.icon className="w-6 h-6 text-primary" />
              </div>
              <p className="text-3xl font-bold mb-1 font-mono">{stat.value}</p>
              <p className="font-medium mb-1">{stat.label}</p>
              <p className="text-sm text-muted-foreground">{stat.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Compatibility Note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="glass-card p-6 text-center max-w-2xl mx-auto"
        >
          <p className="text-muted-foreground text-sm leading-relaxed">
            <span className="text-foreground font-medium">Built on Deriv infrastructure.</span>{' '}
            This trading bot is designed to work seamlessly with the Deriv API, leveraging their robust trading platform for reliable order execution and market data.
          </p>
        </motion.div>
      </div>
    </section>
  );
};
