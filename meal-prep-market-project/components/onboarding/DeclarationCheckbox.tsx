// components/onboarding/DeclarationCheckbox.tsx
//
// The cook's confirmation on the last sign-up step. Plain words, same
// meaning as before: the cook confirms they have food safety training,
// insurance and follow Queensland food rules, and that Meal Prep Market
// doesn't check this. (Have the lawyer review this wording.)

"use client";

interface DeclarationCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function DeclarationCheckbox({ checked, onChange }: DeclarationCheckboxProps) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-hairline p-5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 accent-ocean"
        required
      />
      <span className="text-sm text-ink/85">
        I confirm all of the above. I understand Meal Prep Market doesn&rsquo;t check this and
        isn&rsquo;t responsible for my compliance.
      </span>
    </label>
  );
}
