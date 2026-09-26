import React, { useState, useEffect } from 'react';
import { studentService, FAQItem } from '../../services/studentService';
import {
  HelpCircle,
  Mail,
  Phone,
  Clock,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  FileQuestion,
  CreditCard,
  Video,
  RefreshCw,
} from 'lucide-react';

export const HelpPage: React.FC = () => {
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    async function loadFaqs() {
      try {
        const res = await studentService.getFaqs();
        if (res.success && res.data) {
          setFaqs(res.data);
          if (res.data.length > 0) {
            setOpenFaqId(res.data[0].id);
          }
        }
      } finally {
        setLoading(false);
      }
    }
    loadFaqs();
  }, []);

  const categories = ['All', ...Array.from(new Set(faqs.map((f) => f.category)))];

  const filteredFaqs =
    selectedCategory === 'All'
      ? faqs
      : faqs.filter((f) => f.category === selectedCategory);

  const toggleFaq = (id: string) => {
    setOpenFaqId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Help & Support Center
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Find answers to frequently asked questions or reach out to institute academic support.
        </p>
      </div>

      {/* Support Contact Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-start space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-brand-600 flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Email Support</h4>
            <p className="text-sm font-bold text-slate-900 mt-0.5">support@institute.edu</p>
            <p className="text-xs text-slate-400 mt-0.5">Response within 24 hours</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-start space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Phone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Academic Helpline</h4>
            <p className="text-sm font-bold text-slate-900 mt-0.5">+91 1800-123-4567</p>
            <p className="text-xs text-slate-400 mt-0.5">Mon–Sat, 9AM to 7PM IST</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-start space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Live Doubt Clearing</h4>
            <p className="text-sm font-bold text-slate-900 mt-0.5">Daily Live Sessions</p>
            <p className="text-xs text-slate-400 mt-0.5">Check Live Classes tab</p>
          </div>
        </div>
      </div>

      {/* SECTION 24: FAQ SECTION */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-2">
            <FileQuestion className="w-5 h-5 text-brand-600" />
            <h3 className="text-lg font-bold text-slate-900">Frequently Asked Questions</h3>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${selectedCategory === cat
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-brand-600 mb-2" />
            <p className="text-xs">Loading FAQs...</p>
          </div>
        ) : filteredFaqs.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">No FAQs found under this category.</p>
        ) : (
          <div className="space-y-3">
            {filteredFaqs.map((faq) => {
              const isOpen = openFaqId === faq.id;
              return (
                <div
                  key={faq.id}
                  className="rounded-2xl border border-slate-200/80 overflow-hidden transition-colors hover:border-slate-300"
                >
                  <button
                    onClick={() => toggleFaq(faq.id)}
                    className="w-full flex items-center justify-between p-4 sm:p-5 text-left bg-white hover:bg-slate-50/80 transition-colors focus:outline-none"
                  >
                    <span className="text-sm sm:text-base font-bold text-slate-900 pr-4">
                      {faq.question}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="w-5 h-5 text-brand-600 shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-sm text-slate-600 leading-relaxed bg-slate-50/50 border-t border-slate-100">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
