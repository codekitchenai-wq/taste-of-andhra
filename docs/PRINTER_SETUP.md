# Bill & Kitchen Printer Setup (Swiggy / Zomato style)

When an order is **confirmed**, Taste of Andhra can print two tickets automatically:

| Ticket | Station | Contents |
|--------|---------|----------|
| **Bill / Receipt** | Billing counter | Order #, customer, address, items + prices, totals, payment |
| **KOT** | Kitchen | Order #, items + modifiers, special instructions (no prices) |

This applies to **all orders** (app checkout, phone orders, prepaid, COD) as soon as status becomes `confirmed`.

---

## What you need (hardware)

Same pattern restaurants use with Swiggy Partner / Zomato:

1. **Two 80mm (3-inch) thermal printers** (Ethernet preferred)
   - One at the billing counter
   - One in the kitchen
2. **One always-on PC or mini-PC** on the same LAN as the printers  
   (this is where staff keep the Admin → Kitchen Board open)
3. Network: printers get static LAN IPs (example: `192.168.1.50` billing, `192.168.1.51` kitchen)

USB printers work only if the print agent PC is connected to that USB printer; Ethernet is simpler for a kitchen printer across the room.

Recommended budget brands used widely in India: TVS, Epson TM-T82 / clones, Rongta, Gainscha — any model that supports **raw TCP port 9100**.

---

## How printing works in this app

```
Customer / Phone order
        │
        ▼
Order status → confirmed
        │
        ▼
Kitchen Board (admin browser) detects new confirmed order
        │
        ├─► Billing ticket  ──► Print agent ──► Billing printer
        └─► Kitchen KOT     ──► Print agent ──► Kitchen printer
```

Browsers cannot talk to two network printers silently. That is why a small **local print agent** runs on the restaurant PC (same idea as many POS bridges).

Fallback: **Browser print mode** opens the system print dialog (useful for testing; not ideal for dual silent printing).

---

## Step-by-step setup

### 1. Connect printers

1. Plug each printer into power and Ethernet (or USB for a single local printer).
2. On the printer menu / sticker, note the IP address.
3. From the restaurant PC, verify connectivity:

```powershell
Test-NetConnection 192.168.1.50 -Port 9100
Test-NetConnection 192.168.1.51 -Port 9100
```

`TcpTestSucceeded : True` means the PC can reach the printer’s raw port.

### 2. Start the local print agent

On the billing / kitchen PC (Node.js 20+):

```powershell
cd C:\Projects\taste-of-andhra

$env:BILLING_PRINTER_HOST="192.168.1.50"
$env:KITCHEN_PRINTER_HOST="192.168.1.51"
$env:PRINT_AGENT_PORT="9101"

npm run print-agent
```

Dry-run (writes tickets to `.print-agent-logs/` without contacting printers):

```powershell
$env:PRINT_AGENT_DRY_RUN="1"
npm run print-agent
```

Keep this terminal open (or install the agent as a Windows service / Task Scheduler startup item).

### 3. Configure Admin → Settings

1. Open **Admin → Settings**
2. Find **Bill & Kitchen Printers**
3. Turn **Enable printing** on
4. Set mode to **Local print agent (recommended)**
5. Agent URL: `http://127.0.0.1:9101`
6. Leave printer ids as `billing` and `kitchen` (must match the agent)
7. Keep **Auto-print when order is confirmed** on
8. Click **Test agent** — should show both printers
9. **Save printer settings**

### 4. Keep Kitchen Board open

Auto-print runs from the browser session that has **Admin → Orders (Kitchen Board)** open on the PC next to the printers.

- Accepting a pending order (`pending` → `confirmed`) prints immediately.
- Online prepaid orders that jump straight to `confirmed` also print when the board sees them live.

Manual reprint: open any order → **Print Bill + KOT**.

---

## Ticket contents (what kitchen / cashier see)

**Kitchen KOT**

- Large order number, time, pickup vs delivery, app vs phone
- Qty × item name
- Modifiers (spice, size, add-ons)
- Special instructions
- No prices / totals

**Billing receipt**

- Restaurant name, order number, customer, phone, address
- Itemized amounts, tax, delivery, discount, total
- Payment method + payment status

---

## Browser mode (testing only)

1. Admin → Settings → Print mode → **Browser print dialog**
2. Confirm an order
3. The OS print dialog appears (once per ticket if both are enabled)

To route to a specific Windows printer, set that printer as default, or pick it in the dialog. Dual silent routing still needs the agent.

---

## Checklist

- [ ] Two thermal printers online on LAN (port 9100)
- [ ] Print agent running on restaurant PC
- [ ] Admin settings: printing enabled, agent URL correct, Test agent OK
- [ ] Kitchen Board tab open on that PC
- [ ] Place a test phone order → Accept → bill + KOT print
- [ ] Place a prepaid app order → confirm path → both tickets print
- [ ] Reprint from order detail works

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Test agent fails | Start `npm run print-agent`; allow Node through Windows Firewall for localhost |
| Agent OK, no paper | Wrong printer IP; paper out; printer not in raw ESC/POS mode |
| Only one ticket | Check Billing / Kitchen toggles in settings |
| No auto-print | Enable printing + auto-print; keep Kitchen Board open; order must reach `confirmed` |
| Garbled characters | Printer code page; stick to ASCII-heavy text or configure printer UTF-8 / ESC/POS codepage |
| CORS / blocked | Agent already sends CORS headers; use `127.0.0.1` not a remote IP unless you lock it down |

---

## Security note

The print agent listens on **localhost only** (`127.0.0.1`). Do not expose port 9101 to the public internet. If you need another PC to print, run the agent on that PC or put both PCs on a private VPN/LAN and firewall carefully.
