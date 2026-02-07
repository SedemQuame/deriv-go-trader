import { motion } from 'framer-motion';
import { EquityCurve } from './EquityCurve';
import { Activity, Zap, BarChart3, ExternalLink } from 'lucide-react';

export const DashboardMockup = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.3 }}
      className="glass-card p-6 w-full max-w-sm animate-float"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold text-sm">Trading Bot</h4>
            <p className="text-xs text-muted-foreground">Deriv API</p>
          </div>
        </div>
        <div className="status-badge">Active</div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-secondary/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-muted-foreground">Strategy</span>
          </div>
          <p className="font-semibold text-sm">Volatility 75</p>
        </div>
        <div className="bg-secondary/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-muted-foreground">Today's Trades</span>
          </div>
          <p className="font-semibold text-sm font-mono">24</p>
        </div>
      </div>

      {/* Equity Curve */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Equity Curve</span>
          <span className="text-xs font-mono text-primary">+12.4%</span>
        </div>
        <div className="bg-secondary/30 rounded-lg p-2">
          <EquityCurve />
        </div>
      </div>

      {/* CTA Button */}
      <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-sm font-medium">
        View Setup Guide
        <ExternalLink className="w-4 h-4" />
      </button>
    </motion.div>
  );
};
