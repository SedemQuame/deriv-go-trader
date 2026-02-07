import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    question: 'Is this financial advice?',
    answer: 'No. Deriv Auto Trader is a software tool that executes trades based on predefined logic. It does not provide financial advice, recommendations, or personalized investment guidance. You are solely responsible for your trading decisions.',
  },
  {
    question: 'Do you guarantee profits?',
    answer: 'No. Trading involves significant risk, and past performance does not guarantee future results. The bot executes trades systematically, but market conditions are unpredictable. Never trade with money you cannot afford to lose.',
  },
  {
    question: 'How does the bot connect to Deriv?',
    answer: 'The bot connects via the official Deriv API using an API token that you generate from your Deriv account dashboard. This token grants specific permissions for trading, and you can revoke it at any time.',
  },
  {
    question: 'What do I need to start?',
    answer: 'You need a funded Deriv account and an API token with trading permissions. After purchase, you\'ll receive access to the bot software and detailed setup guides to get started.',
  },
  {
    question: 'Can I stop it anytime?',
    answer: 'Yes. You have full control over the bot. You can pause, stop, or modify its operation at any time. You can also revoke the API token from your Deriv dashboard to immediately cut off access.',
  },
  {
    question: 'Is there a demo mode?',
    answer: 'Yes. Deriv offers demo accounts with virtual funds. You can connect the bot to a demo account to test strategies without risking real money before going live.',
  },
];

export const FAQ = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="faq" ref={ref} className="py-20 md:py-32 relative">
      <div className="section-container">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="heading-lg mb-4">Frequently Asked Questions</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Common questions about Deriv Auto Trader.
          </p>
        </motion.div>

        {/* Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-3xl mx-auto"
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="glass-card px-6 border-none"
              >
                <AccordionTrigger className="text-left font-medium hover:no-underline py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};
