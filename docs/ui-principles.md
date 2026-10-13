# Interface principles

Rules the screens follow so that people can tell what they can click, without being taught. They come from common usability guidance (affordances and signifiers, target size, accessible cards) and from feedback by the chair panel. New screens should follow them too.

## Clickable things must look clickable

- **A written hint, always visible.** A clickable card ends with a line that says what happens ("View unpaid subscribers", "Review applications") and an arrow. It is not hidden behind hover, because a phone has no hover.
- **A reaction when pointed at.** On a computer the card lifts slightly and its border turns blue, and the cursor becomes a hand.
- **A visible focus ring.** Someone using the keyboard (Tab) sees which card is selected.
- **A card that cannot be clicked has none of this.** The Collection Rate card, for example, is plain, so a look-alike never leads nowhere.
- **One card, one action.** The whole card is a single link or button, with nothing inside it that competes for the click. The title and number are what a screen reader reads as the link.
- **A filter shows that it is on.** A card used as a filter (the status cards on Subscribers) gets a blue outline, a tick, and a hint that reads "Showing unpaid only".

These are built once, in the shared `CardAction` component, and used for the dashboard cards and the status cards on Subscribers.

## Messages and empty lists

- **Messages stay long enough to read.** A success message goes away by itself after about 5 seconds; a message about something that **failed stays until it is closed**, because it has to be read. Pointing at a message pauses it, every message has a close button, and screen readers hear it as soon as it appears. Errors start with the word "Error" so they never depend on colour alone.
- **An empty list explains itself.** It says what the list is for, why it is empty, and what to do. Two different causes get two different wordings: *nothing has been added yet* (with a button for the first step, such as Add Subscriber) and *the filters match nothing* (with a Clear filters button). This is the shared `EmptyState` component.
- **Loading shows the page's shape once, then stays out of the way.** The first load shows grey placeholders. Later refreshes (typing in a search box, changing a filter) dim the table instead of replacing it, so it does not flash and the search box keeps focus.

## Other habits

- **Big enough to hit.** Cards and buttons are well above the 24 by 24 pixel minimum of WCAG 2.2, and most are above the recommended 44.
- **Say what a button does.** Buttons carry a word ("Review", "Record payment"), not only an icon.
- **Check before it cannot be undone.** Things that cannot be edited afterwards (a payment, a plan's rate) open a review window first, and a payment that was still wrong can be cancelled by an administrator with a reason, never rewritten. See [Billing and payments](billing-and-payments.md).
- **Never rely on colour alone.** Statuses use words as well as colours, and the interface was checked for contrast in light and dark mode.
- **Keep the same thing in the same place.** Manage Roles and the Guide are under Settings; the sidebar groups follow the usual order of work.


## Forms

- **Every field is built the same way** (the shared `FormField`): a label, an asterisk when the field is required (with the word "required" for a screen reader), the box, a short hint, and the error underneath. A "* Required" note sits at the top of each form.
- **Check when someone leaves a field, not while they type and not only after sending.** A person is told that a mobile number or email looks wrong as soon as they move on, and the message disappears when they fix it. Nothing is flagged before they have reached the box. Pressing Save with a mistake moves the cursor to the first wrong field.
- **Say what is wrong and how to fix it.** "Enter a mobile number such as 0917 123 4567", not "Invalid input". Messages start with the word "Error", so colour is never the only signal, and each one is tied to its field for screen readers. Nothing the person typed is cleared when there is an error.
- **Dates are spelled out.** Under every date box, the chosen date appears in words ("October 14, 2026"), because browsers show month/day/year or day/month/year depending on their language settings.
- The server still checks everything again; the checks in the browser only save a round trip.

## Tables

- **Sortable columns say so.** A heading that can be sorted shows a faint up-down arrow; the sorted one shows an arrow for its direction, and screen readers hear "ascending" or "descending". Click to sort, click again to reverse, a third click returns to the usual order.
- **A table shows the number people ask about.** The Subscribers list carries a Balance column, because "who owes, and how much" is the first question when collecting.
- **The view survives a refresh.** Search, filters, sort and page are kept in the web address, so refreshing or pressing Back does not lose them and a link opens the same view.
- **Paging is the same everywhere.** Every list ends with how many are shown, a choice of rows per page and numbered pages (shared `Pager`). Long lists are never loaded as one endless page.
