
import { GoogleGenAI, Type } from "@google/genai";
import { Conlang, GrammarRules, VocabularyWord } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const expandVibe = async (vibe: string): Promise<string> => {
  const ai = getAI();
  const prompt = `You are a creative writing and linguistics expert. Take this short language aesthetic idea: "${vibe}" and expand it into a professional 2-sentence linguistic brief describing its sound and feel.`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text.trim();
  } catch (e) {
    throw new Error("Failed to expand vibe.");
  }
};

export const suggestPhonemes = async (vibe: string): Promise<string[]> => {
  const ai = getAI();
  const prompt = `Based on this language vibe: "${vibe}", suggest a cohesive set of 15-25 IPA symbols (consonants and vowels) that would create this sound. Return ONLY a JSON array of strings.`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(response.text.trim());
  } catch (e) {
    throw new Error("Phoneme suggestion failed.");
  }
};

export const generateLanguageCore = async (
  name: string,
  vibe: string,
  phonemes: string[]
): Promise<{ grammar: GrammarRules; vocabulary: VocabularyWord[]; description: string }> => {
  const ai = getAI();
  const prompt = `
    Create a foundation for a conlang named "${name}".
    Aesthetic: ${vibe}
    Inventory: ${phonemes.join(', ')}
    
    Tasks:
    1. Description (2-3 sentences).
    2. Grammar Rules (Word order, Plurals, Tense, Adjectives).
    3. 15 core vocabulary words.
    
    STRICT: Only use the provided IPA symbols for 'native' and 'pronunciation' fields.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            grammar: {
              type: Type.OBJECT,
              properties: {
                wordOrder: { type: Type.STRING },
                pluralRule: { type: Type.STRING },
                tenseRule: { type: Type.STRING },
                adjectivePlacement: { type: Type.STRING }
              },
              required: ['wordOrder', 'pluralRule', 'tenseRule', 'adjectivePlacement']
            },
            vocabulary: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  native: { type: Type.STRING },
                  meaning: { type: Type.STRING },
                  pronunciation: { type: Type.STRING }
                },
                required: ['id', 'native', 'meaning', 'pronunciation']
              }
            }
          },
          required: ['description', 'grammar', 'vocabulary']
        }
      }
    });

    return JSON.parse(response.text.trim());
  } catch (e: any) {
    throw new Error(e?.message || "Linguistic engine failure.");
  }
};

export const extendVocabulary = async (
  lang: Partial<Conlang>,
  theme: string = "general",
  count: number = 10
): Promise<VocabularyWord[]> => {
  const ai = getAI();
  const prompt = `
    Language: ${lang.name}
    Phonemes: ${lang.phonemes?.join(', ')}
    Grammar: ${JSON.stringify(lang.grammar)}
    Theme: ${theme}

    Generate ${count} NEW unique words. Follow established phonotactics.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              native: { type: Type.STRING },
              meaning: { type: Type.STRING },
              pronunciation: { type: Type.STRING }
            },
            required: ['id', 'native', 'meaning', 'pronunciation']
          }
        }
      }
    });
    return JSON.parse(response.text.trim());
  } catch (e: any) {
    throw new Error("Failed to extend vocabulary.");
  }
};

export const translateText = async (
  lang: Partial<Conlang>,
  text: string
): Promise<{ translation: string; pronunciation: string; breakdown: string }> => {
  const ai = getAI();
  const prompt = `
    Language: ${lang.name}
    Grammar: ${JSON.stringify(lang.grammar)}
    Dictionary: ${JSON.stringify(lang.vocabulary)}
    Text: "${text}"
    
    Translate this text. Derive new words if needed using ${lang.phonemes?.join(', ')}.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            translation: { type: Type.STRING },
            pronunciation: { type: Type.STRING },
            breakdown: { type: Type.STRING }
          },
          required: ['translation', 'pronunciation', 'breakdown']
        }
      }
    });
    return JSON.parse(response.text.trim());
  } catch (e: any) {
    throw new Error("Translation failed.");
  }
};

export const askLinguisticAssistant = async (
  lang: Partial<Conlang>,
  query: string
): Promise<string> => {
  const ai = getAI();
  const prompt = `
    You are a professional linguistic consultant.
    Language Context: ${lang.name} (${lang.description})
    Structure: ${JSON.stringify(lang.grammar)}

    User Query: "${query}"

    Provide a concise, helpful response.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (e: any) {
    throw new Error("Assistant unavailable.");
  }
};
