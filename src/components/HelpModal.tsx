import { HelpCircle, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface HelpModalProps {
  open: boolean;
  onClose(): void;
}

/**
 * Modal component that displays help information for using the vending machine.
 * Provides step-by-step instructions for customers.
 */
export function HelpModal({ open, onClose }: HelpModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-3 backdrop-blur transition-opacity duration-300 sm:p-4"
      onClick={onClose}
    >
      <Card
        className="relative w-full max-w-2xl border border-border/40 bg-white shadow-2xl transition-all duration-300 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 bg-muted px-4 py-4 sm:px-6 sm:py-5">
          <CardTitle className="text-base font-semibold text-foreground sm:text-lg">How to Use</CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 sm:h-9 sm:w-9"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </CardHeader>
        <CardContent className="max-h-[70vh] overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
          <div className="space-y-6">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Getting Started</h3>
              <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                <li>Browse the available drinks on the main screen</li>
                <li>Tap on the drink you want to purchase</li>
                <li>Select your preferred payment method (Cash or Card)</li>
              </ol>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Paying with Cash</h3>
              <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                <li>Select "Pay with Cash" after choosing your drink</li>
                <li>Insert bills using the denomination buttons (₩100, ₩500, ₩1,000, ₩5,000, ₩10,000)</li>
                <li>Continue inserting until you reach the required amount</li>
                <li>Change will be automatically returned if you insert more than needed</li>
                <li>Your drink will dispense once payment is complete</li>
              </ol>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Paying with Card</h3>
              <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                <li>Select "Pay with Card" after choosing your drink</li>
                <li>Tap the "Tap card to authorize" button</li>
                <li>Wait for payment authorization (usually takes a few seconds)</li>
                <li>Your drink will dispense once payment is approved</li>
              </ol>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Canceling an Order</h3>
              <p className="text-sm text-muted-foreground">
                You can cancel your order at any time before payment is completed. If you've inserted cash, it will be
                fully refunded. Card payments can be canceled before authorization.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Tips</h3>
              <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                <li>Make sure you have enough cash or a valid card before starting</li>
                <li>Check the stock availability before selecting a drink</li>
                <li>If a drink is out of stock, it will be marked as "Sold Out"</li>
                <li>The screen will automatically return to the main menu after 10 seconds of inactivity</li>
              </ul>
            </section>

            <section className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
              <p className="text-xs font-semibold text-foreground">Need Assistance?</p>
              <p className="mt-1 text-xs text-muted-foreground">
                If you encounter any issues, please contact customer support or use the admin panel for technical
                assistance.
              </p>
            </section>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

