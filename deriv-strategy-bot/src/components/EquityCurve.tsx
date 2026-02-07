import { motion } from 'framer-motion';

export const EquityCurve = () => {
  // Simulated equity curve path (upward trending with some volatility)
  const pathData = "M 0 80 Q 20 75 40 70 T 80 55 T 120 45 T 160 50 T 200 35 T 240 25 T 280 30 T 320 15";
  
  return (
    <div className="relative w-full h-20 overflow-hidden">
      {/* Grid lines */}
      <svg className="absolute inset-0 w-full h-full opacity-20">
        {[0, 1, 2, 3, 4].map((i) => (
          <line
            key={`h-${i}`}
            x1="0"
            y1={i * 20}
            x2="100%"
            y2={i * 20}
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-border"
          />
        ))}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <line
            key={`v-${i}`}
            x1={i * 40}
            y1="0"
            x2={i * 40}
            y2="100%"
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-border"
          />
        ))}
      </svg>
      
      {/* Equity curve */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 320 100" preserveAspectRatio="none">
        {/* Gradient fill under the curve */}
        <defs>
          <linearGradient id="curveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Fill area */}
        <motion.path
          d={`${pathData} L 320 100 L 0 100 Z`}
          fill="url(#curveGradient)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
        />
        
        {/* Main line */}
        <motion.path
          d={pathData}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeLinecap="round"
          className="animate-chart-draw"
        />
        
        {/* Glow effect */}
        <motion.path
          d={pathData}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.3"
          filter="blur(4px)"
          className="animate-chart-draw"
        />
      </svg>
      
      {/* Current value dot */}
      <motion.div
        className="absolute right-2 top-3 w-2 h-2 rounded-full bg-primary"
        initial={{ scale: 0 }}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{ boxShadow: '0 0 10px hsl(var(--primary))' }}
      />
    </div>
  );
};
