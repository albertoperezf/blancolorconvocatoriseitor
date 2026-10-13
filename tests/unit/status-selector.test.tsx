// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import messages from '../../messages/es.json';
import { StatusSelector } from '@/components/status-selector';

function setup(initial: 'going' | 'maybe' | 'not_going' | null, onSave = vi.fn().mockResolvedValue({ ok: true })) {
  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <StatusSelector initial={initial} onSave={onSave} />
    </NextIntlClientProvider>,
  );
  return { onSave, user: userEvent.setup() };
}

describe('StatusSelector', () => {
  it('exposes the three answers as a labelled radio group with the current one checked', () => {
    setup('maybe');
    expect(screen.getByRole('group', { name: 'Tu respuesta' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'DUDA' })).toBeChecked();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('saves, announces the change and offers undo back to the previous answer', async () => {
    const { onSave, user } = setup(null);
    await user.click(screen.getByRole('radio', { name: 'VOY' }));
    expect(onSave).toHaveBeenCalledWith('going');
    expect(await screen.findByRole('status')).toHaveTextContent('Guardado: VOY.');

    await user.click(screen.getByRole('button', { name: 'Deshacer' }));
    await waitFor(() => expect(onSave).toHaveBeenLastCalledWith(null));
    expect(screen.getByRole('radio', { name: 'VOY' })).not.toBeChecked();
    expect(screen.getByRole('status')).toHaveTextContent('Respuesta borrada.');
  });

  it('rolls back the optimistic choice and shows an error when saving fails', async () => {
    const { user } = setup('going', vi.fn().mockResolvedValue({ ok: false, error: 'status.error' }));
    await user.click(screen.getByRole('radio', { name: 'NO VOY' }));
    expect(await screen.findByText('No se ha podido guardar. Inténtalo otra vez.')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'VOY' })).toBeChecked();
  });
});
