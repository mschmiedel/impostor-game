import { z } from 'zod';

// ── Primitives ────────────────────────────────────────────────────────────────

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Checks whether a value contains a phone-number-like digit sequence.
 * Strips spaces, hyphens and plus signs first so that "+49 171 1234567"
 * is caught the same as "01234567".
 */
function resemblesPhoneNumber(val: string): boolean {
  const stripped = val.replace(/[\s\-+]/g, '');
  return /\d{7,}/.test(stripped);
}

// ── Exported schemas ──────────────────────────────────────────────────────────

/** BCP 47 tags for every locale the app supports. */
export const LanguageSchema = z.enum(
  ['de-DE', 'en-US', 'es-ES', 'fr-FR', 'it-IT'],
  { error: 'Unsupported language. Allowed: de-DE, en-US, es-ES, fr-FR, it-IT' },
);

/** Age of the youngest player: integer in [5, 99]. */
export const AgeSchema = z
  .number()
  .int('Age must be a whole number')
  .min(5, 'Age must be at least 5')
  .max(99, 'Age must be at most 99');

/** Player / creator display name: 3–30 chars, no emails, no phone numbers. */
export const PlayerNameSchema = z
  .string()
  .trim()
  .min(3, 'Name must be at least 3 characters')
  .max(30, 'Name must be at most 30 characters')
  .refine(val => !EMAIL_PATTERN.test(val), 'Name must not be an email address')
  .refine(val => !resemblesPhoneNumber(val), 'Name must not resemble a phone number');

// ── Request-body schemas ──────────────────────────────────────────────────────

export const CreateGameSchema = z.object({
  creatorName: PlayerNameSchema,
  ageOfYoungestPlayer: AgeSchema,
  language: LanguageSchema.optional(),
});

export const JoinGameSchema = z.object({
  playerName: PlayerNameSchema,
});
