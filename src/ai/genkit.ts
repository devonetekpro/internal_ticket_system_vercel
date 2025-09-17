
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// This file provides a shared AI client instance.
// The API key is loaded from environment variables.
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
    }),
  ],
  logLevel: 'debug',
  enableTracing: true,
});
