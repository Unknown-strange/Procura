export type OnboardingPrefs = {
  onboarding_completed_at?: string | null;
  procurement_types?: string[] | null;
  regions?: string[] | null;
} | null;

export function hasCompletedOnboarding(prefs: OnboardingPrefs): boolean {
  if (!prefs) return false;
  if (prefs.onboarding_completed_at) return true;
  return (prefs.procurement_types?.length ?? 0) > 0;
}
