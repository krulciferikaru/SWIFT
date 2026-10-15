# Offline behaviour and errors

## SWIFT needs an internet connection

All information lives in the central database. The website does **not** keep a copy of subscribers, payments or reports for offline use. There is no installed app and no offline mode, so without a connection nothing can be loaded or saved. What SWIFT does is **fail clearly**: it tells the person what happened, keeps what they typed, and recovers by itself when the connection returns.

## When the connection drops

| What the person sees or does | What SWIFT does |
|---|---|
| The device goes offline | An amber banner appears across the top of every page: "You're offline. You can still read what's on screen, but saving changes needs a connection." A short green "You're back online" note follows when it returns. Screen readers are told once. |
| They try to save something (add a subscriber, record a payment, change a plan, and so on) | The save is stopped **immediately**, not after a 30-second wait. A message says nothing was sent, and **the form stays open with everything that was typed**. |
| A page was open when the connection dropped | What was already on screen stays readable. The lists (Subscribers, Pending Approvals, Service Plans, Manage Roles, Archive, Audit Trail) **reload by themselves** when the connection comes back. |
| They open SWIFT while offline, or the server is down | They are **not signed out**. A "Can't reach SWIFT" screen explains, with a **Try again** button, and it tries again when the connection returns. |
| The server does not answer, or answers too slowly | The message says so ("Can't reach the server", "The server took too long to answer"), instead of each page's generic "Failed to ...". |

One shared piece of code produces these messages, so every page behaves the same way. Saving a subscriber used to fail silently for any problem other than a validation error; it now always shows the reason.

### Reports offline

Reports never show sample numbers. When you are offline or a request fails, a red message explains what happened, Reload and the PDF / Excel downloads are disabled, and the report loads again by itself when the connection returns. Reports remember what they loaded for **one minute**, so switching between periods is quick; **Reload** always fetches fresh data.

| Situation on Reports | What you see |
|---|---|
| Server unreachable | "Can't reach the server..." with a **Try again** button |
| Server error | The server's message, with **Try again** |
| Too many requests | "Please wait N seconds", and it retries once on its own |
| A date range that is not valid | The page says what is wrong and keeps showing the last valid range |

## Loading placeholders

While a page loads, grey placeholder shapes show roughly what is coming (the same layout as the real page, including the cards on a phone), so nothing jumps when the data arrives. They are announced to screen readers once as "Loading".

## What the browser remembers on the device

It holds no subscriber data and is not shared.

| Remembered | Where | Why |
|---|---|---|
| The sign-in token | Session storage normally (gone when the browser closes); local storage if "Keep me signed in" is ticked | So you stay signed in. The server also ends every sign-in **an hour after its last use** (the open page keeps it alive), or **7 days** if kept |
| Dark or light mode, text size, whether the sidebar is open | Local storage | Your preferences |
| The Activity period chosen on the dashboard | Local storage | Your preference |
| Whether you have seen the welcome tour, and the "Take a tour" switch | Local storage | Tour settings |
| The "don't ask me again" choice on logout | Local storage | Your preference |

## Signing in: wrong passwords and pauses

- A wrong password stays on the sign-in page with a message. The page does not reload and the account name stays filled in.
- Wrong passwords are counted **per account**: **5 inside 15 minutes** pauses sign-in for that account until the 15 minutes pass. From 2 attempts left the page warns. While paused the page counts down and the button is disabled, then it unlocks by itself.
- The count also applies to names that do not exist, so the replies never reveal which accounts are real.
- A lock is written to the audit trail. It can be changed with `LOGIN_MAX_FAILURES` and `LOGIN_LOCKOUT_MINUTES`.

## "Confirm your password"

Changing a secretary's permissions, and permanently deleting from the Archive ask the person to type their own password again. A window opens, the action carries on by itself once the password is right, and it stays confirmed for **10 minutes** for that sign-in. Cancelling changes nothing.

## Limits that can appear as errors

To protect the system from abuse, some actions are limited. Each limit counts per person (or per address for registration).

| Action | Limit |
|---|---|
| Logging in (requests) | 5 a minute, per email or number and address; and the wrong-password pause above |
| Registering | 5 an hour, per address |
| Sending SMS | 10 a minute |
| Asking for a phone verification code | 1 a minute, 3 every 10 minutes |
| Trying a verification code | 10 a minute, and 5 wrong tries per code |
| Confirming your password | 5 a minute |
| Looking at reports on screen | 60 a minute |
| Downloading report files | 15 a minute |

When a request limit is reached the message says to wait a moment, and a countdown or an automatic retry follows where it makes sense.
