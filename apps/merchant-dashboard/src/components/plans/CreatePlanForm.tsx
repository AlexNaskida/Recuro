import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ChevronRight, Coins, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/toaster";
import { useCreatePlan } from "@/hooks/useMerchantPlans";
import { SECONDS_PER_DAY, intervalLabel, toMicro } from "@/constants";
import type { CreatePlanParams } from "@solana-subscription/sdk";

const INTERVAL_PRESETS = [
  { label: "Daily",     days: 1   },
  { label: "Weekly",    days: 7   },
  { label: "Monthly",   days: 30  },
  { label: "Quarterly", days: 90  },
  { label: "Annually",  days: 365 },
] as const;

interface FormState {
  name:            string;
  description:     string;
  imageUrl:        string;
  amountUsdc:      string;
  intervalDays:    number;
  trialDays:       string;
  maxSubscribers:  string;
}

const DEFAULT_FORM: FormState = {
  name:           "",
  description:    "",
  imageUrl:       "",
  amountUsdc:     "9.99",
  intervalDays:   30,
  trialDays:      "0",
  maxSubscribers: "0",
};

function FormField({
  label, hint, error, children,
}: {
  label: string; hint?: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label>{label}</Label>
        {hint && (
          <Tooltip>
            <TooltipTrigger><Info className="h-3.5 w-3.5 text-muted-foreground" /></TooltipTrigger>
            <TooltipContent className="max-w-48">{hint}</TooltipContent>
          </Tooltip>
        )}
      </div>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function validate(form: FormState): Partial<Record<keyof FormState, string>> {
  const errors: Partial<Record<keyof FormState, string>> = {};
  if (!form.name.trim())            errors.name        = "Name is required";
  if (form.name.length > 64)        errors.name        = "Max 64 characters";
  const amount = parseFloat(form.amountUsdc);
  if (isNaN(amount) || amount <= 0) errors.amountUsdc  = "Enter a valid amount > 0";
  if (amount > 100_000)             errors.amountUsdc  = "Amount too large";
  const trial = parseInt(form.trialDays);
  if (isNaN(trial) || trial < 0)    errors.trialDays   = "Must be 0 or positive";
  return errors;
}

export function CreatePlanForm() {
  const navigate     = useNavigate();
  const createPlan   = useCreatePlan();
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [touched, setTouched] = useState<Set<keyof FormState>>(new Set());
  const [deployed, setDeployed] = useState<{ sig: string; pubkey: string } | null>(null);

  const errors = validate(form);
  const hasErrors = Object.keys(errors).length > 0;

  function field(key: keyof FormState) {
    return {
      value: form[key] as string,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm((f) => ({ ...f, [key]: e.target.value }));
        setTouched((t) => new Set(t).add(key));
      },
      onBlur: () => setTouched((t) => new Set(t).add(key)),
    };
  }

  async function handleSubmit() {
    // Touch all fields
    setTouched(new Set(Object.keys(DEFAULT_FORM) as (keyof FormState)[]));
    if (hasErrors) return;

    const params: CreatePlanParams = {
      planId:         Date.now(),
      name:           form.name,
      description:    form.description,
      imageUrl:       form.imageUrl,
      amountUsdc:     parseFloat(form.amountUsdc),
      intervalDays:   form.intervalDays,
      trialDays:      parseInt(form.trialDays) || 0,
      maxSubscribers: parseInt(form.maxSubscribers) || 0,
    };

    const result = await createPlan.mutateAsync(params);
    setDeployed({
      sig:    result.signature,
      pubkey: result.planPubkey.toBase58(),
    });
  }

  const amountVal    = parseFloat(form.amountUsdc) || 0;
  const trialDaysVal = parseInt(form.trialDays) || 0;
  const monthlyMRR   = form.intervalDays > 0
    ? amountVal * (30 / form.intervalDays)
    : amountVal;

  if (deployed) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <Card className="max-w-md w-full border-emerald-500/40 bg-emerald-500/5">
          <CardContent className="flex flex-col items-center gap-5 py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Plan deployed!</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Your plan is live on Solana and ready for subscribers.
              </p>
            </div>
            <div className="w-full space-y-2 text-left">
              <div className="rounded-lg bg-surface-3 p-3">
                <p className="text-[11px] text-muted-foreground mb-1">Plan PDA</p>
                <p className="font-mono text-xs break-all">{deployed.pubkey}</p>
              </div>
              <div className="rounded-lg bg-surface-3 p-3">
                <p className="text-[11px] text-muted-foreground mb-1">Transaction</p>
                <p className="font-mono text-xs break-all">{deployed.sig.slice(0, 32)}…</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="surface" onClick={() => { setDeployed(null); setForm(DEFAULT_FORM); }}>
                Create another
              </Button>
              <Button variant="brand" onClick={() => navigate("/plans")}>
                View plans <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 p-6">
      {/* ── Form ──────────────────────────────────────────────────────── */}
      <div className="xl:col-span-3 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Plan Details</CardTitle>
            <CardDescription>Basic information visible to subscribers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <FormField
              label="Plan name *"
              error={touched.has("name") ? errors.name : undefined}
            >
              <Input
                placeholder="Pro Monthly"
                maxLength={64}
                {...field("name")}
              />
            </FormField>

            <FormField
              label="Description"
              hint="Shown on the subscriber portal. Max 256 characters."
            >
              <Textarea
                placeholder="Everything you need to get started…"
                maxLength={256}
                rows={3}
                {...field("description")}
              />
            </FormField>

            <FormField label="Image URL" hint="Plan thumbnail (HTTPS or IPFS)">
              <Input
                placeholder="https://example.com/plan-image.png"
                {...field("imageUrl")}
              />
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing Configuration</CardTitle>
            <CardDescription>
              Price and interval are immutable after deployment to protect subscribers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <FormField
              label="Price per period (USDC) *"
              error={touched.has("amountUsdc") ? errors.amountUsdc : undefined}
              hint="Amount charged each billing cycle in USDC (e.g. 9.99)"
            >
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="pl-7"
                  placeholder="9.99"
                  {...field("amountUsdc")}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  USDC
                </span>
              </div>
            </FormField>

            <FormField label="Billing interval *">
              <div className="grid grid-cols-5 gap-2">
                {INTERVAL_PRESETS.map(({ label, days }) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, intervalDays: days }))}
                    className={`rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                      form.intervalDays === days
                        ? "border-brand-500 bg-brand-500/10 text-brand-400"
                        : "border-surface-4 text-muted-foreground hover:border-brand-500/50 hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Clockwork will execute payments every{" "}
                <span className="text-foreground font-medium">{form.intervalDays} day{form.intervalDays !== 1 && "s"}</span>
              </p>
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Free trial (days)"
                hint="0 = no trial. First charge happens after trial ends."
                error={touched.has("trialDays") ? errors.trialDays : undefined}
              >
                <Input type="number" min="0" step="1" {...field("trialDays")} />
              </FormField>

              <FormField
                label="Max subscribers"
                hint="Hard cap on concurrent subscribers. 0 = unlimited."
              >
                <Input type="number" min="0" step="1" {...field("maxSubscribers")} />
              </FormField>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Preview ───────────────────────────────────────────────────── */}
      <div className="xl:col-span-2 space-y-4">
        <Card className="border-brand-500/20 bg-brand-500/5 sticky top-20">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Live Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Plan preview card */}
            <div className="rounded-xl border border-surface-4 bg-surface-2 p-5 space-y-4">
              <div>
                <h3 className="font-bold text-lg">{form.name || "Your Plan Name"}</h3>
                {form.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{form.description}</p>
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-emerald-400">
                  ${amountVal > 0 ? amountVal.toFixed(2) : "0.00"}
                </span>
                <span className="text-sm text-muted-foreground">
                  / {intervalLabel(form.intervalDays * SECONDS_PER_DAY)}
                </span>
              </div>
              {trialDaysVal > 0 && (
                <div className="text-xs text-amber-400 flex items-center gap-1">
                  ✦ {trialDaysVal}-day free trial
                </div>
              )}
              <button className="w-full rounded-lg bg-gradient-brand py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity">
                Subscribe
              </button>
            </div>

            {/* Revenue projection */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Revenue Projection
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Per subscriber/mo", value: `$${monthlyMRR.toFixed(2)}` },
                  { label: "10 subscribers",    value: `$${(monthlyMRR * 10).toFixed(0)}/mo` },
                  { label: "100 subscribers",   value: `$${(monthlyMRR * 100).toFixed(0)}/mo` },
                  { label: "1K subscribers",    value: `$${(monthlyMRR * 1000 / 1000).toFixed(1)}K/mo` },
                ].map((r) => (
                  <div key={r.label} className="rounded-lg bg-surface-3 p-2.5">
                    <p className="text-[10px] text-muted-foreground">{r.label}</p>
                    <p className="text-sm font-semibold text-emerald-400">{r.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Button
          variant="brand"
          size="xl"
          className="w-full"
          loading={createPlan.isPending}
          disabled={hasErrors && touched.size > 0}
          onClick={handleSubmit}
        >
          <Coins className="h-5 w-5" />
          Deploy Plan to Solana
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Price and interval are permanent after deployment.
        </p>
      </div>
    </div>
  );
}
