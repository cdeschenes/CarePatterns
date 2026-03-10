# CarePatterns Smoke Test Checklist

Manual checklist to verify a fresh `docker compose up --build` produces a
fully working app. Run top-to-bottom after any significant change or before
tagging a release.

---

## Prerequisites

1. [ ] Copy `.env.example` to `.env` and fill in `SECRET_KEY` / `VITE_API_TOKEN` with the same value.
2. [ ] Run `docker compose up --build` and wait for both services to be healthy.
3. [ ] Open `http://localhost:3000` in a mobile-emulation browser viewport (375 px wide).

---

## 1. Initial Load

- [ ] The page loads without a white flash — the Vibrant Dark theme defaults are visible immediately.
- [ ] The bottom navigation shows Dashboard, Add, Reports, and Settings tabs.
- [ ] The header shows the CarePatterns title.

---

## 2. Items — Create

- [ ] Tap the **+** button in the bottom nav.
- [ ] Fill in Name, select a built-in Category (e.g. "Medication"), add an optional Description.
- [ ] Set frequency to "Daily".
- [ ] Tap **Save**. Confirm the new item appears in the dashboard list.
- [ ] The item card shows the category and "Never logged" label.

---

## 3. Items — Log Entry

- [ ] Tap the **Log** button on a card.
- [ ] Confirm the button shows a spinner then a green checkmark for ~2 seconds.
- [ ] After the state resets, the card shows "Last logged just now" (or similar time-ago label).

---

## 4. Items — Reminders

- [ ] Create an item with a schedule that is already overdue (e.g. "Daily", starts yesterday).
- [ ] Wait up to the poll interval (default 60 s) or refresh — the reminder modal should appear.
- [ ] The modal lists the overdue item. Tap **Log** inside the modal.
- [ ] Confirm the row disappears and the modal closes when the last item is logged.

---

## 5. Items — Detail & Edit

- [ ] Tap an item card's info area to open the detail page.
- [ ] Confirm name, category, description, and schedule are displayed.
- [ ] Tap **Edit**. Change the name and save. Confirm the updated name appears.
- [ ] Tap **Archive**. Confirm the item disappears from the dashboard.

---

## 6. Items — Reorder

- [ ] On the Dashboard, drag the handle on an item card to a new position.
- [ ] Reload the page. Confirm the custom order persists.

---

## 7. Reports

- [ ] Navigate to the Reports tab.
- [ ] Select an item filter, optionally set a date range, and tap **Run Report**.
- [ ] Confirm log entries appear with the correct Item name and Category column filled in.
- [ ] Tap **Export CSV** and verify the file downloads with a `.csv` extension and opens correctly.

---

## 8. Themes

- [ ] Navigate to Settings.
- [ ] Confirm all 8 theme tiles are shown (Light, Dark, Nord, Dracula, GitHub Dark, Tokyo Night, Catppuccin, Vibrant Dark).
- [ ] Tap **Light**. Confirm the UI switches to the light palette immediately.
- [ ] Reload the page. Confirm the light theme persists.
- [ ] Switch back to Vibrant Dark and verify the same behavior.

---

## 9. PWA Install

- [ ] In Chrome/Edge mobile emulation, open the browser menu.
- [ ] Verify "Install app" or "Add to Home Screen" is offered.
- [ ] (Optional) Install and relaunch — confirm the app opens in standalone mode.

---

## 10. Backend Health

- [ ] Run `curl -s http://localhost:8000/health` — expect `{"status":"ok"}`.
- [ ] Run `docker compose ps` — confirm both services show `healthy` or `running`.

---

## 11. Cold Restart

- [ ] Run `docker compose down` then `docker compose up` (no `--build`).
- [ ] Confirm all previously created items and log entries are still present (data persisted via named volume).
