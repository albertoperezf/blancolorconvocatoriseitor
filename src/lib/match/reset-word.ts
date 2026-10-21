/** Typed by the admin to confirm "Reiniciar convocatoria"; checked again on the server. */
export const RESET_WORD = 'REINICIAR';
export const CANCEL_WORD = 'CANCELAR';
export const RESTORE_WORD = 'REACTIVAR';

export const CANCEL_REASONS = ['players', 'weather', 'pitch', 'other'] as const;
export type CancelReason = (typeof CANCEL_REASONS)[number];
