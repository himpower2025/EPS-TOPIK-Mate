import { GoogleGenAI, Modality } from "@google/genai";
import { readFileSync, writeFileSync } from "fs";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "dummy" });

async function run() {
  try {
    const config = {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
      }
    };
    
    console.log("Calling Gemini TTS...");
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // updated preview model
      contents: "안녕하세요. 이것은 테스트입니다.",
      config
    });
    
    console.log("Success!");
    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      const parts = candidates[0].content.parts;
      console.log("Parts:", JSON.stringify(parts, null, 2));
    }
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}
run();
