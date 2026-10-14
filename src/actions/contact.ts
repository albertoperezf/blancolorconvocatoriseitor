'use server';

import { refresh } from 'next/cache';
import { requireAdmin } from '@/lib/auth/current';
import { getDb } from '@/lib/db';
import { deleteContactMessage, saveContactMessage } from '@/lib/services/contact';
import { contactSchema, fieldErrors } from '@/lib/validators';
import type { FormState } from './form-state';

export async function sendContactAction(_prev: FormState, formData: FormData): Promise<FormState> {
  // Honeypot: people never see this field, bots fill it in. Pretend it worked.
  if (formData.get('website')) return { status: 'success', message: 'contact.sent' };
  const parsed = contactSchema.safeParse({
    name: formData.get('name') ?? '',
    email: formData.get('email') ?? '',
    message: formData.get('message') ?? '',
  });
  if (!parsed.success) return { status: 'error', errors: fieldErrors(parsed.error) };
  await saveContactMessage(await getDb(), parsed.data);
  return { status: 'success', message: 'contact.sent' };
}

export async function deleteContactMessageAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) return;
  await deleteContactMessage(await getDb(), admin.id, id);
  refresh();
}
