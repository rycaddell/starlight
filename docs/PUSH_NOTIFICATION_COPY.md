# Push Notification Copy — Encounter Nudge

Sent by `supabase/functions/send-encounter-nudge/index.ts`.
One message is picked at random from the matching slot's bank.
No title — iOS displays the app name automatically.
Use `{name}` as a placeholder for the user's display name (falls back to "Friend").

---

## Slot: 1:1 with God (`one_on_one`)
Fires daily at the end of the morning window (11:00 AM local).

1. {name}, what's one thing from your time with God this morning worth holding?
2. What showed up in your time with God this morning?
3. Anything from quiet time this morning before the day gets away from you?

---

## Slot: Church (`church`)
Fires on the selected day at the end of the afternoon window (4:00 PM local).

1. {name}, what landed in the service today? Capture it before it gets lost in the week.
2. What from church today is still with you?
3. What did God have for you at church today?

---

## Slot: Small Group (`small_group`)
Fires on the selected day at the end of the evening window (9:00 PM local).

1. What came up in group tonight that's still with you?
2. What did someone say tonight you don't want to lose?
3. {name}, what are you still processing from small group? Capture it.

---

## Custom Slots
When a user creates a slot with a custom label (e.g. "Men's retreat"), these templates are used with the label injected:

1. You just had {label}. What's still with you?
2. What came out of {label} today worth capturing?

---

## Fallback / Default
Used when no slot context can be determined.

### Morning (before 4:00 PM)
1. {name}, anything from this morning worth capturing?

### Evening (4:00 PM and later)
1. End of the day. What are you reflecting on?

---

## Time Windows
| Window    | Fires at (local) | Typical context           |
|-----------|-----------------|---------------------------|
| Morning   | 11:00 AM        | 1:1 with God / quiet time |
| Afternoon | 4:00 PM         | Church service            |
| Evening   | 9:00 PM         | Small group / evening     |
