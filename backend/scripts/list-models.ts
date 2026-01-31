import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const apiKey = process.env.GEMINI_API_KEY;

async function listModels() {
  if (!apiKey) {
    console.error('API Key not found');
    return;
  }

  const ai = new GoogleGenAI({ apiKey });
  try {
    const models = await ai.models.list();
    console.log('--- START MODELS ---');
    for await (const model of models) {
      console.log(model.name);
    }
    console.log('--- END MODELS ---');
  } catch (err) {
    console.error('Error listing models:', err);
  }
}

listModels();
