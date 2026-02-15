
import React, { useState, useEffect, useRef } from 'react';
import { AppState, Conlang, VocabularyWord } from './types';
import { Button } from './components/Button';
import { IpaPicker } from './components/IpaPicker';
import { PRESETS } from './constants';
import { generateLanguageCore, extendVocabulary, askLinguisticAssistant, translateText } from './services/geminiService';

type AssistantTab = 'chat' | 'translate' | 'vocab';

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
      pluralRule: '',
      tenseRule: '',
      adjectivePlacement: ''
    }
  });
  const [activeAssistantTab, setActiveAssistantTab] = useState<AssistantTab>('chat');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationInput, setTranslationInput] = useState('');
  const [translationResult, setTranslationResult] = useState<{translation: string, pronunciation: string, breakdown: string} | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [assistantQuery, setAssistantQuery] = useState('');
  const [assistantChat, setAssistantChat] = useState<{role: 'user' | 'assistant', text: string}[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [showPublishGuide, setShowPublishGuide] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('glossaforge_saved');
    if (saved) {
      try {
        setSavedLangs(JSON.parse(saved));
      } catch (e) {
        console.error("Corrupted local storage");
      }
    }

    const urlParams = new URLSearchParams(window.location.search);
    const sharedData = urlParams.get('share');
    if (sharedData) {
      try {
        // Handle potential unicode issues in base64
        const decoded = JSON.parse(decodeURIComponent(escape(atob(sharedData))));
        setCurrentLang(decoded);
        setAppState(AppState.EDITOR);
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (e) {
        console.error("Invalid share link data", e);
      }
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [assistantChat]);

  const saveToLocalStorage = (langs: Conlang[]) => {
    localStorage.setItem('glossaforge_saved', JSON.stringify(langs));
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
    setAssistantChat([]);
    setTranslationResult(null);
    setAppState(AppState.EDITOR);
    setError(null);
  };

  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    setCurrentLang(prev => ({
      ...prev,
      phonemes: preset.phonemes,
      vibe: preset.description
    }));
  };

  const handleGenerate = async () => {
    if (!currentLang.name) {
      setError("Please provide a name for your language first.");
      return;
    }
    if (!currentLang.phonemes || currentLang.phonemes.length === 0) {
      setError("Please select at least one IPA symbol to build your phonology.");
      return;
    }
    
    setError(null);
    setIsGenerating(true);
    try {
      const result = await generateLanguageCore(
        currentLang.name!,
        currentLang.vibe || 'A unique constructed language',
        currentLang.phonemes!
      );
      setCurrentLang(prev => ({
        ...prev,
        description: result.description,
        grammar: result.grammar,
        vocabulary: result.vocabulary
      }));
    } catch (err: any) {
      setError(err.message || "Linguistic engine error.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExtendVocabulary = async (theme: string = "general") => {
    if (isExtending) return;
    setIsExtending(true);
    try {
      const newWords = await extendVocabulary(currentLang, theme);
      setCurrentLang(prev => ({
        ...prev,
        vocabulary: [...(prev.vocabulary || []), ...newWords]
      }));
    } catch (err) {
      setError("Failed to generate new words.");
    } finally {
      setIsExtending(false);
    }
  };

  const handleTranslate = async () => {
    if (!translationInput.trim() || isTranslating) return;
    setIsTranslating(true);
    try {
      const result = await translateText(currentLang, translationInput);
      setTranslationResult(result);
    } catch (err) {
      setError("Translation engine failure.");
    } finally {
      setIsTranslating(false);
    }
  };

  const handleAskAssistant = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!assistantQuery.trim() || isAsking) return;

    const query = assistantQuery;
    setAssistantQuery('');
    setAssistantChat(prev => [...prev, { role: 'user', text: query }]);
    setIsAsking(true);

    try {
      const response = await askLinguisticAssistant(currentLang, query);
      setAssistantChat(prev => [...prev, { role: 'assistant', text: response }]);
    } catch (err) {
      setError("Assistant connection failed.");
    } finally {
      setIsAsking(false);
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

  // Fix: Added handleImportJson to allow loading saved projects from files
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setCurrentLang(json);
        setAppState(AppState.EDITOR);
        setError(null);
      } catch (err) {
        setError("Invalid JSON file formatting.");
      }
    };
    reader.readAsText(file);
  };

  // Fix: Added handleShare to generate a shareable URL containing the current language data
  const handleShare = () => {
    try {
      // Use escape/encodeURIComponent trick for unicode-safe base64
      const jsonStr = JSON.stringify(currentLang);
      const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
      const url = `${window.location.origin}${window.location.pathname}?share=${base64}`;
      
      navigator.clipboard.writeText(url).then(() => {
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 3000);
      });
    } catch (err) {
      setError("Failed to generate a shareable link.");
    }
  };

  const renderHome = () => (
    <div className="max-w-4xl mx-auto py-20 px-4 text-center">
      <div className="mb-8 inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-200">
        <i className="fa-solid fa-language text-4xl"></i>
      </div>
      <h1 className="text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">GlossaForge</h1>
      <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
        Professional Linguistic Engineering. Create complex conlangs with IPA precision and interactive AI intelligence.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button size="lg" onClick={handleStartNew}>
          <i className="fa-solid fa-plus mr-2"></i> New Project
        </Button>
        <Button size="lg" variant="outline" onClick={() => fileInputRef.current?.click()}>
          <i className="fa-solid fa-file-import mr-2"></i> Load JSON
        </Button>
        <input type="file" ref={fileInputRef} onChange={handleImportJson} className="hidden" accept=".json" />
      </div>
    </div>
  );

  const renderSaved = () => (
    <div className="max-w-6xl mx-auto py-12 px-4">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-slate-900">Project Library</h2>
        <Button variant="ghost" onClick={() => setAppState(AppState.HOME)}>Back Home</Button>
      </div>
      
      {savedLangs.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-slate-200">
          <p className="text-slate-500 mb-6">No projects saved locally yet.</p>
          <Button onClick={handleStartNew}>Start Your First Project</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedLangs.map(lang => (
            <div key={lang.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6 text-left">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-slate-900">{lang.name}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => { setCurrentLang(lang); setAppState(AppState.EDITOR); }} title="Edit" className="text-indigo-600 hover:text-indigo-800 p-1">
                      <i className="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button onClick={() => handleDelete(lang.id)} title="Delete" className="text-red-500 hover:text-red-700 p-1">
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </div>
                <p className="text-sm text-slate-500 mb-4 line-clamp-2 italic">"{lang.description}"</p>
                <div className="text-xs text-slate-400 mt-4 pt-4 border-t border-slate-100 flex justify-between">
                  <span>{lang.phonemes.length} Phonemes</span>
                  <span>{new Date(lang.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderEditor = () => (
    <div className="max-w-7xl mx-auto py-12 px-4">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Column: Sidebar Controls */}
        <div className="w-full lg:w-1/3 space-y-6">
          {/* Identity Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
              <i className="fa-solid fa-fingerprint text-indigo-500 mr-2"></i> Core Identity
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Language Name</label>
                <input 
                  type="text" 
                  value={currentLang.name} 
                  onChange={e => setCurrentLang(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Quenya" 
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Contextual Vibe</label>
                <textarea 
                  value={currentLang.vibe}
                  onChange={e => setCurrentLang(prev => ({ ...prev, vibe: e.target.value }))}
                  placeholder="Coastal explorers, underground miners..." 
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none transition-all"
                />
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <Button onClick={handleGenerate} loading={isGenerating} className="w-full">
                <i className="fa-solid fa-wand-magic-sparkles mr-2"></i> 
                {currentLang.vocabulary?.length ? 'Refine Engine' : 'Generate Core'}
              </Button>
              {currentLang.vocabulary?.length ? (
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="secondary" onClick={handleSaveLang}>
                    <i className="fa-solid fa-floppy-disk mr-2"></i> Save
                  </Button>
                  <Button variant="outline" onClick={handleShare} className={shareSuccess ? 'text-green-600 border-green-200 bg-green-50' : ''}>
                    <i className={`fa-solid ${shareSuccess ? 'fa-check' : 'fa-share-nodes'} mr-2`}></i> 
                    {shareSuccess ? 'Copied!' : 'Share'}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>

          {/* AI Lab Sidebar */}
          {currentLang.description && (
            <div className="bg-slate-900 text-white rounded-2xl shadow-xl overflow-hidden flex flex-col h-[600px] border border-slate-800">
              <div className="p-4 bg-slate-800/50 border-b border-slate-700">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <i className="fa-solid fa-microchip text-indigo-400"></i>
                  Linguistic Intelligence Lab
                </h3>
              </div>
              
              {/* Tabs */}
              <div className="flex border-b border-slate-700 text-xs">
                {(['chat', 'translate', 'vocab'] as AssistantTab[]).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveAssistantTab(tab)}
                    className={`flex-1 py-3 font-bold uppercase tracking-wider transition-colors ${activeAssistantTab === tab ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="flex-grow overflow-y-auto p-4 custom-scrollbar text-sm relative">
                {activeAssistantTab === 'chat' && (
                  <div className="space-y-4">
                    {assistantChat.length === 0 && (
                      <div className="text-center py-12 px-6">
                        <i className="fa-solid fa-comments text-3xl text-slate-700 mb-4"></i>
                        <p className="text-slate-400 italic">"How does my language handle plural nouns?"</p>
                      </div>
                    )}
                    {assistantChat.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] px-3 py-2 rounded-xl ${msg.role === 'user' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-200 border border-slate-700'}`}>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    {isAsking && <div className="text-slate-500 text-xs italic">Consultant is typing...</div>}
                    <div ref={chatEndRef} />
                  </div>
                )}

                {activeAssistantTab === 'translate' && (
                  <div className="space-y-4">
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">English Text</label>
                      <textarea 
                        value={translationInput}
                        onChange={e => setTranslationInput(e.target.value)}
                        className="w-full bg-transparent border-none outline-none resize-none text-white h-20"
                        placeholder="Type a sentence to see it in your conlang..."
                      />
                      <Button size="sm" onClick={handleTranslate} loading={isTranslating} className="w-full mt-2">Translate</Button>
                    </div>

                    {translationResult && (
                      <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                        <div className="bg-indigo-900/30 p-4 rounded-xl border border-indigo-500/30">
                           <p className="text-indigo-300 text-[10px] font-bold uppercase mb-1">Translation</p>
                           <p className="text-2xl font-black tracking-tight ipa-font">{translationResult.translation}</p>
                           <p className="text-slate-400 text-xs mt-1">/{translationResult.pronunciation}/</p>
                        </div>
                        <div className="text-slate-300 text-xs bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                           <p className="font-bold mb-1">Morphological Breakdown:</p>
                           {translationResult.breakdown}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeAssistantTab === 'vocab' && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-400">Expand your lexicon with specific thematic modules:</p>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { theme: 'Nature', icon: 'leaf' },
                        { theme: 'Technology', icon: 'microchip' },
                        { theme: 'Emotions', icon: 'heart' },
                        { theme: 'War & Conflict', icon: 'shield-halved' },
                        { theme: 'Daily Life', icon: 'house' }
                      ].map(item => (
                        <button
                          key={item.theme}
                          onClick={() => handleExtendVocabulary(item.theme)}
                          disabled={isExtending}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all group"
                        >
                          <span className="flex items-center gap-3">
                            <i className={`fa-solid fa-${item.icon} text-indigo-400`}></i>
                            {item.theme}
                          </span>
                          <i className="fa-solid fa-chevron-right text-slate-600 group-hover:translate-x-1 transition-transform"></i>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input Bar */}
              {activeAssistantTab === 'chat' && (
                <div className="p-4 bg-slate-800 border-t border-slate-700">
                  <form onSubmit={handleAskAssistant} className="flex gap-2">
                    <input 
                      type="text" 
                      value={assistantQuery}
                      onChange={e => setAssistantQuery(e.target.value)}
                      className="flex-grow bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-500"
                      placeholder="Ask the Linguistic Assistant..."
                    />
                    <button className="bg-indigo-600 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50">
                      <i className="fa-solid fa-arrow-up text-xs"></i>
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Dynamic Content */}
        <div className="w-full lg:w-2/3 space-y-8">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-6">1. Phonemic Foundation</h2>
            <IpaPicker 
              selected={currentLang.phonemes || []} 
              onChange={symbols => {
                setError(null);
                setCurrentLang(prev => ({ ...prev, phonemes: symbols }));
              }} 
            />
          </div>

          {currentLang.description ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
                <h2 className="text-xl font-bold text-slate-900 mb-4">2. Linguistic Blueprint</h2>
                <p className="text-slate-700 leading-relaxed italic border-l-4 border-indigo-200 pl-6 text-left text-lg">{currentLang.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                  <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-gears text-indigo-500"></i> Syntax & Logic
                  </h2>
                  <div className="space-y-4">
                    {[
                      { label: 'Word Order', value: currentLang.grammar?.wordOrder },
                      { label: 'Pluralization', value: currentLang.grammar?.pluralRule },
                      { label: 'Tense System', value: currentLang.grammar?.tenseRule },
                      { label: 'Adjective Position', value: currentLang.grammar?.adjectivePlacement }
                    ].map(item => (
                      <div key={item.label} className="group">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1 group-hover:text-indigo-400 transition-colors">{item.label}</span>
                        <span className="text-sm font-semibold text-slate-800">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                   <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-list-check text-indigo-500"></i> Lexicon Sample
                   </h2>
                   <div className="flex flex-wrap gap-2">
                     {currentLang.vocabulary?.slice(0, 15).map(word => (
                       <span key={word.id} className="px-3 py-1.5 bg-indigo-50/50 border border-indigo-100 rounded-full text-xs">
                         <span className="ipa-font font-bold text-indigo-700">{word.native}</span>
                         <span className="text-slate-400 mx-1">•</span>
                         {word.meaning}
                       </span>
                     ))}
                   </div>
                   {currentLang.vocabulary && currentLang.vocabulary.length > 15 && (
                     <div className="mt-4 text-[10px] text-slate-400 bg-slate-50 p-2 rounded text-center font-bold tracking-widest uppercase">
                       +{currentLang.vocabulary.length - 15} more in the database
                     </div>
                   )}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-bold text-slate-900">3. Master Dictionary</h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleExtendVocabulary('random')} loading={isExtending}>
                      <i className="fa-solid fa-plus mr-2"></i> Random Grow
                    </Button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-200 text-[10px] text-slate-400 uppercase font-black tracking-widest">
                        <th className="pb-4 w-1/3">Definition</th>
                        <th className="pb-4 w-1/3">Word</th>
                        <th className="pb-4 w-1/3">IPA Transcription</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {currentLang.vocabulary?.map(word => (
                        <tr key={word.id} className="group hover:bg-slate-50 transition-colors">
                          <td className="py-5 text-slate-900 font-bold text-sm tracking-tight">{word.meaning.toUpperCase()}</td>
                          <td className="py-5 font-black text-indigo-600 ipa-font text-3xl tracking-tighter">{word.native}</td>
                          <td className="py-5 text-slate-400 ipa-font font-medium text-lg italic">/{word.pronunciation}/</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className={`bg-white rounded-2xl p-24 text-center border-2 border-dashed border-slate-200 transition-all ${isGenerating ? 'opacity-50' : ''}`}>
              {isGenerating ? (
                <div className="flex flex-col items-center">
                   <div className="inline-block animate-spin h-16 w-16 border-8 border-indigo-500 border-t-transparent rounded-full mb-8"></div>
                   <h3 className="text-2xl font-black text-slate-900 mb-2">Generating Universal Grammar</h3>
                   <p className="text-slate-500 max-w-sm mx-auto">Deriving linguistic logic from your selected phonetic inventory...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-8 text-slate-200">
                    <i className="fa-solid fa-language text-5_xl"></i>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2">Awaiting Definition</h3>
                  <p className="text-slate-500 max-w-sm mx-auto">Provide a language name and select phonemes above to trigger the linguistic engine.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center cursor-pointer group" onClick={() => setAppState(AppState.HOME)}>
              <div className="bg-indigo-600 p-2.5 rounded-xl mr-3 shadow-lg shadow-indigo-100 group-hover:rotate-12 transition-all">
                <i className="fa-solid fa-language text-white text-xl"></i>
              </div>
              <div>
                <span className="text-2xl font-black text-slate-900 tracking-tighter block leading-none">GlossaForge</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 block">Linguistic Engineering Lab</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setAppState(AppState.SAVED)}>Library</Button>
              <Button variant="ghost" size="sm" onClick={() => setShowPublishGuide(true)}>Documentation</Button>
              <Button size="sm" onClick={handleStartNew} className="ml-4">New Project</Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow">
        {appState === AppState.HOME && renderHome()}
        {appState === AppState.SAVED && renderSaved()}
        {appState === AppState.EDITOR && renderEditor()}
      </main>

      {/* Fix: Added global error indicator */}
      {error && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-full shadow-2xl z-[100] flex items-center gap-3 animate-in fade-in slide-in-from-bottom-8">
          <i className="fa-solid fa-circle-exclamation"></i>
          <span className="text-sm font-bold">{error}</span>
          <button onClick={() => setError(null)} className="ml-2 hover:opacity-75">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      <footer className="bg-slate-900 text-slate-500 py-20 px-4 mt-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 text-left">
          <div className="col-span-1 md:col-span-2 space-y-6">
            <div className="flex items-center">
              <i className="fa-solid fa-language text-3xl text-indigo-400 mr-3"></i>
              <span className="text-2xl font-black text-white tracking-tighter">GlossaForge</span>
            </div>
            <p className="text-lg leading-relaxed max-w-md">
              Democratizing language construction through the fusion of linguistic theory and generative intelligence.
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="text-white font-bold uppercase tracking-widest text-xs">Phonology</h4>
            <ul className="text-sm space-y-2">
              <li><a href="#" className="hover:text-indigo-400 transition-colors">IPA Mapping</a></li>
              <li><a href="#" className="hover:text-indigo-400 transition-colors">Phonotactics Engine</a></li>
              <li><a href="#" className="hover:text-indigo-400 transition-colors">Acoustic Profiles</a></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="text-white font-bold uppercase tracking-widest text-xs">Intelligence</h4>
            <div className="flex items-center text-xs text-indigo-400 bg-indigo-500/10 self-start px-3 py-1 rounded-full border border-indigo-500/20">
              <span className="w-2 h-2 bg-indigo-500 rounded-full mr-2 animate-pulse"></span>
              Gemini 3 Flash Active
            </div>
            <p className="text-xs text-slate-600 mt-4 leading-relaxed">
              Real-time translation and morphology derivation powered by deep reasoning models.
            </p>
          </div>
        </div>
      </footer>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
        .ipa-font { font-family: 'Charis SIL', 'Doulos SIL', 'Gentium Plus', 'Segoe UI', serif; }
      `}</style>
    </div>
  );
};

export default App;
