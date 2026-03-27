import { Mixpanel } from 'mixpanel-react-native';

export const Events = {
  // App
  APP_OPENED:                 'App: Opened',
  // Auth
  AUTH_PROFILE_CREATED:       'Auth: Profile Created',
  AUTH_LEGACY_USER_MIGRATED:  'Auth: Legacy User Migrated',
  AUTH_SIGNED_OUT:            'Auth: Signed Out',
  // Day 1
  DAY1_OPENED:                'Day 1: Opened',
  DAY1_STEP1_COMPLETED:       'Day 1: Step 1 Completed',
  DAY1_STEP2_COMPLETED:       'Day 1: Step 2 Completed',
  DAY1_STEP3_COMPLETED:       'Day 1: Step 3 Completed',
  DAY1_MIRROR_GENERATING:     'Day 1: Mirror Generating',
  DAY1_MIRROR_VIEWED:         'Day 1: Mirror Viewed',
  DAY1_COMPLETED:             'Day 1: Completed',
  // Journal
  JOURNAL_OPENED:             'Journal: Opened',
  JOURNAL_CREATED:            'Journal: Created',
  JOURNAL_DELETED:            'Journal: Deleted',
  // Mirror
  MIRROR_GENERATED:           'Mirror: Generated',
  MIRROR_VIEWED:              'Mirror: Viewed',
  MIRROR_SHARED:              'Mirror: Shared',
  // Friends
  FRIEND_INVITE_SENT:         'Friends: Invite Sent',
  FRIEND_INVITE_ACCEPTED:     'Friends: Invite Accepted',
  FRIEND_INVITE_DECLINED:     'Friends: Invite Declined',
  FRIEND_MIRROR_VIEWED:       'Friends: Shared Mirror Viewed',
  // Push
  PUSH_NOTIF_OPT_IN_PROMPTED: 'Push: Opt-In Prompted',
  PUSH_NOTIF_OPTED_IN:        'Push: Opted In',
  PUSH_NOTIF_OPTED_OUT:       'Push: Opted Out',
  PUSH_RHYTHM_SAVED:          'Push: Rhythm Saved',
  PUSH_NOTIF_CARD_DISMISSED:  'Push: Card Dismissed',
} as const;

export type EventName = typeof Events[keyof typeof Events];

let _mixpanel: Mixpanel | null = null;

export async function initAnalytics(): Promise<void> {
  const token = process.env.EXPO_PUBLIC_MIXPANEL_TOKEN;
  if (!token) {
    if (__DEV__) console.log('[Analytics] No token — skipping Mixpanel init');
    return;
  }
  try {
    // useNative: false = JS mode (Expo-safe)
    // trackAutomaticEvents: false = required in JS mode to avoid crash
    const instance = new Mixpanel(token, false, false);
    await instance.init();
    _mixpanel = instance;
    instance.registerSuperProperties({ environment: __DEV__ ? 'development' : 'production' });
    if (__DEV__) console.log('[Analytics] Mixpanel initialized');
  } catch (e) {
    if (__DEV__) console.warn('[Analytics] init failed:', e);
  }
}

export function track(event: EventName, props?: Record<string, unknown>): void {
  if (!_mixpanel) return;
  try {
    _mixpanel.track(event, props);
  } catch (e) {
    if (__DEV__) console.warn('[Analytics] track failed:', e);
  }
}

export function identify(userId: string): void {
  if (!_mixpanel) return;
  try {
    _mixpanel.identify(userId);
  } catch (e) {
    if (__DEV__) console.warn('[Analytics] identify failed:', e);
  }
}

export function setUserProperties(props: Record<string, unknown>): void {
  if (!_mixpanel) return;
  try {
    _mixpanel.getPeople().set(props);
  } catch (e) {
    if (__DEV__) console.warn('[Analytics] setUserProperties failed:', e);
  }
}

export function setSuperProperties(props: Record<string, unknown>): void {
  if (!_mixpanel) return;
  try {
    _mixpanel.registerSuperProperties(props);
  } catch (e) {
    if (__DEV__) console.warn('[Analytics] setSuperProperties failed:', e);
  }
}

export function reset(): void {
  if (!_mixpanel) return;
  try {
    _mixpanel.reset();
  } catch (e) {
    if (__DEV__) console.warn('[Analytics] reset failed:', e);
  }
}

export function flush(): void {
  if (!_mixpanel) return;
  try {
    _mixpanel.flush();
  } catch (e) {
    if (__DEV__) console.warn('[Analytics] flush failed:', e);
  }
}
