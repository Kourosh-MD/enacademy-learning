export type AuthMode = 'login' | 'register';
export type AuthFieldName = 'fullName' | 'email' | 'password';
export type AuthValidationErrors = Partial<Record<AuthFieldName, 'invalid' | 'required'>>;

type AuthFields = {
  fullName: string;
  email: string;
  password: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/;

export function validateAuthFields(mode: AuthMode, fields: AuthFields): AuthValidationErrors {
  const errors: AuthValidationErrors = {};
  const fullName = fields.fullName.trim();
  const email = fields.email.trim();
  const password = fields.password;

  if (mode === 'register' && (fullName.length < 2 || fullName.length > 120)) {
    errors.fullName = 'invalid';
  }
  if (!email || email.length > 320 || !EMAIL_PATTERN.test(email)) {
    errors.email = 'invalid';
  }
  if (mode === 'register') {
    const validPassword = password.length >= 10 && password.length <= 72
      && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password);
    if (!validPassword) errors.password = 'invalid';
  } else if (!password) {
    errors.password = 'required';
  }

  return errors;
}
