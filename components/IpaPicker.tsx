
import React from 'react';
import { PULMONIC_CONSONANTS, NON_PULMONIC, VOWELS, DIACRITICS, TONES_STRESS, EXT_IPA } from '../constants';

interface IpaPickerProps {
  selected: string[];
  onChange: (symbols: string[]) => void;
}

export const IpaPicker: React.FC<IpaPickerProps> = ({ selected, onChange }) => {
  const toggleSymbol = (symbol: string) => {
    if (selected.includes(symbol)) {
      onChange(selected.filter(s => s !== symbol));
    } else {
      onChange([...selected, symbol]);
    }
  };

  const Section = ({ title, items, cols = "grid-cols-6 sm:grid-cols-10 md:grid-cols-12" }: { title: string, items: any[], cols?: string }) => (
    <div className="mb-10">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center">
        <span className="mr-3 h-px bg-slate-200 flex-grow"></span>
        {title}
        <span className="ml-3 h-px bg-slate-200 flex-grow"></span>
      </h3>
      <div className={`grid ${cols} gap-1.5`}>
        {items.map(item => (
          <button
            key={item.symbol}
            onClick={() => toggleSymbol(item.symbol)}
            title={`${item.description} (e.g. ${item.example})`}
            className={`h-11 w-full flex items-center justify-center rounded border transition-all ipa-font text-lg
              ${selected.includes(item.symbol) 
                ? 'bg-indigo-600 border-indigo-700 text-white shadow-sm scale-105 z-10' 
                : 'bg-white border-slate-200 hover:border-indigo-300 text-slate-700 hover:bg-indigo-50'}`}
          >
            {item.symbol}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
      <Section title="Pulmonic Consonants" items={PULMONIC_CONSONANTS} />
      <Section title="Non-Pulmonic & Clicks" items={NON_PULMONIC} cols="grid-cols-6 sm:grid-cols-8 md:grid-cols-10" />
      <Section title="Vowels" items={VOWELS} cols="grid-cols-6 sm:grid-cols-8 md:grid-cols-10" />
      <Section title="extIPA & Rare Extensions" items={EXT_IPA} cols="grid-cols-6 sm:grid-cols-10 md:grid-cols-12" />
      <Section title="Diacritics & Modifiers" items={DIACRITICS} cols="grid-cols-6 sm:grid-cols-10 md:grid-cols-12" />
      <Section title="Stress & Tones" items={TONES_STRESS} cols="grid-cols-4 sm:grid-cols-7" />
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
};
