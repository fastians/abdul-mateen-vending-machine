<!-- 2025-11-07 implementation plan -->
# Vending Machine Implementation Blueprint

## 1. Objective Alignment

- **Diagram deliverable**: Produce a one-page (≤3 pages total) visual describing how a user acquires a drink, covering cash and card flows, per `docs/objective.txt`.
- **React + TypeScript implementation**: Build main logic that mirrors the documented flow, emphasizing modularity, clear separation of concerns, edge-case handling, and intuitive UX.
- **Evaluation focus**: Highlight component interactions, state management, UX messaging, and coverage of edge scenarios (insufficient funds, out-of-stock, cancellations, errors) described in `docs/plan.txt`.

## 2. Flow & Diagram Narrative

Use a swimlane or BPMN-style diagram (lanes: *User*, *Vending Machine*, *Payment Processor*) with the following sequence:

1. **Idle → Product Browsing**
   - Display available drinks (`Cola 1,100`, `Water 600`, `Coffee 700`) and status (in/out of stock).
2. **Selection**
   - User selects a drink; machine checks inventory and locks selection.
3. **Payment Choice**
   - Prompt user: insert cash (`100/500/1,000/5,000/10,000`) or tap card.
4. **Cash Path**
   - Accept coins/notes incrementally; show running balance.
   - Branches:
     - `Balance ≥ Price`: proceed to dispense.
     - `Balance < Price`: stay in payment state; display `Insert additional 500 won`, etc.
     - `Cancel`: return inserted cash via change tray; reset to idle.
5. **Card Path**
   - Initiate authorization (async call to `CardHandler`); show `Processing...`.
   - Branches:
     - `Success`: proceed to dispense.
     - `Failure`: prompt retry or alternative payment; option to cancel.
6. **Dispense & Change**
   - Deduct inventory; animate dispensing.
   - For cash, calculate optimal change; if shortage occurs, route to error with attendant alert.
7. **Completion / Error Handling**
   - Success: show `Enjoy your drink!` and reset.
   - Errors: show actionable message (`Out of stock`, `Exact change only`, `Card declined`), return to appropriate state (selection or payment) or escalate to maintenance.

Include callouts for secondary loops: insufficient balance, out-of-stock detected pre-payment, hardware faults (dispense failure) routing to maintenance lane.

## 3. State Machine Definition

Represent central machine logic as a finite state machine (`MachineState`):

- `idle`: Awaiting user; transitions on `userApproach` or `selectItem`.
- `selectionPending`: User browsing; transitions on `itemSelected` → `awaitingPayment`; on `stockDepleted` → `error`.
- `awaitingPayment`: Tracks payment mode; events `insertCash`, `tapCard`, `cancelSelection`.
- `processingPayment`: Card authorization or cash validation; transitions to `dispensing` on `paymentApproved`, to `awaitingPayment` on `paymentRetry`, to `refund` on `cancel`.
- `dispensing`: Controls product delivery; on `dispenseSuccess` → `complete`; on `dispenseFailure` → `error`.
- `refund`: Manages change return or cash refund; on `refundComplete` → `idle`.
- `complete`: Show success message; auto-transition to `idle` after timeout.
- `error`: Display error message; may transition to `awaitingPayment`, `selectionPending`, or `maintenance` depending on issue.
- `maintenance`: Locked state requiring attendant input.

Each transition records a `TransactionEvent` (timestamp, actor, payload) for auditability and to drive UI messaging.

## 4. Architectural Blueprint

### React Component Structure

- `VendingMachine`: Top-level container; provides context/state machine to children.
- `ProductDisplay`: Lists drinks, stock, price; emits `selectDrink`.
- `SelectionSummary`: Shows selected drink, price, and prompts for payment.
- `PaymentPanel`
  - `PaymentSelector`: Cash vs card toggle.
  - `CashInput`: Denomination buttons; displays inserted totals.
  - `CardPayment`: Mock authorization UI with status feedback.
- `BalanceDisplay`: Shows current credit or authorization status.
- `MessageDisplay`: Centralized user guidance/error messaging tied to machine state.
- `ChangeReturn`: Visualizes returned cash/change outcome.
- `AdminPanel` (optional stretch): Restock, diagnostics, maintenance override.

### Services & Utilities

