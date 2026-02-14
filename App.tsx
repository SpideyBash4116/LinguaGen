
import React, { useState, useEffect, useRef } from 'react';
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
  const [shareSuccess, setShareSuccess] = useState(false);
  const [showPublishGuide, setShowPublishGuide] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check for saved data
    const saved = localStorage.getItem('glossaforge_saved');
    if (saved) {
      try {
        setSavedLangs(JSON.parse(saved));
      } catch (e) {
        console.error("Corrupted local storage");
      }
    }

    // Check for Deep Link
    const urlParams = new URLSearchParams(window.location.search);
    const sharedData = urlParams.get('share');
    if (sharedData) {
      try {
        const decoded = JSON.parse(atob(sharedData));
        setCurrentLang(decoded);
        setAppState(AppState.EDITOR);
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (e) {
        console.error("Invalid share link data");
      }
    }
  }, []);

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
    if (!currentLang.name || (currentLang.phonemes?.length || 0) === 0) {
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
      setError("AI Generation error. Please check your API key configuration.");
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

  const handleExportJson = () => {
    if (!currentLang.name) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentLang));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${currentLang.name.toLowerCase()}_lingua.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportJson = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        setCurrentLang(json);
        setAppState(AppState.EDITOR);
      } catch (err) {
        setError("Invalid language file.");
      }
    };
    reader.readAsText(file);
  };

  const handleShare = () => {
    try {
      const serialized = btoa(JSON.stringify(currentLang));
      const shareUrl = `${window.location.origin}${window.location.pathname}?share=${serialized}`;
      navigator.clipboard.writeText(shareUrl);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2000);
    } catch (e) {
      console.error("Failed to generate share link", e);
    }
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
      <h1 className="text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">GlossaForge</h1>
      <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
        Linguistic engineering made easy. Construct languages with IPA precision and AI-driven logic.
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
      
      <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-8 text-left">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-200 transition-colors">
          <i className="fa-solid fa-microphone text-indigo-500 mb-4 text-xl"></i>
          <h3 className="font-bold text-slate-800 mb-2">Phonetic Design</h3>
          <p className="text-sm text-slate-500">Pick from over 100 IPA sounds, including clicks and ejectives.</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-200 transition-colors">
          <i className="fa-solid fa-sparkles text-indigo-500 mb-4 text-xl"></i>
          <h3 className="font-bold text-slate-800 mb-2">AI Generation</h3>
          <p className="text-sm text-slate-500">Gemini builds rules for syntax, morphology, and basic vocabulary.</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-200 transition-colors">
          <i className="fa-solid fa-share-nodes text-indigo-500 mb-4 text-xl"></i>
          <h3 className="font-bold text-slate-800 mb-2">Universal Links</h3>
          <p className="text-sm text-slate-500">Share your entire language via a single encoded URL.</p>
        </div>
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
    <div className="max-w-6xl mx-auto py-12 px-4">
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Left Sidebar */}
        <div className="w-full lg:w-1/3 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Core Identity</h2>
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
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Vibe / Context</label>
                <textarea 
                  value={currentLang.vibe}
                  onChange={e => setCurrentLang(prev => ({ ...prev, vibe: e.target.value }))}
                  placeholder="Harsh mountain dwellers, ancient elves..." 
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Phonology Presets</h2>
            <div className="grid grid-cols-1 gap-2">
              {PRESETS.map(preset => (
                <button
                  key={preset.name}
                  onClick={() => handleApplyPreset(preset)}
                  className="w-full text-left p-3 rounded-lg border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all group"
                >
                  <div className="font-bold text-slate-700 group-hover:text-indigo-700">{preset.name}</div>
                  <div className="text-xs text-slate-500">{preset.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button onClick={handleGenerate} loading={isGenerating} size="lg" className="w-full">
              <i className="fa-solid fa-wand-magic-sparkles mr-2"></i> 
              {currentLang.vocabulary?.length ? 'Re-Generate' : 'Generate Language'}
            </Button>
            
            {currentLang.vocabulary?.length ? (
              <div className="grid grid-cols-2 gap-3">
                <Button variant="secondary" onClick={handleSaveLang}>
                  <i className="fa-solid fa-floppy-disk mr-2"></i> Save
                </Button>
                <Button variant="outline" onClick={handleExportJson}>
                  <i className="fa-solid fa-download mr-2"></i> Export
                </Button>
              </div>
            ) : null}
            <Button variant="ghost" onClick={() => setAppState(AppState.HOME)}>Exit</Button>
          </div>
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
              <i className="fa-solid fa-circle-exclamation mr-2"></i> {error}
            </div>
          )}
        </div>

        {/* Right Content */}
        <div className="w-full lg:w-2/3 space-y-8">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">1. Phonemic Inventory</h2>
              <div className="flex gap-4 items-center">
                 <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                  {currentLang.phonemes?.length} Sounds
                </span>
                <button onClick={handleShare} className={`text-sm font-semibold transition-colors flex items-center ${shareSuccess ? 'text-green-600' : 'text-slate-400 hover:text-indigo-600'}`}>
                   <i className={`fa-solid ${shareSuccess ? 'fa-check' : 'fa-share-nodes'} mr-2`}></i>
                   {shareSuccess ? 'Link Copied!' : 'Copy Share URL'}
                </button>
              </div>
            </div>
            <IpaPicker 
              selected={currentLang.phonemes || []} 
              onChange={symbols => setCurrentLang(prev => ({ ...prev, phonemes: symbols }))} 
            />
          </div>

          {currentLang.description ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold text-slate-900 mb-4">2. Linguistic Profile</h2>
                <p className="text-slate-700 leading-relaxed italic border-l-4 border-indigo-200 pl-4 text-left">{currentLang.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                  <h2 className="text-lg font-bold text-slate-900 mb-4">Syntactic Rules</h2>
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
                   <h2 className="text-lg font-bold text-slate-900 mb-4">Lexicon Sample</h2>
                   <div className="flex flex-wrap gap-2">
                     {currentLang.vocabulary?.slice(0, 12).map(word => (
                       <span key={word.id} className="px-2 py-1 bg-slate-50 border border-slate-100 rounded text-xs">
                         <span className="ipa-font font-bold text-indigo-700">{word.native}</span>: {word.meaning}
                       </span>
                     ))}
                   </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold text-slate-900 mb-6">3. Dictionary</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs text-slate-400 uppercase font-bold tracking-wider">
                        <th className="pb-4">Concept</th>
                        <th className="pb-4">Native</th>
                        <th className="pb-4">IPA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentLang.vocabulary?.map(word => (
                        <tr key={word.id} className="group hover:bg-slate-50 transition-colors">
                          <td className="py-4 text-slate-900 font-semibold text-sm uppercase tracking-tighter">{word.meaning}</td>
                          <td className="py-4 font-bold text-indigo-600 ipa-font text-2xl">{word.native}</td>
                          <td className="py-4 text-slate-500 ipa-font font-medium">/{word.pronunciation}/</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className={`bg-white rounded-2xl p-16 text-center border-2 border-dashed border-slate-200 transition-all ${isGenerating ? 'opacity-50' : ''}`}>
              {isGenerating ? (
                <div className="flex flex-col items-center">
                   <div className="inline-block animate-spin h-12 w-12 border-4 border-indigo-500 border-t-transparent rounded-full mb-6"></div>
                   <h3 className="text-xl font-bold text-slate-900 mb-2">Engaging Neural Linguistics...</h3>
                   <p className="text-slate-500 max-w-sm mx-auto">Gemini is analyzing your phonemes and generating logical grammar rules.</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-6 text-slate-300">
                    <i className="fa-solid fa-microchip text-3xl"></i>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Ready to Build</h3>
                  <p className="text-slate-500 max-w-sm mx-auto">Configure your sound inventory and name your language to begin generation.</p>
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
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center cursor-pointer group" onClick={() => setAppState(AppState.HOME)}>
              <div className="bg-indigo-600 p-2 rounded-lg mr-3 shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-language text-white text-lg"></i>
              </div>
              <span className="text-xl font-black text-slate-900 tracking-tighter">GlossaForge</span>
            </div>
            <div className="hidden md:flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={() => setAppState(AppState.SAVED)}>Library</Button>
              <Button variant="ghost" size="sm" onClick={() => setShowPublishGuide(true)}>Deployment Tips</Button>
              <Button size="sm" onClick={handleStartNew} className="ml-4">Start Project</Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow">
        {appState === AppState.HOME && renderHome()}
        {appState === AppState.SAVED && renderSaved()}
        {appState === AppState.EDITOR && renderEditor()}
      </main>

      {showPublishGuide && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-md w-full overflow-hidden animate-in zoom-in-95 duration-200 max-w-md">
            <div className="p-8">
              <div className="flex justify-between items-center mb-8 text-left">
                <h3 className="text-2xl font-extrabold text-slate-900">Publishing Help</h3>
                <button onClick={() => setShowPublishGuide(false)} className="text-slate-400 hover:text-slate-600 bg-slate-50 w-10 h-10 rounded-full flex items-center justify-center transition-colors">
                  <i className="fa-solid fa-times text-lg"></i>
                </button>
              </div>
              <div className="space-y-6 text-left">
                <div className="flex gap-4">
                  <div className="bg-indigo-100 text-indigo-600 w-10 h-10 rounded-xl flex items-center justify-center font-bold flex-shrink-0">1</div>
                  <div>
                    <h4 className="font-bold text-slate-800">Use a Build Step</h4>
                    <p className="text-sm text-slate-500 mt-1">Netlify needs standard JavaScript. Use a tool like <b>Vite</b> to compile these files before uploading.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="bg-indigo-100 text-indigo-600 w-10 h-10 rounded-xl flex items-center justify-center font-bold flex-shrink-0">2</div>
                  <div>
                    <h4 className="font-bold text-slate-800">Environment Keys</h4>
                    <p className="text-sm text-slate-500 mt-1">Set your <code>API_KEY</code> in the Netlify dashboard under &quot;Site settings &gt; Environment variables&quot;.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="bg-indigo-100 text-indigo-600 w-10 h-10 rounded-xl flex items-center justify-center font-bold flex-shrink-0">3</div>
                  <div>
                    <h4 className="font-bold text-slate-800">Share your App</h4>
                    <p className="text-sm text-slate-500 mt-1">Once deployed, your Netlify link will work perfectly with the Share Link feature!</p>
                  </div>
                </div>
              </div>
              <div className="mt-10">
                <Button className="w-full py-4 rounded-2xl text-lg font-bold shadow-xl shadow-indigo-100" onClick={() => setShowPublishGuide(false)}>Got it!</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="bg-slate-900 text-slate-400 py-16 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 text-left">
          <div className="space-y-4">
            <div className="flex items-center">
              <i className="fa-solid fa-language text-2xl text-indigo-400 mr-3"></i>
              <span className="text-xl font-bold text-white tracking-tighter">GlossaForge</span>
            </div>
            <p className="text-sm leading-relaxed">
              Professional tools for linguistic worldbuilding. Built with passion for writers, game designers, and conlangers.
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="text-white font-bold uppercase tracking-widest text-xs">Resources</h4>
            <ul className="text-sm space-y-2">
              <li><a href="https://www.internationalphoneticassociation.org/" target="_blank" rel="noopener" className="hover:text-indigo-400 transition-colors">IPA Official Site</a></li>
              <li><a href="https://github.com" target="_blank" rel="noopener" className="hover:text-indigo-400 transition-colors">Developer API</a></li>
              <li><a href="#" onClick={(e) => {e.preventDefault(); setShowPublishGuide(true);}} className="hover:text-indigo-400 transition-colors">Deployment Documentation</a></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="text-white font-bold uppercase tracking-widest text-xs">System Status</h4>
            <div className="flex items-center text-xs text-green-400 bg-green-400/10 self-start px-3 py-1 rounded-full border border-green-400/20">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-2 animate-pulse"></span>
              Gemini AI Engine Online
            </div>
            <p className="text-xs text-slate-500 mt-4">
              Version 2.1.0 • Running on React 19 + Gemini 3
            </p>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-16 pt-8 border-t border-slate-800 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
          <span>&copy; 2026 GlossaForge Laboratory. All rights reserved.</span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white"><i className="fa-brands fa-github text-lg"></i></a>
            <a href="#" className="hover:text-white"><i className="fa-brands fa-discord text-lg"></i></a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
