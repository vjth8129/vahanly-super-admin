export const PASSWORD_RULES =
  'At least 8 characters, with an uppercase letter, a lowercase letter, a number and a symbol.'

/** Mirrors the API's complexity rule so the form can say what's wrong before submitting. */
export function isPasswordComplex(p: string) {
  return p.length >= 8 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /\d/.test(p) && /[^A-Za-z0-9]/.test(p)
}

/** A readable temporary password, e.g. "Wash-4827-Kite!" — the user replaces it on first sign-in. */
export function generateTempPassword() {
  const words = ['Wash', 'Foam', 'Shine', 'Wave', 'Kite', 'Pearl', 'River', 'Cloud', 'Spark', 'Mist']
  const pick = () => words[crypto.getRandomValues(new Uint32Array(1))[0] % words.length]
  const digits = String(crypto.getRandomValues(new Uint32Array(1))[0] % 10000).padStart(4, '0')
  return `${pick()}-${digits}-${pick()}!`
}
