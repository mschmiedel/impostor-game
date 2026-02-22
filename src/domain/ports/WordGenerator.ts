
export interface WordGeneratorResult {
  category: string;
  word: string;
}

export interface WordGenerator {
  generateWord(age: number, language: string, previousWords: string[]): Promise<WordGeneratorResult>;
}
