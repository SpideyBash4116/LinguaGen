
import { GoogleGenAI, Type } from "@google/genai";
import { Conlang, GrammarRules, VocabularyWord } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateLanguageCore = async (
  name: string,
  vibe: string,
  phonemes: string[]
): Promise<{ grammar: GrammarRules; vocabulary: VocabularyWord[]; description: string }> => {
  const ai = getAI();
  
  const prompt = `
    You are an expert conlanger. 
    Create a foundation for a new language called "${name}".
    Aesthetic Direction: ${vibe}
    Allowed Phonetic Inventory (STRICTLY use only these IPA symbols): ${phonemes.join(', ')}
    
    Requirements:
    1. Write a 2-3 sentence description of the language's vibe.
    2. Define grammar: Word Order (VSO, SOV, SVO, etc.), Pluralization rules, Tense rules, and Adjective placement.
    3. Generate 15 common vocabulary words (e.g., 'to be', 'man', 'water', 'sun'). Ensure the 'native' and 'pronunciation' strings ONLY use the allowed IPA symbols provided above.
    
    Output MUST be valid JSON.
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
    Given the conlang "${lang.name}" with:
    Phonemes: ${lang.phonemes?.join(', ')}
    Grammar: ${JSON.stringify(lang.grammar)}
    Existing Words: ${lang.vocabulary?.map(v => v.meaning).join(', ')}
    Theme: ${theme}

    Generate ${count} NEW unique vocabulary words related to the theme "${theme}". 
    Ensure 'native' and 'pronunciation' strictly follow the phonetic inventory and phonotactics.
    Output MUST be valid JSON.
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
    
    Translate the following English text into ${lang.name}: "${text}"
    
    Requirements:
    1. If the language lacks specific words for this sentence, derive them logically using the phonemes: ${lang.phonemes?.join(', ')}.
    2. Respect the word order: ${lang.grammar?.wordOrder}.
    3. Return a breakdown of how the translation was formed.
    
    Output MUST be JSON.
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
    Language: ${lang.name} (${lang.description})
    Phonemes: ${lang.phonemes?.join(', ')}
    Grammar: ${JSON.stringify(lang.grammar)}

    Query: "${query}"

    Provide a concise, academic but accessible response. Focus on providing structural suggestions or explanations.
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
