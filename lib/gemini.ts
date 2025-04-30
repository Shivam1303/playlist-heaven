import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Google Generative AI with API key
const getGeminiClient = () => {
  const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (!API_KEY) {
    throw new Error("GEMINI_API_KEY is not defined in environment variables");
  }

  return new GoogleGenerativeAI(API_KEY);
};

// Function to analyze text mood using Gemini
export const analyzeTextMoodWithGemini = async (
  text: string
): Promise<{ label: string; score: number }[]> => {
  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
      Analyze the emotional tone of the following text and classify it into one of these categories: 
      joy, surprise, neutral, sadness, fear, anger, or disgust.
      
      Return ONLY a JSON object with the format:
      [{"label": "emotion_name", "score": confidence_score_between_0_and_1}]
      
      Where emotion_name is the dominant emotion, and any secondary emotions with lower scores.
      
      Text to analyze: "${text}"
    `;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const textResponse = response.text();

    // Extract JSON from the response - using multiline regex compatible with ES2017
    const jsonRegex = /\[([\s\S]*?)\]/;
    const jsonMatch = textResponse.match(jsonRegex);
    if (!jsonMatch) {
      return [{ label: "neutral", score: 1.0 }];
    }

    const jsonResponse = JSON.parse(`[${jsonMatch[1]}]`);
    return jsonResponse;
  } catch (error) {
    console.error("Error analyzing mood with Gemini:", error);
    return [{ label: "neutral", score: 1.0 }];
  }
};

// Function to generate text using Gemini
export const generateTextWithGemini = async (
  prompt: string,
  options: {
    maxTokens?: number;
    temperature?: number;
    topK?: number;
    topP?: number;
  } = {}
): Promise<string> => {
  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        maxOutputTokens: options.maxTokens,
        temperature: options.temperature,
        topK: options.topK,
        topP: options.topP,
      },
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error("Error generating text with Gemini:", error);
    throw error;
  }
};
