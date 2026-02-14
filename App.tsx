
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
    const saved = localStorage.getItem('linguagen_saved');
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
      <h1 className="text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">LinguaGen</h1>
      <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
        Constructed languages made professional. Pick sounds from the full IPA inventory and let AI build your grammar, lexicon, and history.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button size="lg" onClick={handleStartNew}>
          <i className="fa-solid fa-plus mr-2"></i> New Language
        </Button>
        <Button size="lg" variant="outline" onClick={() => fileInputRef.current?.click()}>
          <i className="fa-solid fa-file-import mr-2"></i> Import File
        </Button>
        <input type="file" ref={fileInputRef} onChange={handleImportJson} className="hidden" accept=".json" />
      </div>
      
      <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8 text-left">
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <i className="fa-solid fa-ear-listen text-indigo-500 mb-4 text-xl"></i>
          <h3 className="font-bold text-slate-800 mb-2">IPA Phonetics</h3>
          <p className="text-sm text-slate-500">Access the full IPA & extIPA inventory, including clicks, ejectives, and complex diacritics.</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <i className="fa-solid fa-brain text-indigo-500 mb-4 text-xl"></i>
          <h3 className="font-bold text-slate-800 mb-2">AI Modeling</h3>
          <p className="text-sm text-slate-500">Gemini analyzes your sound choices to generate logical word orders, plural rules, and vocabulary.</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <i className="fa-solid fa-globe text-indigo-500 mb-4 text-xl"></i>
          <h3 className="font-bold text-slate-800 mb-2">Deep Linking</h3>
          <p className="text-sm text-slate-500">Share your creation with a single URL. Every sound and rule is encoded in the link.</p>
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
          <p className="text-slate-500 mb-6">Your library is currently empty.</p>
          <Button onClick={handleStartNew}>Create Your First Language</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedLangs.map(lang => (
            <div key={lang.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
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
                <p className="text-sm text-slate-500 mb-4 line-clamp-2">{lang.description || 'No description provided.'}</p>
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
                  placeholder="e.g. Quenya" 
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Concept/Vibe</label>
                <textarea 
                  value={currentLang.vibe}
                  onChange={e => setCurrentLang(prev => ({ ...prev, vibe: e.target.value }))}
                  placeholder="Describe the mood or speakers..." 
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
              {currentLang.vocabulary?.length ? 'Regenerate' : 'Generate'}
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
            <Button variant="ghost" onClick={() => setAppState(AppState.HOME)}>Exit Editor</Button>
          </div>
          {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
        </div>

        {/* Right Content */}
        <div className="w-full md:w-2/3 space-y-8">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Phonemic Inventory</h2>
              <div className="flex gap-4 items-center">
                 <span className="text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                  {currentLang.phonemes?.length} symbols
                </span>
                <button onClick={handleShare} className={`text-sm font-semibold transition-colors ${shareSuccess ? 'text-green-600' : 'text-slate-400 hover:text-indigo-600'}`}>
                   <i className={`fa-solid ${shareSuccess ? 'fa-check' : 'fa-share-nodes'} mr-1`}></i>
                   {shareSuccess ? 'Copied Link!' : 'Copy Share Link'}
                </button>
              </div>
            </div>
            <IpaPicker 
              selected={currentLang.phonemes || []} 
              onChange={symbols => setCurrentLang(prev => ({ ...prev, phonemes: symbols }))} 
            />
          </div>

          {currentLang.description && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold text-slate-900 mb-4">Linguistic Profile</h2>
                <p className="text-slate-700 leading-relaxed italic border-l-4 border-indigo-200 pl-4">{currentLang.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                  <h2 className="text-lg font-bold text-slate-900 mb-4">Grammar</h2>
                  <div className="space-y-3">
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-sm text-slate-500">Order</span>
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
                   <h2 className="text-lg font-bold text-slate-900 mb-4">Core Lexicon</h2>
                   <div className="flex flex-wrap gap-2">
                     {currentLang.vocabulary?.slice(0, 10).map(word => (
                       <span key={word.id} className="px-2 py-1 bg-slate-50 border border-slate-100 rounded text-xs">
                         <span className="ipa-font font-bold text-indigo-700">{word.native}</span>: {word.meaning}
                       </span>
                     ))}
                   </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold text-slate-900 mb-6">Dictionary</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="pb-3 font-semibold text-slate-600">English</th>
                        <th className="pb-3 font-semibold text-slate-600">Conlang Word</th>
                        <th className="pb-3 font-semibold text-slate-600">IPA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentLang.vocabulary?.map(word => (
                        <tr key={word.id}>
                          <td className="py-4 text-slate-900 font-medium uppercase tracking-tight text-xs">{word.meaning}</td>
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
              <p className="text-slate-500">Select sounds then "Generate" to build your language.</p>
            </div>
          )}

          {isGenerating && (
             <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-200">
               <div className="inline-block animate-spin h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full mb-4"></div>
               <h3 className="text-lg font-bold text-slate-900">Crafting Linguistics...</h3>
             </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center cursor-pointer" onClick={() => setAppState(AppState.HOME)}>
              <i className="fa-solid fa-language text-2xl text-indigo-600 mr-2"></i>
              <span className="text-xl font-black text-slate-900 tracking-tighter">LinguaGen</span>
            </div>
            <div className="hidden sm:flex items-center space-x-4">
              <Button variant="ghost" onClick={() => setAppState(AppState.SAVED)}>Library</Button>
              <Button variant="ghost" onClick={() => setShowPublishGuide(true)}>Get App URL</Button>
              <Button size="sm" onClick={handleStartNew}>New Project</Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="pb-20">
        {appState === AppState.HOME && renderHome()}
        {appState === AppState.SAVED && renderSaved()}
        {appState === AppState.EDITOR && renderEditor()}
      </main>

      {showPublishGuide && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-slate-900">How to get a Public URL</h3>
                <button onClick={() => setShowPublishGuide(false)} className="text-slate-400 hover:text-slate-600">
                  <i className="fa-solid fa-times text-xl"></i>
                </button>
              </div>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">1</div>
                  <div>
                    <h4 className="font-bold text-slate-800">Use Vercel or Netlify</h4>
                    <p className="text-sm text-slate-500 mt-1">These are free hosting providers. Create an account and drag your project folder into their dashboard.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">2</div>
                  <div>
                    <h4 className="font-bold text-slate-800">Deployment</h4>
                    <p className="text-sm text-slate-500 mt-1">They will automatically build the site and provide you with a URL like <code>your-name.vercel.app</code>.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">3</div>
                  <div>
                    <h4 className="font-bold text-slate-800">Share your Link</h4>
                    <p className="text-sm text-slate-500 mt-1">Once live, you can share that URL with anyone! You can even connect a custom domain like <code>www.mylanguage.com</code> later.</p>
                  </div>
                </div>
              </div>
              <div className="mt-8">
                <Button className="w-full" onClick={() => setShowPublishGuide(false)}>Got it!</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="bg-slate-900 text-slate-400 py-12 px-4 border-t border-slate-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center">
              <i className="fa-solid fa-language text-xl text-indigo-400 mr-2"></i>
              <span className="text-lg font-bold text-white tracking-tighter">LinguaGen</span>
            </div>
            <div className="flex gap-4 text-xs">
              <a href="https://www.internationalphoneticassociation.org/IPAcharts/interchart/IPA_CHART_Full.html" target="_blank" rel="noopener" className="hover:text-indigo-400">IPA Reference</a>
              <a href="#" onClick={(e) => {e.preventDefault(); setShowPublishGuide(true);}} className="hover:text-indigo-400">Publishing Guide</a>
            </div>
          </div>
          <div className="text-sm">
            &copy; 2026 LinguaGen Laboratory. Powered by Gemini.
          </div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white transition-colors"><i className="fa-brands fa-github"></i></a>
            <a href="#" className="hover:text-white transition-colors"><i className="fa-brands fa-twitter"></i></a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
