# Vending Machine Flow Diagram

This diagram illustrates the complete user journey and machine state transitions for the vending machine system, covering all scenarios from drink selection to completion or error handling.

```mermaid
flowchart TD
    Start([User Approaches Machine]) --> Idle[Idle State<br/>Display Available Drinks]
    
    Idle --> Browse[User Browses Drinks]
    Browse --> Select{User Selects Drink}
    
    Select -->|Drink Selected| CheckStock{Drink In Stock?}
    CheckStock -->|No| OutOfStock[Show Out of Stock Message]
    OutOfStock --> Browse
    
    CheckStock -->|Yes| ConfirmSelection[Confirm Selection<br/>Show Drink & Price]
    ConfirmSelection --> ChoosePayment{Choose Payment Method}
    
    %% Cash Payment Flow
    ChoosePayment -->|Cash| CashFlow[Cash Payment Flow]
    CashFlow --> InsertCash[User Inserts Cash<br/>₩100 / ₩500 / ₩1,000 / ₩5,000 / ₩10,000]
    InsertCash --> UpdateBalance[Update Balance]
    UpdateBalance --> CheckBalance{Balance >= Price?}
    
    CheckBalance -->|No| ShowRemaining[Show Remaining Amount Needed]
    ShowRemaining --> InsertCash
    
    CheckBalance -->|Yes| CheckChange{Change Needed?}
    CheckChange -->|Yes| CalculateChange[Calculate Change]
    CalculateChange --> ChangeAvailable{Change Available?}
    
    ChangeAvailable -->|No| RefundCash[Refund All Inserted Cash<br/>Show Error Message]
    RefundCash --> ChoosePayment
    
    ChangeAvailable -->|Yes| ApproveCash[Payment Approved<br/>Deduct from Inventory]
    CheckChange -->|No| ApproveCash
    
    %% Card Payment Flow
    ChoosePayment -->|Card| CardFlow[Card Payment Flow]
    CardFlow --> TapCard[User Taps Card to Authorize]
    TapCard --> Authorizing[Authorizing Payment...]
    Authorizing --> AuthResult{Authorization Result?}
    
    AuthResult -->|Approved| ApproveCard[Payment Approved<br/>Deduct from Inventory]
    AuthResult -->|Declined| CardDeclined[Card Declined<br/>Show Error Message]
    CardDeclined --> ChoosePayment
    
    %% Dispensing Flow
    ApproveCash --> Dispensing[Dispensing Drink...]
    ApproveCard --> Dispensing
    
    Dispensing --> DispenseCheck{Dispense Success?}
    DispenseCheck -->|Failure| DispenseError[Dispense Error<br/>Enter Maintenance Mode]
    DispenseError --> Maintenance[Maintenance Mode<br/>Contact Support]
    
    DispenseCheck -->|Success| CheckChangeReturn{Change to Return?}
    CheckChangeReturn -->|Yes| ReturnChange[Return Change<br/>Show Breakdown]
    ReturnChange --> Complete[Transaction Complete<br/>Show Receipt]
    
    CheckChangeReturn -->|No| Complete
    
    Complete --> AutoReset[Auto Reset after 10s<br/>or User Clicks Buy Again]
    AutoReset --> Idle
    
    %% Cancellation Flow
    ChoosePayment -->|Cancel| CancelCheck{Any Cash Inserted?}
    CashFlow -->|Cancel| CancelCheck
    CardFlow -->|Cancel| CancelCheck
    
    CancelCheck -->|Yes| RefundCancel[Refund Inserted Cash<br/>Show Breakdown]
    RefundCancel --> CancelComplete[Transaction Cancelled]
    CancelCheck -->|No| CancelComplete
    CancelComplete --> Idle
    
    %% Styling
    classDef userAction fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    classDef machineState fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef decision fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef error fill:#ffebee,stroke:#c62828,stroke-width:2px
    classDef success fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    
    class Start,Browse,Select,InsertCash,TapCard,ShowRemaining userAction
    class Idle,ConfirmSelection,CashFlow,CardFlow,UpdateBalance,Authorizing,Dispensing,Complete machineState
    class CheckStock,ChoosePayment,CheckBalance,CheckChange,ChangeAvailable,AuthResult,DispenseCheck,CheckChangeReturn,CancelCheck decision
    class OutOfStock,CardDeclined,DispenseError,Maintenance,RefundCash error
    class ApproveCash,ApproveCard,ReturnChange,Complete success
```

## Flow Description

### Main Flow
1. **Idle State**: Machine displays available drinks (Cola ₩1,100, Water ₩600, Coffee ₩700)
2. **Selection**: User selects a drink → Machine checks stock availability
3. **Payment Method**: User chooses Cash or Card payment
4. **Payment Processing**: 
   - **Cash**: Insert denominations → Balance check → Change calculation
   - **Card**: Tap card → Authorization → Approval/Decline
5. **Dispensing**: Machine dispenses drink after successful payment
6. **Completion**: Return change (if any) → Show receipt → Auto-reset

### Error Scenarios
- **Out of Stock**: User selects unavailable drink → Show message → Return to browsing
- **Insufficient Change**: Cash payment but machine cannot provide change → Refund all cash → Return to payment selection
- **Card Declined**: Authorization fails → Show error → Return to payment selection
- **Dispense Failure**: Hardware error → Enter maintenance mode

### Cancellation Flow
- User can cancel at payment selection
- If cash inserted, machine refunds all inserted cash with breakdown
- Returns to idle state

## Key Features Covered

✅ **Payment Methods**: Cash (₩100-₩10,000) and Card payments  
✅ **Drink Inventory**: Cola, Water, Coffee with stock tracking  
✅ **Change Handling**: Automatic calculation and return  
✅ **Error Handling**: Out of stock, change shortage, card decline, dispense failure  
✅ **Cancellation**: Full refund with breakdown  
✅ **User Experience**: Clear messaging at each step  

## State Machine States

- `idle`: Ready for next customer
- `awaitingPayment`: Waiting for payment method selection
- `processingPayment`: Card authorization in progress
- `dispensing`: Drink being dispensed
- `refund`: Returning cash/change
- `complete`: Transaction finished
- `maintenance`: Machine error requiring support
