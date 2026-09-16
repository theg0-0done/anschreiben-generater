const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

export const EMAIL_ERROR_MESSAGE = "Bitte eine gültige E-Mail-Adresse eingeben.";
