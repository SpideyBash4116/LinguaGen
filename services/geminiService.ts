
import { GoogleGenAI, Type } from "@google/genai";
import { GrammarRules, VocabularyWord } from "../types";

const API_KEY = process.env.API_KEY || '';

export const generateLanguageCore = async (
  name: string,
  vibe: string,
  phonemes: string[]
): Promise<{ grammar: GrammarRules; vocabulary: VocabularyWord[]; description: string }> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const prompt = `
    You are a professional linguist and conlanger. 
    Create a foundation for a new language called "${name}".
    Vibe: ${vibe}
    Allowed sounds (IPA): ${phonemes.join(', ')}
    
    Task:
    1. Write a short 1-2 sentence description of the language's history or personality.
    2. Determine basic grammar: Word Order (e.g., SVO), how plurals are formed, how past tense is formed, and where adjectives go.
    3. Generate 10 basic vocabulary words based on the provided IPA sounds and vibe.
    
    Ensure all native words ONLY use the provided IPA symbols or very close variations.
  `;

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

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    throw new Error("Linguistic generation failed.");
  }
};
