import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const apiKey = process.env.GEMINI_API_KEY;

async function testGenerate() {
  if (!apiKey) {
    console.error('API Key not found');
    return;
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = 'gemini-1.5-flash'; // Standard model
  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
    });
    console.log(`Success with ${model}:`, response.text);
  } catch (err: any) {
    console.error(`Error with ${model}:`, err?.message || err);
  }

  const model2 = 'gemini-2.0-flash';
  try {
    const response = await ai.models.generateContent({
      model: model2,
      contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
    });
    console.log(`Success with ${model2}:`, response.text);
  } catch (err: any) {
    console.error(`Error with ${model2}:`, err?.message || err);
  }
}

testGenerate();
