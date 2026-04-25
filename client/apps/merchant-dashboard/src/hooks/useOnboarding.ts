import { useState, useEffect } from "react";

const ONBOARDING_KEY = "recuro_onboarding_completed";

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const completed = localStorage.getItem(ONBOARDING_KEY) === "true";
    setShowOnboarding(!completed);
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setShowOnboarding(false);
  };

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_KEY);
    setShowOnboarding(true);
  };

  return {
    showOnboarding,
    mounted,
    completeOnboarding,
    resetOnboarding,
  };
}
