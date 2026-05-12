import { useState } from "react";
import { Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const QVAC_KEY_STORAGE = "recuro_qvac_holepunch_key";

interface QvacOnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export default function QvacOnboardingModal({
  open,
  onOpenChange,
  onComplete,
}: QvacOnboardingModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [installed, setInstalled] = useState(false);
  const [holepunchKey, setHolepunchKey] = useState("");
  const [error, setError] = useState<string | null>(null);

  const closeModal = () => {
    setStep(1);
    setInstalled(false);
    setHolepunchKey("");
    setError(null);
    onOpenChange(false);
  };

  const handleConnect = () => {
    const trimmed = holepunchKey.trim();

    if (!trimmed) {
      setError("Holepunch peer key is required.");
      return;
    }

    localStorage.setItem(QVAC_KEY_STORAGE, trimmed);
    setError(null);
    setStep(3);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          closeModal();
          return;
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-[560px] p-6">
        <DialogHeader>
          <DialogTitle>Set up AI Assistant</DialogTitle>
          <DialogDescription>
            Connect your local QVAC instance to unlock the existing chat.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-foreground">
                The AI assistant runs on your device. No cloud, no API keys.
              </p>
              <p className="text-sm text-muted-foreground">
                First, install the QVAC desktop app. The Holepunch key is
                generated inside QVAC after install.
              </p>

              <a
                href="https://qvac.tether.io"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Download QVAC
                <ExternalLink className="h-4 w-4" />
              </a>

              <label className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
                <Checkbox
                  checked={installed}
                  onCheckedChange={(value) => setInstalled(value === true)}
                />
                <span>I have installed QVAC</span>
              </label>

              <div className="flex justify-end">
                <Button disabled={!installed} onClick={() => setStep(2)}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-foreground">
                Open QVAC, go to Settings, and copy the Holepunch peer key shown
                there. You are not downloading a separate key.
              </p>

              <div className="space-y-2">
                <Label htmlFor="qvac-holepunch-key">Holepunch peer key</Label>
                <Input
                  id="qvac-holepunch-key"
                  value={holepunchKey}
                  onChange={(event) => {
                    setHolepunchKey(event.target.value);
                    setError(null);
                  }}
                  placeholder="Paste your peer key"
                  className="font-mono text-xs"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                If you can’t find it, check QVAC settings or account details
                after the app is installed.
              </p>

              {error && <p className="text-xs text-destructive">{error}</p>}

              <div className="flex justify-between gap-3">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button onClick={handleConnect} disabled={!holepunchKey.trim()}>
                  Connect
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
                <div className="flex items-center gap-2 font-medium">
                  <Check className="h-4 w-4 text-emerald-500" />
                  AI assistant is ready.
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Your key is saved locally in this browser.
                </p>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    closeModal();
                    onComplete();
                  }}
                >
                  Open Chat
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
