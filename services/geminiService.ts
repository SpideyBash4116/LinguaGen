
import { GoogleGenAI, Type } from "@google/genai";
import { GrammarRules, VocabularyWord } from "../types";

// Safe access to environment variables
const getApiKey = () => {
  try {
    return (window as any).process?.env?.API_KEY || (process as any)?.env?.API_KEY || '';
  } catch (e) {
    return '';
  }
};

export const generateLanguageCore = async (
  name: string,
  vibe: string,
  phonemes: string[]
): Promise<{ grammar: GrammarRules; vocabulary: VocabularyWord[]; description: string }> => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    console.error("Missing Gemini API Key. Ensure process.env.API_KEY is set.");
    throw new Error("API configuration missing. Please check your environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    You are a professional linguist and conlanger. 
    Create a foundation for a new language called "${name}".
    Vibe: ${vibe}
    Allowed sounds (IPA): ${phonemes.join(', ')}
    
    Task:
    1. Write a short 2-3 sentence description of the language's historical origins and its aesthetic "feel".
    2. Determine basic grammar: Word Order (e.g., VSO, SOV), how plurals are formed (affixes, reduplication, etc.), how past tense is formed, and adjective-noun positioning.
    3. Generate 15 basic vocabulary words using the allowed IPA.
    
    Ensure native words STRICTLY use the provided IPA symbols or standard variations.
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
    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    throw new Error("The AI provided an invalid linguistic structure. Please try again.");
  }
};
