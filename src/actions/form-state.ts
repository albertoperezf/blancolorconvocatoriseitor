export type FormState = {
  status: 'idle' | 'success' | 'error';
  /** Message keys under `errors.*`, keyed by field name (or `form`). */
  errors?: Record<string, string>;
  /** Message key for a form-level notice. */
  message?: string;
  data?: Record<string, string>;
};

export const idle: FormState = { status: 'idle' };
