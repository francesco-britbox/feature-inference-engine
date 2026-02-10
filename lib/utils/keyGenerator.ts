/**
 * Key Generator
 * Generates auto-incrementing Jira-style ticket keys (e.g., W2C-100, W2C-101)
 */

export class KeyGenerator {
  private counter: number;
  private readonly prefix: string;

  constructor(projectKey: string, startFrom: number = 1) {
    this.prefix = projectKey;
    this.counter = startFrom;
  }

  nextKey(): string {
    const key = `${this.prefix}-${this.counter}`;
    this.counter++;
    return key;
  }

  currentCounter(): number {
    return this.counter;
  }
}
