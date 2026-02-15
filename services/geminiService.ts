
import { GoogleGenAI, Type } from "@google/genai";
import { GrammarRules, VocabularyWord } from "../types";

export const generateLanguageCore = async (
  name: string,
  vibe: string,
  phonemes: string[]
): Promise<{ grammar: GrammarRules; vocabulary: VocabularyWord[]; description: string }> => {
  // Use direct process.env.API_KEY as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    You are an expert conlanger. 
    Create a foundation for a new language called "${name}".
    Aesthetic Direction: ${vibe}
    Allowed Phonetic Inventory (STRICTLY use only these IPA symbols): ${phonemes.join(', ')}
    
    Requirements:
    1. Write a 2-3 sentence description of the language's vibe.
    2. Define grammar: Word Order (VSO, SOV, etc.), Pluralization rules, Tense rules, and Adjective placement.
    3. Generate 15 common vocabulary words. Ensure the 'native' and 'pronunciation' strings only use the allowed IPA provided above.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
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

    const text = response.text;
    if (!text) throw new Error("The linguistic engine returned an empty response.");
    
    return JSON.parse(text);
  } catch (e: any) {
    console.error("Linguistic Engine Error:", e);
    const errorMessage = e?.message?.includes('401') 
      ? "API Key Authentication Failed. Please check environment settings." 
      : "The AI failed to construct the language. Please try a different phonetic combination.";
    throw new Error(errorMessage);
  }
};
