/**
 * Silences console.log and console.warn in production builds.
 *
 * Import this once at the top of app/_layout.tsx. In development (__DEV__ = true)
 * all console output works normally. In production builds (__DEV__ = false) log
 * and warn become no-ops, eliminating JS thread overhead and Sentry noise from
 * ~630 debug log calls across the codebase.
 *
 * console.error is intentionally left untouched — React Native's own error
 * handling uses it internally, and it's the right channel for unexpected failures.
 */
if (!__DEV__) {
  console.log = () => {};
  console.warn = () => {};
}
