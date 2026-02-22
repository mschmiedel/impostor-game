
import { WordGenerator, WordGeneratorResult } from '@/domain/ports/WordGenerator';
import redis from '@/infrastructure/adapters/redis/client';

interface WordPool {
  categories: Array<{
    name: string;
    words: string[];
  }>;
}

export class GeminiWordGenerator implements WordGenerator {
  private apiKey: string;
  private model: string = 'gemini-flash-lite-latest';

  constructor() {
    this.apiKey = process.env.GOOGLE_API_KEY || '';
    if (!this.apiKey) {
      console.warn("GOOGLE_API_KEY not set");
    }
  }

  private getCacheKey(language: string): string {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const lang = language.split('-')[0]; // Normalize "de-DE" → "de"
    return `words:${today}:${lang}`;
  }

  private async getWordPool(language: string): Promise<WordPool> {
    const cacheKey = this.getCacheKey(language);

    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as WordPool;
    }

    const pool = await this.generateWordPool(language);
    await redis.set(cacheKey, JSON.stringify(pool), 'EX', 86400);
    return pool;
  }

  private async generateWordPool(language: string): Promise<WordPool> {
    const lang = language.split('-')[0];
    const prompt = `
      Generate a JSON word pool for the "Impostor" party game.

      Requirements:
      - Language: ${lang}
      - Create exactly 10 categories
      - Each category must have exactly 50 concrete nouns
      - Words must be appropriate for players of all ages
      - Only concrete, easily imaginable nouns (no verbs, no abstract concepts)
      - Words should vary in difficulty from simple to moderately complex

      Respond ONLY with valid JSON in this exact format:
      {
        "categories": [
          { "name": "CategoryName", "words": ["word1", "word2", ...50 words] },
          ...10 categories total
        ]
      }
    `.trim();

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as WordPool;
    }

    throw new Error('Failed to parse Gemini batch response');
  }

  async generateWord(age: number, language: string, previousWords: string[]): Promise<WordGeneratorResult> {
    if (!this.apiKey) {
      return { category: 'Fallback', word: 'banana' };
    }

    try {
      const pool = await this.getWordPool(language);

      // Filter to categories that still have unused words
      const availableCategories = pool.categories.filter(cat =>
        cat.words.some(w => !previousWords.includes(w))
      );

      const categories = availableCategories.length > 0 ? availableCategories : pool.categories;
      const cat = categories[Math.floor(Math.random() * categories.length)];

      const availableWords = cat.words.filter(w => !previousWords.includes(w));
      const words = availableWords.length > 0 ? availableWords : cat.words;
      const word = words[Math.floor(Math.random() * words.length)];

      console.log('Random category: ', cat.name);
      return { category: cat.name, word };
    } catch (error) {
      console.error("Error generating word:", error);
      return { category: 'Fallback', word: 'banana' };
    }
  }
}
