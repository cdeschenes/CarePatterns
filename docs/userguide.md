# CarePatterns User Guide

CarePatterns is a mobile-first tracker for medications, procedures, and personal health goals. Log a dose with a single tap, set daily limits and schedules, get in-app reminders, and export your history whenever you need it.

This guide walks through every screen in the app.

---

## Dashboard

<p align="center">
  <img src="screenshots/main_screen.png" width="320" alt="Dashboard" />
</p>

The dashboard is your home screen. Each item you have created appears as a colored card.

- **Tap a card** to log a dose immediately. The color fill rises to reflect how many doses you have taken relative to your daily limit.
- **Dose count** is shown on each card so you can see at a glance where you stand for the day.
- **Drag the ⠿ handle** on the right edge of any card to reorder your list. Your order is saved automatically.
- The **bottom navigation bar** lets you jump to Reports and Settings from any screen.

---

## Adding an Item

<p align="center">
  <img src="screenshots/add_item.png" width="320" alt="Add Item" />
</p>

Tap the **+** button on the dashboard to open the Add Item form.

| Field | Description |
|-------|-------------|
| **Name** | What you want to call this item (e.g. "Vitamin D", "Morning Walk"). |
| **Category** | Group similar items together for filtering in Reports. |
| **Color** | Pick any color from the palette — this becomes the card's accent color on the dashboard. |
| **Description** | Optional notes (dosage, instructions, reminders to yourself). |
| **Daily dose limit** | Set a maximum number of doses per day. The card fill tracks progress toward this limit. Leave blank for unlimited. |
| **Schedule** | Define the days and times when this item is active. CarePatterns will remind you if you miss a scheduled dose. |

Tap **Save** to add the item to your dashboard.

---

## Reports

<p align="center">
  <img src="screenshots/reports.png" width="320" alt="Reports" />
</p>

The Reports screen lets you review and export your logging history.

1. **Filter by item** — select one or more items from the dropdown, or leave it blank to include everything.
2. **Filter by date range** — choose a start and end date to narrow the results.
3. Tap **Run Report** to generate the table.
4. Tap **Download CSV** to save a `carepatterns-export-YYYY-MM-DD.csv` file to your device.
5. Tap **Share via Email** to open your mail client with a pre-filled message body. Attach the CSV file manually before sending — browsers cannot auto-attach files via mailto links.

---

## Settings

<p align="center">
  <img src="screenshots/settings.png" width="320" alt="Settings" />
</p>

The Settings screen has two sections.

### Themes

CarePatterns ships with 8 built-in themes. The currently active theme is highlighted. Tap any theme to switch instantly — no restart required.

| Theme | Style |
|-------|-------|
| Catppuccin Latte | Soft pastel light theme |
| Catppuccin Frappé | Muted mid-tone dark theme |
| Catppuccin Macchiato | Warm dark theme |
| Catppuccin Mocha | Deep dark theme |
| Dracula | High-contrast purple dark theme |
| Nord | Cool blue-grey dark theme |
| Solarized Light | Classic warm light theme |
| Solarized Dark | Classic warm dark theme |

### About

The About section shows the app version and links to project information.
