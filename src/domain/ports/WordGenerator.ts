
export interface WordGenerator {
  generateWord(age: number, language: string, previousWords: string[]): Promise<string>;
}
