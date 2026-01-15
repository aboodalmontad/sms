
import { GoogleGenAI } from "@google/genai";

export const generateSmsDraft = async (prompt: string): Promise<string> => {
  try {
    // Create a new GoogleGenAI instance right before making an API call to ensure it always uses the most up-to-date API key.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `ساعدني في كتابة رسالة SMS قصيرة ومهنية باللغة العربية بناءً على الطلب التالي: "${prompt}". تأكد أن الرسالة لا تتجاوز 160 حرفاً.`,
    });
    return response.text?.trim() || "تعذر إنشاء المسودة حالياً.";
  } catch (error) {
    console.error("Error generating SMS draft:", error);
    return "خطأ في الاتصال بالذكاء الاصطناعي.";
  }
};
