# Offline behaviour and errors

## SWIFT needs an internet connection

All information lives in the central database. The website does **not** keep a copy of subscribers, payments or reports for offline use. There is no installed app and no offline mode, so without a connection nothing can be loaded or saved.

What the browser does remember on the device (it is not shared and holds no subscriber data):

| Remembered | Why |
|---|---|
| The login token | So you stay signed in between visits, until you log out |
| Dark or light mode, whether the sidebar is open | Your preferences |
| Whether you have seen the welcome tour, and the "Take a tour" switch | Tour settings |
| The "don't ask me again" choice on logout | Your preference |

## Reports offline

Reports used to show **sample numbers** when the connection failed. That was removed. Now, when you are offline or a request fails:

- A red message explains what happened. Nothing from a report is shown.
- Reload and all PDF / Excel downloads are disabled, and no requests are sent.
- When the connection comes back, the report loads again by itself.

Other kinds of failure on the Reports page:

| Situation | What you see |
|---|---|
| Server unreachable | "Can't reach the server..." with a **Try again** button |
| Server error | The server's message, with **Try again** |
| Too many requests | "Please wait N seconds", and it retries once on its own |

Reports remember what they loaded for **one minute**, so switching between Monthly, Last 3 Months and Annual is quick and does not repeat requests. **Reload** always fetches fresh data.

## Other pages

The other pages show their usual error message when a request fails and show no data. **To verify:** switch the browser to Offline (developer tools, Network) on each page and note what appears, because only the Reports page was tested for this.

## Limits that can appear as errors

To protect the system from abuse, some actions are limited. Each limit counts per person (or per address for registration):

| Action | Limit |
|---|---|
| Logging in | 5 attempts a minute, per email or number and address |
| Registering | 5 an hour, per address |
| Sending SMS | 10 a minute |
| Looking at reports on screen | 60 a minute |
| Downloading report files | 15 a minute |

When a limit is reached the message says "Too Many Attempts". Waiting a minute clears it.