- `TransactionController`
  - Orchestrates state transitions; consumes events from UI components.
- `InventoryService`
  - Manages `InventorySlot` data, stock checks, and restock operations.
- `PaymentProcessor`
  - `CashHandler`: Acceptable denominations, balance tracking, refund/change operations.
  - `CardHandler`: Simulated async authorization with success/failure probabilities.
- `ChangeCalculator`
  - Greedy or dynamic algorithm using available cash to produce optimal change; flags shortage.
- `StatePersistence` (optional): Allows recovery after refresh (e.g., keep transaction in progress).

### TypeScript Interfaces

- `type Denomination = 100 | 500 | 1000 | 5000 | 10000;`
- `interface Drink { id: string; name: string; price: number; }`
- `interface InventorySlot { drinkId: string; stock: number; }`
- `interface MachineState { status: MachineStatus; selectedDrink?: string; balance: number; pendingPayment?: PaymentIntent; message: string; }`
- `type MachineStatus = 'idle' | 'selectionPending' | 'awaitingPayment' | 'processingPayment' | 'dispensing' | 'refund' | 'complete' | 'error' | 'maintenance';`
- `interface PaymentResult { success: boolean; message: string; change?: number[]; errorCode?: string; }`
- `interface TransactionEvent { type: string; timestamp: number; payload?: Record<string, unknown>; }`
- `interface ChangeBreakdown { denominations: Record<Denomination, number>; total: number; shortage: boolean; }`

## 5. Scenario Narratives & UX Messaging

### A. Cash Purchase Success
- Preconditions: Drink in stock; user inserts sufficient cash.
- Steps: select → insert denominations → balance reaches price → machine dispenses → change returned if balance > price.
- UX: Messages progress through `Select payment method`, `Insert 500 won`, `Dispensing Cola`, `Change: 400 won`.

### B. Cash Insufficient Funds
- Preconditions: Drink in stock; user inserts partial cash.
- Steps: selection → partial insertion → machine prompts for more → user cancels or adds funds.
- UX: `Current balance 700 won, need 400 more`; on cancel `Returning 700 won` and revert to idle.

### C. Card Authorization Success
- Preconditions: Card handler available.
- Steps: selection → card tap → `processingPayment` → approval → dispense.
- UX: `Authorizing...` → `Payment approved` → `Dispensing Water`.

### D. Card Authorization Failure
- Steps: selection → card tap → failure (`errorCode: DECLINED`).
- UX: `Card declined. Try again or choose cash`; user may retry or cancel.
- State transition: `processingPayment` → `error` → back to `awaitingPayment`.

### E. Out-of-Stock Detection
- Steps: user selects depleted drink; `InventoryService` emits `stockDepleted`.
- UX: `Coffee unavailable. Please choose another drink`; remain in `selectionPending`.

### F. Change Shortage
- Preconditions: Machine lacks required change.
- Steps: cash purchase requiring change; `ChangeCalculator` flags shortage.
- UX: `Exact change only. Cancelled` → automatic refund → optional maintenance alert.

### G. Cancel Mid-Transaction
- Steps: selection → partial payment → user cancels.
- UX: `Cancelling... returning inserted cash`; transitions to `refund` then `idle`.

### H. Hardware/Dispense Failure
- Steps: payment approved → dispense fails.
- UX: `Dispense error. Please contact support`; transitions `dispensing` → `error` → `maintenance`.

Each scenario should be reflected in documentation and tests to satisfy evaluation focus on edge-case handling.

## 6. Next Steps Toward Implementation

1. **Diagram creation**: Use Excalidraw, draw.io, or Mermaid to map flow detailed above; ensure loops and error paths are clear.
2. **State machine modeling**: Implement state definitions with XState or custom reducer/hook; plan tests covering transitions.
3. **Component scaffolding**: Create React component structure and context provider; stub services with TypeScript interfaces.
4. **Service logic**: Implement `InventoryService`, `PaymentProcessor`, `ChangeCalculator` with unit tests for edge cases.
5. **UX messaging**: Centralize messages in `MessageDisplay` or context to keep UX consistent.
6. **Integration tests**: Script scenarios A–H using React Testing Library or Cypress to ensure flows behave as documented.

Completing these steps will translate the documented plan into a maintainable React/TypeScript implementation aligned with project objectives.

