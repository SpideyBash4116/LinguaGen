
import { GoogleGenAI, Type } from "@google/genai";
import { GrammarRules, VocabularyWord } from "../types";

export const generateLanguageCore = async (
  name: string,
  vibe: string,
  phonemes: string[]
): Promise<{ grammar: GrammarRules; vocabulary: VocabularyWord[]; description: string }> => {
  // Use the API key exclusively from process.env.API_KEY as per guidelines
  const apiKey = process.env.API_KEY;
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    You are an expert conlanger. 
    Create a foundation for a new language called "${name}".
    Aesthetic Direction: ${vibe}
    Allowed Phonetic Inventory (STRICTLY use only these IPA symbols): ${phonemes.join(', ')}
    
    Requirements:
    1. Write a 2-3 sentence description of the language's vibe.
    2. Define grammar: Word Order (VSO, SOV, SVO, etc.), Pluralization rules, Tense rules, and Adjective placement.
    3. Generate 15 common vocabulary words. Ensure the 'native' and 'pronunciation' strings ONLY use the allowed IPA symbols provided above.
    
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
            description: { type: Type.STRING, description: "A brief description of the language's character and aesthetic." },
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
    
    // Clean potential markdown or extra whitespace to ensure valid JSON parsing
    const cleanJson = text.trim().replace(/^```json/, '').replace(/```$/, '').trim();
    
    try {
      return JSON.parse(cleanJson);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError, "Raw text:", text);
      throw new Error("The engine produced an invalid linguistic structure. Please try again.");
    }
  } catch (e: any) {
    console.error("Linguistic Engine Error:", e);
    
    // Handle specific API errors
    if (e?.message?.includes('401') || e?.message?.includes('403')) {
      throw new Error("API Key Authentication Failed. Please check that your environment's API Key is valid and active.");
    } else if (e?.message?.includes('429')) {
      throw new Error("Too many requests. Please wait a moment before refining the language again.");
    } else if (e?.message?.includes('404')) {
      throw new Error("The linguistic model is temporarily unavailable. Please try again in a few minutes.");
    }
    
    throw new Error(e?.message || "The AI failed to construct the language. Please check your settings or try a different phonetic combination.");
  }
};
