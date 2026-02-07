import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { 
  Plug, 
  Layers, 
  ShieldCheck, 
  RefreshCcw, 
  BookOpen, 
  Download 
} from 'lucide-react';

const features = [
  {
    icon: Plug,
    title: 'Deriv API Integration',
    description: 'Seamless connection to your Deriv account using their official API for secure, reliable trading.',
  },
  {
    icon: Layers,
    title: 'Pre-configured Strategies',
    description: 'Choose from multiple trading strategies optimized for different market conditions and volatility levels.',
  },
  {
    icon: ShieldCheck,
    title: 'Risk Parameters & Stop Rules',
    description: 'Set maximum loss limits, position sizes, and automatic stop conditions to protect your capital.',
  },
  {
    icon: RefreshCcw,
    title: '24/7 Automated Execution',
    description: 'The bot monitors markets and executes trades around the clock without manual intervention.',
  },
  {
    icon: BookOpen,
    title: 'Clear Setup Guides',
    description: 'Step-by-step documentation and video tutorials to help you configure everything correctly.',
  },
  {
    icon: Download,
    title: 'Updates Included',
    description: 'Receive ongoing improvements, new strategies, and compatibility updates at no extra cost.',
  },
];

export const Features = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="features" ref={ref} className="py-20 md:py-32 relative">
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent" />
      
      <div className="section-container relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="heading-lg mb-4">Features</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Everything you need for systematic, automated trading on Deriv.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="feature-card"
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              
              {/* Content */}
              <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
