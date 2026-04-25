import { useState } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface OnboardingScreen {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const ONBOARDING_SCREENS: OnboardingScreen[] = [
  {
    title: "Welcome to Recuro",
    description:
      "Recuro enables you to accept recurring stablecoin payments on Solana. Your subscribers authorize payments once, and you can charge them automatically on your schedule—no payment processor needed. All transactions are transparent, low-cost, and fully programmable. Let's explore how to get started.",
    icon: "🚀",
  },
  {
    title: "Create Your First Plan",
    description:
      "A subscription plan defines what you're charging for. Set a price in USDC, USDT, or PYUSD, choose a billing interval (daily, weekly, monthly, or custom), and give it a name. Once created, you'll get a shareable link to send to subscribers. Creating a plan takes less than a minute and can be updated anytime.",
    icon: "📋",
  },
  {
    title: "Subscribers Authorize Once",
    description:
      "When your subscriber clicks your plan link, they connect their wallet and approve a scoped delegation to Recuro's guard program. This authorization is single-transaction and explicitly limited—they control exactly what and when you can charge. No recurring app stores, no third-party custody of funds.",
    icon: "✅",
  },
  {
    title: "You're Ready to Charge",
    description:
      "After a subscriber authorizes, you can execute payments on your chosen schedule. Recuro's keeper network handles automation, or you can trigger payments manually. Track all transactions in your dashboard, manage subscribers, and pause or resume new subscriptions anytime. Monitor revenue in real-time with built-in analytics.",
    icon: "💰",
  },
];

interface OnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export default function OnboardingModal({
  open,
  onOpenChange,
  onComplete,
}: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const screen = ONBOARDING_SCREENS[step];

  const handleNext = () => {
    if (step < ONBOARDING_SCREENS.length - 1) {
      setStep(step + 1);
    } else {
      onOpenChange(false);
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) {
          setStep(0);
          onComplete();
        }
      }}
    >
      <DialogContent className="sm:max-w-[600px] p-8">
        <div className="mb-6">
          <DialogHeader>
            <DialogTitle className="text-2xl">{screen.title}</DialogTitle>
          </DialogHeader>
        </div>

        <div className="space-y-6">
          {/* Icon and description */}
          <div className="space-y-4">
            <div className="text-5xl">{screen.icon}</div>
            <p className="text-base leading-relaxed text-foreground">
              {screen.description}
            </p>
          </div>

          {/* Progress indicator */}
          <div className="flex gap-1.5">
            {ONBOARDING_SCREENS.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex gap-3 justify-between">
            <Button
              variant="outline"
              onClick={handleSkip}
              className="text-muted-foreground"
            >
              Skip Tour
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handlePrev}
                disabled={step === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Button onClick={handleNext}>
                {step === ONBOARDING_SCREENS.length - 1 ? (
                  "Get Started"
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Step counter */}
          <div className="text-center text-xs text-muted-foreground">
            Step {step + 1} of {ONBOARDING_SCREENS.length}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
