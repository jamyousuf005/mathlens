export class MathParseError extends Error {
  readonly position: number;

  constructor(message: string, position: number) {
    super(message);
    this.name = 'MathParseError';
    this.position = position;
  }
}

export class UnsupportedMathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedMathError';
  }
}

export class DivisionByZeroError extends Error {
  constructor() {
    super('Division by zero is undefined.');
    this.name = 'DivisionByZeroError';
  }
}
