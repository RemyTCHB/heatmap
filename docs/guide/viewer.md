# Viewer Guide

This guide is for everyone at TCHB: what the Deals Heat Map shows and how to read it. Remy, Monz and Jan can also change contracts; their Editor Guide adds those parts.

## Getting Started

Open **heatmap.totalchb.com** and click **Sign In With Google**. Use your company Google account (totalchb.com or kpidriver.com). The page opens on the whole picture: totals at the top, the map, the contract list, the charts and the leaderboards.

![The top of the page: the live clock, the totals and the filters](overview.jpg)

The header works like the Hub's:

- **The clock** is the live status. Green means everything is saved and up to date. Blue means a change is being saved. Red means something did not save: click the clock and press **Retry Now**.
- **Active** shows how many people have the page open. Click it to see who, and whether they are on a phone or a computer.
- **The sun and moon** switch between the light and dark look.
- **Your photo** opens your menu: Settings, Team Members, Help and Sign Out.

![Click the clock for the last sync time](live-clock.jpg)

![Click Active to see who is online](active.jpg)

The page checks for new contracts every minute, so a contract that signs, closes or cancels in GoHighLevel shows up on its own. You never need to reload.

## The Totals

The tiles under the title count the contracts that match the filters:

- **Total Contracts**, **Signed · Open**, **Closed** and **Cancelled**.
- **Close Rate**: closed contracts out of every contract that has finished (closed or cancelled). Open contracts do not count until they finish.
- **Actual Revenue**: the revenue from every closing, Fix & Flip resales included.
- **Avg Revenue Per Close**: actual revenue divided by the closed contracts.

## Filtering

Everything on the page follows the filters: the totals, the map, the contract list, the charts, the leaderboards and Where To Market. The filters stay pinned under the header as you scroll.

