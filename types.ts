
export interface Phoneme {
  symbol: string;
  category: string;
  description: string;
  example: string;
}

export interface VocabularyWord {
  id: string;
  native: string;
  meaning: string;
  pronunciation: string;
}

export interface GrammarRules {
  wordOrder: string;
  pluralRule: string;
  tenseRule: string;
  adjectivePlacement: string;
}

export interface Conlang {
  id: string;
  name: string;
  description: string;
  phonemes: string[];
  vibe: string;
  grammar: GrammarRules;
  vocabulary: VocabularyWord[];
  createdAt: number;
}

export enum AppState {
  HOME = 'HOME',
  EDITOR = 'EDITOR',
  SAVED = 'SAVED'
}
