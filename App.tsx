
import React, { useState, useEffect, useRef } from 'react';
import { AppState, Conlang, VocabularyWord } from './types';
import { Button } from './components/Button';
import { IpaPicker } from './components/IpaPicker';
import { PRESETS } from './constants';
import { 
  generateLanguageCore, 
  extendVocabulary, 
  askLinguisticAssistant, 
  translateText, 
  suggestPhonemes, 
  expandVibe 
} from './services/geminiService';

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
  const [isSuggestingSounds, setIsSuggestingSounds] = useState(false);
  const [isExpandingVibe, setIsExpandingVibe] = useState(false);
  
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

  const handleSuggestSounds = async () => {
    if (!currentLang.vibe) {
      setError("Please provide a vibe first so I know what sounds to suggest.");
      return;
    }
    setIsSuggestingSounds(true);
    try {
      const sounds = await suggestPhonemes(currentLang.vibe);
      setCurrentLang(prev => ({ ...prev, phonemes: sounds }));
    } catch (err) {
      setError("Sound suggestion failed.");
    } finally {
      setIsSuggestingSounds(false);
    }
  };

  const handleExpandVibe = async () => {
    if (!currentLang.vibe) return;
    setIsExpandingVibe(true);
    try {
      const expanded = await expandVibe(currentLang.vibe);
      setCurrentLang(prev => ({ ...prev, vibe: expanded }));
    } catch (err) {
      setError("Vibe expansion failed.");
    } finally {
      setIsExpandingVibe(false);
    }
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

  const handleShare = () => {
    try {
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
        Next-generation Conlanging Engine. Build deep, grammatically sound languages with AI-assisted linguistic modeling.
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
          <div className="bg-