- **All, Signed, Closed, Cancelled**: click one to see only those contracts; click more to combine them; **All** brings back everything.
- **Needs Review**: only the contracts that have something to check (see A Contract's Details).
- **The period**: All Time, This Year, Last 90 Days, Last 30 Days, or **Custom Range**. A contract counts in the period of its last event (the day it closed or cancelled, or the day it signed if it is still open).
- **ACQ, DISPO, FUS, Lead Source and Exit**: pick one to see only their contracts.
- **A state**: click a state on the map to see only its contracts. The state shows as a chip in the filters; click its × to clear it.

### Picking A Custom Range

Choose **Custom Range…** in the period filter. Click the first day, then the last day; the days between are shaded. Use the arrows to move between months, then press **Apply**. Choose **All Time** to clear it. To change the range, open Custom Range again.

![The custom range calendar, like the Hub's due-date picker](custom-range.jpg)

## The Map

The map has three views. Switch between them at its top left.

### Pins

Every contract is a pin at its street address. The shape and colour tell you where it stands:

| Pin | Means |
| --- | --- |
| Blue circle | Signed, still open |
| Green diamond | Closed |
| Red X | Cancelled |
| A blue circle with a blue ring pulsing around it | Signed in the last 14 days |

Hover a pin for the contract's details; click it to open the contract. State initials sit on every state, and the small northeastern states appear as you zoom in.

![Pins: every contract at its address, with state initials](map-pins.jpg)

### Heat

The map is split into hexagons, each shaded by the contracts inside it: the darker, the more. Use the menu next to the views to shade by **Contracts**, **Actual Revenue** or **Close Rate**. Hover a hexagon for its numbers and its top cities; click it to zoom in on that area.

![Heat: hexagons shaded by contracts](map-heat.jpg)

### States

Each state is shaded by the measure you pick: contracts, actual revenue, close rate or cancel rate. Every state shows its initials, even with no contracts. Hover a state and it grows out with its numbers; click it to filter the page to that state.

![States: each state shaded by the measure you pick](map-states.jpg)

### Zooming And Moving

- On a computer: hold **Ctrl** (or **⌘** on a Mac) and scroll, or pinch on a trackpad. A plain scroll moves the page, not the map. Drag to move a zoomed map.
- On a phone: use **two fingers** to zoom and move the map. One finger scrolls the page.
- The **+**, **−** and **⤢** buttons zoom in, zoom out and show the whole country again.

### Full Screen

Press **Full Screen** at the top right of the map to fill the window with it, Latest Activity beside it. Everything works the same: hover, click a pin, switch views. In full screen a plain scroll zooms the map. Press **Exit Full Screen** or Esc to go back. On a phone, turn it sideways for a bigger map.

### Latest Activity

Beside the map, the newest signed, closed and cancelled contracts are listed. Click one to open it.

## The Contract List

Under the map, every contract that matches the filters is listed: Last Event first, then Signed, Status, the full Address (street, city, state and ZIP together), Lead Source, ACQ, DISPO, FUS, Potential, Actual and Exit Strategy. Click a heading to sort by it (click again to flip the order). Click a row to open the contract. A red ⚑ line under an address means the contract needs review.

![The contract list](deal-list.jpg)

Press **Full Screen** next to the heading to fill the window with the list; press **Exit Full Screen** or Esc to go back.

On a phone, the list shows as cards; press **Show More** at the bottom for more contracts.

## A Contract's Details

Clicking a pin, a row or a Latest Activity item opens the contract on the right: its status, address, lead source, people, revenue and dates.

![A contract, as everyone sees it](deal-panel-view.jpg)

- **Fix & Flips** show both closings: the purchase and the resale, each with its date and revenue. Actual revenue is the two added together.
- **Feedback** is the general Feedback field from GoHighLevel. **Cancel Reason** is the feedback a contract carried when it was cancelled.
- **History** lists what happened and who did it: GoHighLevel for the hooks, CSV History for the contracts loaded from the old sheets, or the name of the person who changed it.
- **Needs Review** at the top lists anything to check, such as a closed contract with no DISPO.

## How Contracts Arrive

Contracts come from GoHighLevel. When a contract moves to **Contract Signed**, **Closed** or **Cancelled**, GoHighLevel sends it here, and the contract is matched by its **contact ID**.

- **The date of each event is the day it happens.** A contract signed today shows signed today; a contract that closes tomorrow shows closed tomorrow.
- **Closed** records the revenue from **AB Profit (TC)**.
- **A second Closed** on the same contract is a **Fix & Flip** resale: its revenue (**BC Profit**) is added to the contract.
- **Cancelled** keeps the **Feedback** as the cancel reason.
- A new lead source or exit strategy from GoHighLevel is added to the lists on its own, marked **New From CRM**.
- Contracts from before go-live came from the old Signed, Cancelled and Revenues sheets and are marked **CSV History**.

## Month By Month

Two charts show the last 12 months: **Contracts Per Month** (signed, closed and cancelled side by side) and **Revenue Per Month** (with the 12-month total). Hover a month for its numbers. They follow the filters.

![Month By Month](month-by-month.jpg)

## Leaderboards

Fifteen boards rank the team and the markets: Top ACQ, Top DISPO, Top FUS, Top Cities, Top States, Highest Avg Revenue Per State, Top Lead Sources, Where We Lose Contracts, Cancels By ACQ, Speed To Contract, Exit Strategy Mix, Best ACQ + DISPO Pairs, Biggest Contracts, Fastest To Close and Open Contracts By State.

- The small switch on a board changes what it ranks by (for example Revenue, Closes or Close %).
- **Show Top 10** lists more.
- Rates only count people and places with enough finished contracts to be fair (the board says how many).
- Click a state on Top States to filter the page to it; click a contract on Biggest Contracts to open it.

![Leaderboards](leaderboards.jpg)

## Where To Market

Three cards turn the numbers into suggestions. They compare each area with the team as a whole and follow the filters.

- **Market More Here**: states and cities that close more often than the team and make more per close, with the lead source that brought the most revenue there.
- **Pull Back Here**: areas with a low close rate, or that close but make well under the team's average.
- **Fix The Fall-Outs**: cancel reasons grouped into themes (the seller backed out, price, title or probate, repairs, no buyer, financing, an agent or another offer, could not reach the seller), each with a way to prevent it, and examples. Until cancel reasons arrive, it shows where contracts fall out by lead source, ACQ and state.

![Where To Market](where-to-market.jpg)

## Team Members

Your photo → **Team Members** shows the team, mirrored from the Hub's Team Members: Managers, then each department, with photos, roles and emails. **Can Edit** marks the people who can change contracts here. People who are on contracts but not in the Hub show at the bottom: **No Hub Login** (such as the AI agents) and **Former Members**.

![Team Members, mirrored from the Hub](team-members.jpg)

The team refreshes once a day. Press **Refresh From Hub** to pull it now. Add, move or rename people in the Hub, not here.

## On A Phone

The page works on a phone the same way:

- The header shows the round TCHB mark, the clock and your photo. **Who's Online**, the light and dark switch, Settings, Team Members, Help and Sign Out are in your photo menu.
- The filters scroll sideways. The contract list shows as cards.
- On the map, two fingers zoom and move it.

![On a phone](phone:phone.jpg)

![The photo menu on a phone](phone:phone-menu.jpg)

## Troubleshooting

- **The clock is red.** Something did not save or the page lost its connection. Click the clock and press **Retry Now**.
- **"This account is not allowed."** Sign in with your company Google account (totalchb.com or kpidriver.com).
- **The Google window closes straight away.** Your browser blocked the pop-up. Allow pop-ups for heatmap.totalchb.com and try again.
- **A contract is missing from the map.** It has no street address the map can find. It is still in the contract list with a Needs Review note; Remy, Monz or Jan can fix its address.
- **Something looks out of date.** The page refreshes every minute; reload it if you want it now.
