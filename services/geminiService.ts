
import { GoogleGenAI, Type } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const summarizePlanStatus = async (planDetails: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analyze these building plan review comments and provide a high-level executive summary for the client. Keep it professional and concise: ${planDetails}`,
    config: {
      temperature: 0.7,
      maxOutputTokens: 200,
    }
  });
  return response.text;
};

export const detectBuildingCodeFlags = async (commentText: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Examine the following building review comment for potential legal or safety flags. 
    Return a JSON array of objects with 'type' (WARNING/ERROR), 'message', and 'department'.
    
    Comment: ${commentText}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING },
            message: { type: Type.STRING },
            department: { type: Type.STRING }
          },
          required: ["type", "message", "department"]
        }
      }
    }
  });
  return JSON.parse(response.text || '[]');
};
