import { customAlphabet } from 'nanoid';

// Uppercase alphanumeric, exclude ambiguous chars (0/O, 1/I/L)
const alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const nanoid = customAlphabet(alphabet, 8);

export function generateTeamCode(): string {
  return nanoid();
}
