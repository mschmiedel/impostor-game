
/**
 * @jest-environment node
 */
import {
  PlayerNameSchema,
  AgeSchema,
  LanguageSchema,
  CreateGameSchema,
  JoinGameSchema,
} from '@/shared/validators/gameValidators';

// ── PlayerNameSchema ──────────────────────────────────────────────────────────

describe('PlayerNameSchema', () => {
  describe('valid names', () => {
    it.each([
      'Alice',
      'Joe',
      'Hans Müller',
      'Player 1',
      'T-800',
      'A'.repeat(30),
    ])('accepts "%s"', name => {
      expect(PlayerNameSchema.safeParse(name).success).toBe(true);
    });

    it('trims surrounding whitespace before length check', () => {
      const result = PlayerNameSchema.safeParse('  Alice  ');
      expect(result.success).toBe(true);
      // Parsed value is trimmed
      if (result.success) expect(result.data).toBe('Alice');
    });
  });

  describe('length constraints', () => {
    it('rejects names shorter than 3 characters', () => {
      expect(PlayerNameSchema.safeParse('Al').success).toBe(false);
      expect(PlayerNameSchema.safeParse('').success).toBe(false);
    });

    it('rejects names longer than 30 characters', () => {
      expect(PlayerNameSchema.safeParse('A'.repeat(31)).success).toBe(false);
    });

    it('accepts exactly 3 characters', () => {
      expect(PlayerNameSchema.safeParse('Ali').success).toBe(true);
    });
  });

  describe('email rejection', () => {
    it.each([
      'alice@example.com',
      'user@domain.org',
      'player@game.io',
    ])('rejects email "%s"', email => {
      expect(PlayerNameSchema.safeParse(email).success).toBe(false);
    });

    it('includes a helpful error message', () => {
      const result = PlayerNameSchema.safeParse('a@b.com');
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map(i => i.message).join(' ');
        expect(messages).toMatch(/email/i);
      }
    });
  });

  describe('phone number rejection', () => {
    it.each([
      ['7+ consecutive digits', '01234567'],
      ['8-digit number', '12345678'],
      ['phone with country code no spaces', '+491234567'],
      ['phone with spaces between groups', '123 456 7890'],   // 10 digits stripped
      ['phone with hyphens', '012-345-6789'],                 // 10 digits stripped
      ['phone with mixed separators', '+49 171 1234567'],     // 11 digits stripped
    ])('rejects %s: "%s"', (_label, value) => {
      expect(PlayerNameSchema.safeParse(value).success).toBe(false);
    });

    it('allows names with fewer than 7 digits', () => {
      // "Player 1" → stripped "Player1" → only 1 digit → OK
      expect(PlayerNameSchema.safeParse('Player 1').success).toBe(true);
      // "T-800" → stripped "T800" → only 3 digits → OK
      expect(PlayerNameSchema.safeParse('T-800').success).toBe(true);
      // "Room 42B" → only 2 digits → OK
      expect(PlayerNameSchema.safeParse('Room 42B').success).toBe(true);
    });

    it('includes a helpful error message', () => {
      const result = PlayerNameSchema.safeParse('01234567');
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map(i => i.message).join(' ');
        expect(messages).toMatch(/phone/i);
      }
    });
  });
});

// ── AgeSchema ─────────────────────────────────────────────────────────────────

describe('AgeSchema', () => {
  it.each([5, 10, 18, 50, 99])('accepts age %i', age => {
    expect(AgeSchema.safeParse(age).success).toBe(true);
  });

  it('rejects age below 5', () => {
    expect(AgeSchema.safeParse(4).success).toBe(false);
    expect(AgeSchema.safeParse(0).success).toBe(false);
    expect(AgeSchema.safeParse(-1).success).toBe(false);
  });

  it('rejects age above 99', () => {
    expect(AgeSchema.safeParse(100).success).toBe(false);
    expect(AgeSchema.safeParse(200).success).toBe(false);
  });

  it('rejects non-integer (float) age', () => {
    expect(AgeSchema.safeParse(10.5).success).toBe(false);
  });

  it('rejects non-number types', () => {
    expect(AgeSchema.safeParse('10').success).toBe(false);
    expect(AgeSchema.safeParse(null).success).toBe(false);
  });
});

// ── LanguageSchema ────────────────────────────────────────────────────────────

describe('LanguageSchema', () => {
  it.each(['de-DE', 'en-US', 'es-ES', 'fr-FR', 'it-IT'])(
    'accepts supported locale "%s"',
    locale => {
      expect(LanguageSchema.safeParse(locale).success).toBe(true);
    },
  );

  it.each(['de', 'en', 'xx-XX', 'zh-CN', ''])(
    'rejects unsupported locale "%s"',
    locale => {
      expect(LanguageSchema.safeParse(locale).success).toBe(false);
    },
  );
});

// ── CreateGameSchema ──────────────────────────────────────────────────────────

describe('CreateGameSchema', () => {
  it('accepts a minimal valid body (no language)', () => {
    const result = CreateGameSchema.safeParse({
      creatorName: 'Host',
      ageOfYoungestPlayer: 10,
    });
    expect(result.success).toBe(true);
  });

  it('accepts a full valid body', () => {
    const result = CreateGameSchema.safeParse({
      creatorName: 'Host',
      ageOfYoungestPlayer: 12,
      language: 'en-US',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid creator name', () => {
    const result = CreateGameSchema.safeParse({
      creatorName: 'Hi',            // too short
      ageOfYoungestPlayer: 10,
    });
    expect(result.success).toBe(false);
  });

  it('rejects an out-of-range age', () => {
    const result = CreateGameSchema.safeParse({
      creatorName: 'Alice',
      ageOfYoungestPlayer: 3,       // below min
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unsupported language', () => {
    const result = CreateGameSchema.safeParse({
      creatorName: 'Alice',
      ageOfYoungestPlayer: 10,
      language: 'zh-CN',
    });
    expect(result.success).toBe(false);
  });
});

// ── JoinGameSchema ────────────────────────────────────────────────────────────

describe('JoinGameSchema', () => {
  it('accepts a valid player name', () => {
    expect(JoinGameSchema.safeParse({ playerName: 'Alice' }).success).toBe(true);
  });

  it('rejects an email as player name', () => {
    expect(
      JoinGameSchema.safeParse({ playerName: 'alice@example.com' }).success,
    ).toBe(false);
  });

  it('rejects a phone number as player name', () => {
    expect(
      JoinGameSchema.safeParse({ playerName: '01234567' }).success,
    ).toBe(false);
  });

  it('rejects a missing player name', () => {
    expect(JoinGameSchema.safeParse({}).success).toBe(false);
  });
});
