// components/onboarding/DeclarationCheckbox.tsx

"use client";

interface DeclarationCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function DeclarationCheckbox({ checked, onChange }: DeclarationCheckboxProps) {
  return (
    <label className="flex items-start gap-3 border border-hairline p-5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 accent-ocean"
        required
      />
      <span className="text-sm text-ink/80">
        I certify that I hold the food handling qualifications required for my service type (e.g.
        a Food Safety Supervisor certificate or equivalent), that I hold current public and
        products liability insurance, and that I am otherwise compliant with all applicable food
        safety and business regulations for the way I prepare and deliver food. I understand
        Meal Prep Market does not verify this declaration and is not responsible for
        confirming my compliance.
      </span>
    </label>
  );
}
