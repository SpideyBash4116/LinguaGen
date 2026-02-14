
import React, { useState, useEffect } from 'react';
import { AppState, Conlang, VocabularyWord } from './types';
import { Button } from './components/Button';
import { IpaPicker } from './components/IpaPicker';
import { PRESETS } from './constants';
import { generateLanguageCore } from './services/geminiService';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.HOME);
  const [savedLangs, setSavedLangs] = useState<Conlang[]>([]);
  const [currentLang, setCurrentLang] = useState<Partial<Conlang>>({
    name: '',
    description: '',
    phonemes: [],
    vibe: '',
    vocabulary: [],
    grammar: {
      wordOrder: 'SVO',
      pluralRule: 'Suffix -s',
      tenseRule: 'Prefix re-',
      adjectivePlacement: 'Before noun'
    }
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('linguagen_saved');
    if (saved) {
      try {
        setSavedLangs(JSON.parse(saved));
      } catch (e) {
        console.error("Corrupted local storage");
      }
    }
  }, []);

  const saveToLocalStorage = (langs: Conlang[]) => {
    localStorage.setItem('linguagen_saved', JSON.stringify(langs));
  };

  const handleStartNew = () => {
    setCurrentLang({
      name: '',
      description: '',
      phonemes: [],
      vibe: '',
      vocabulary: [],
      grammar: {
        wordOrder: 'SVO',
        pluralRule: '',
        tenseRule: '',
        adjectivePlacement: ''
      }
    });
    setAppState(AppState.EDITOR);
  };

  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    setCurrentLang(prev => ({
      ...prev,
      phonemes: preset.phonemes,
      vibe: preset.description
    }));
  };

  const handleGenerate = async () => {
    if (!currentLang.name || currentLang.phonemes?.length === 0) {
      setError("Please provide a name and select some sounds first.");
      return;
    }
    setError(null);
    setIsGenerating(true);
    try {
      const result = await generateLanguageCore(
        currentLang.name!,
        currentLang.vibe || 'Generic fantasy language',
        currentLang.phonemes!
      );
      setCurrentLang(prev => ({
        ...prev,
        description: result.description,
        grammar: result.grammar,
        vocabulary: result.vocabulary
      }));
    } catch (err) {
      setError("Failed to generate language details. Please check your connection or API key.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveLang = () => {
    const newLang: Conlang = {
      ...(currentLang as Conlang),
      id: currentLang.id || Math.random().toString(36).substr(2, 9),
      createdAt: currentLang.createdAt || Date.now()
    };
    const updated = currentLang.id 
      ? savedLangs.map(l => l.id === newLang.id ? newLang : l)
      : [newLang, ...savedLangs];
    
    setSavedLangs(updated);
    saveToLocalStorage(updated);
    setAppState(AppState.SAVED);
  };

  const handleDelete = (id: string) => {
    const updated = savedLangs.filter(l => l.id !== id);
    setSavedLangs(updated);
    saveToLocalStorage(updated);
  };

  const renderHome = () => (
    <div className="max-w-4xl mx-auto py-20 px-4 text-center">
      <div className="mb-8 inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-200">
        <i className="fa-solid fa-language text-4xl"></i>
      </div>
      <h1 className="text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">LinguaGen</h1>
      <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
        The ultimate toolkit for linguistic world-building. Create fully functional constructed languages with the help of AI and the International Phonetic Alphabet.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button size="lg" onClick={handleStartNew}>
          <i className="fa-solid fa-plus mr-2"></i> Create New Language
        </Button>
        {savedLangs.length > 0 && (
          <Button size="lg" variant="outline" onClick={() => setAppState(AppState.SAVED)}>
            <i className="fa-solid fa-book mr-2"></i> View Saved ({savedLangs.length})
          </Button>
        )}
      </div>
    </div>
  );

  const renderSaved = () => (
    <div className="max-w-6xl mx-auto py-12 px-4">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-slate-900">Your Conlangs</h2>
        <Button variant="ghost" onClick={() => setAppState(AppState.HOME)}>Back Home</Button>
      </div>
      
      {savedLangs.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-slate-200">
          <p className="text-slate-500 mb-6">No languages created yet.</p>
          <Button onClick={handleStartNew}>Get Started</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedLangs.map(lang => (
            <div key={lang.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-slate-900">{lang.name}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => { setCurrentLang(lang); setAppState(AppState.EDITOR); }} className="text-indigo-600 hover:text-indigo-800 p-1">
                      <i className="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button onClick={() => handleDelete(lang.id)} className="text-red-500 hover:text-red-700 p-1">
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </div>
                <p className="text-sm text-slate-500 mb-4 line-clamp-2">{lang.description || 'No description provided.'}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {lang.phonemes.slice(0, 8).map(p => (
                    <span key={p} className="px-2 py-0.5 bg-slate-100 rounded text-xs ipa-font font-medium">{p}</span>
                  ))}
                  {lang.phonemes.length > 8 && <span className="text-xs text-slate-400">+{lang.phonemes.length - 8} more</span>}
                </div>
                <div className="text-xs text-slate-400">
                  Created {new Date(lang.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderEditor = () => (
    <div className="max-w-6xl mx-auto py-12 px-4">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Left Sidebar: Controls */}
        <div className="w-full md:w-1/3 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Basics</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Language Name</label>
                <input 
                  type="text" 
                  value={currentLang.name} 
                  onChange={e => setCurrentLang(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Quenya, Dothraki" 
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vibe / Description</label>
                <textarea 
                  value={currentLang.vibe}
                  onChange={e => setCurrentLang(prev => ({ ...prev, vibe: e.target.value }))}
                  placeholder="e.g. A harsh desert language used by warriors" 
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Linguistic Presets</h2>
            <div className="space-y-2">
              {PRESETS.map(preset => (
                <button
                  key={preset.name}
                  onClick={() => handleApplyPreset(preset)}
                  className="w-full text-left p-3 rounded-lg border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all group"
                >
                  <div className="font-semibold text-slate-800 group-hover:text-indigo-700">{preset.name}</div>
                  <div className="text-xs text-slate-500">{preset.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button onClick={handleGenerate} loading={isGenerating} size="lg">
              <i className="fa-solid fa-wand-magic-sparkles mr-2"></i> 
              {currentLang.vocabulary?.length ? 'Regenerate Details' : 'Generate Details'}
            </Button>
            <Button variant="outline" onClick={() => setAppState(AppState.HOME)}>Cancel</Button>
            {currentLang.vocabulary?.length ? (
               <Button variant="secondary" onClick={handleSaveLang}>
                  <i className="fa-solid fa-floppy-disk mr-2"></i> Save Language
               </Button>
            ) : null}
          </div>
          {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
        </div>

        {/* Right Content: IPA & Output */}
        <div className="w-full md:w-2/3 space-y-8">
          
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">1. Select Phonemes (IPA)</h2>
              <span className="text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                {currentLang.phonemes?.length} symbols selected
              </span>
            </div>
            <IpaPicker 
              selected={currentLang.phonemes || []} 
              onChange={symbols => setCurrentLang(prev => ({ ...prev, phonemes: symbols }))} 
            />
          </div>

          {currentLang.description && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 mb-8">
                <h2 className="text-xl font-bold text-slate-900 mb-4">2. Description & History</h2>
                <p className="text-slate-700 leading-relaxed italic">{currentLang.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                  <h2 className="text-lg font-bold text-slate-900 mb-4">Grammar Rules</h2>
                  <div className="space-y-3">
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-sm text-slate-500">Word Order</span>
                      <span className="text-sm font-bold text-slate-900">{currentLang.grammar?.wordOrder}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-sm text-slate-500">Plurals</span>
                      <span className="text-sm font-bold text-slate-900">{currentLang.grammar?.pluralRule}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-sm text-slate-500">Tense</span>
                      <span className="text-sm font-bold text-slate-900">{currentLang.grammar?.tenseRule}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Adjectives</span>
                      <span className="text-sm font-bold text-slate-900">{currentLang.grammar?.adjectivePlacement}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                   <h2 className="text-lg font-bold text-slate-900 mb-4">Lexicon Overview</h2>
                   <p className="text-sm text-slate-600">Generated base vocabulary: <strong>{currentLang.vocabulary?.length} words</strong></p>
                   <div className="mt-4 flex flex-wrap gap-2">
                     {currentLang.vocabulary?.slice(0, 6).map(word => (
                       <span key={word.id} className="px-2 py-1 bg-slate-50 border border-slate-100 rounded text-xs">
                         <span className="ipa-font font-bold text-indigo-700">{word.native}</span>: {word.meaning}
                       </span>
                     ))}
                   </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold text-slate-900 mb-6">3. Vocabulary Dictionary</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="pb-3 font-semibold text-slate-600">Meaning</th>
                        <th className="pb-3 font-semibold text-slate-600">Native</th>
                        <th className="pb-3 font-semibold text-slate-600">IPA Pronunciation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentLang.vocabulary?.map(word => (
                        <tr key={word.id}>
                          <td className="py-4 text-slate-900 font-medium uppercase tracking-tight text-sm">{word.meaning}</td>
                          <td className="py-4 font-bold text-indigo-600 ipa-font text-xl">{word.native}</td>
                          <td className="py-4 text-slate-500 ipa-font">/{word.pronunciation}/</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {!currentLang.description && !isGenerating && (
            <div className="bg-slate-100 rounded-2xl p-12 text-center border-2 border-dashed border-slate-200">
              <i className="fa-solid fa-robot text-4xl text-slate-300 mb-4"></i>
              <p className="text-slate-500">Select your sounds and click "Generate" to see your language come to life.</p>
            </div>
          )}

          {isGenerating && (
             <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-200">
               <div className="inline-block animate-spin h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full mb-4"></div>
               <h3 className="text-lg font-bold text-slate-900 mb-2">Analyzing Phonemes...</h3>
               <p className="text-slate-500">Our AI linguist is building your grammar rules and vocabulary.</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center cursor-pointer" onClick={() => setAppState(AppState.HOME)}>
              <i className="fa-solid fa-language text-2xl text-indigo-600 mr-2"></i>
              <span className="text-xl font-black text-slate-900 tracking-tighter">LinguaGen</span>
            </div>
            <div className="hidden sm:flex items-center space-x-4">
              <Button variant="ghost" onClick={() => setAppState(AppState.SAVED)}>My Languages</Button>
              <Button size="sm" onClick={handleStartNew}>New Project</Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="pb-20">
        {appState === AppState.HOME && renderHome()}
        {appState === AppState.SAVED && renderSaved()}
        {appState === AppState.EDITOR && renderEditor()}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-4 border-t border-slate-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center">
            <i className="fa-solid fa-language text-xl text-indigo-400 mr-2"></i>
            <span className="text-lg font-bold text-white tracking-tighter">LinguaGen</span>
          </div>
          <div className="text-sm">
            &copy; 2026 LinguaGen Laboratory. Powered by Gemini.
          </div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white transition-colors"><i className="fa-brands fa-github"></i></a>
            <a href="#" className="hover:text-white transition-colors"><i className="fa-brands fa-twitter"></i></a>
            <a href="#" className="hover:text-white transition-colors"><i className="fa-solid fa-book-open"></i></a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
