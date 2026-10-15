'use client';

import { useCallback, useEffect, useState } from 'react';
import { deletePushSubscriptionAction, savePushSubscriptionAction } from '@/actions/push';

export type PushState = 'loading' | 'unsupported' | 'ios-install' | 'denied' | 'off' | 'on';

function isIos() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function keyToBytes(base64url: string) {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

/** Push notification status for this browser, plus enable/disable. iOS only allows it from the home-screen app. */
export function usePush(publicKey: string | null) {
  const [state, setState] = useState<PushState>('loading');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    (async () => {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
      if (isIos() && !isStandalone()) return setState('ios-install');
      if (!publicKey || !supported) return setState('unsupported');
      if (Notification.permission === 'denied') return setState('denied');
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      // Re-save so the server knows about subscriptions the browser rotated on its own.
      if (subscription) await savePushSubscriptionAction(subscription.toJSON());
      setState(subscription ? 'on' : 'off');
    })().catch(() => setState('unsupported'));
  }, [publicKey]);

  const enable = useCallback(async () => {
    if (!publicKey) return;
    setBusy(true);
    setFailed(false);
    try {
      // Ask first, while still inside the tap: Safari ignores permission prompts after other awaits.
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return setState(permission === 'denied' ? 'denied' : 'off');
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyToBytes(publicKey),
        }));
      const { ok } = await savePushSubscriptionAction(subscription.toJSON());
      if (!ok) throw new Error('subscription rejected');
      setState('on');
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }, [publicKey]);

  const disable = useCallback(async () => {
    setBusy(true);
    setFailed(false);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await deletePushSubscriptionAction(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setState('off');
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }, []);

  return { state, busy, failed, enable, disable };
}
