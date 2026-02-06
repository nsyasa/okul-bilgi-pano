"use client";

import { BRAND } from "@/lib/branding";

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-sm font-semibold mb-2" style={{ color: BRAND.colors.muted }}>{children}</div>;
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full px-4 py-3 rounded-xl outline-none"
      style={{ background: BRAND.colors.panel, color: "white", border: `1px solid ${BRAND.colors.bg}` }}
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full px-4 py-3 rounded-xl outline-none min-h-[120px]"
      style={{ background: BRAND.colors.panel, color: "white", border: `1px solid ${BRAND.colors.bg}` }}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full px-4 py-3 rounded-xl outline-none"
      style={{ background: BRAND.colors.panel, color: "white", border: `1px solid ${BRAND.colors.bg}` }}
    />
  );
}

export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="px-5 py-3 rounded-xl font-semibold disabled:opacity-60"
      style={{ background: BRAND.colors.brand, color: "white" }}
    />
  );
}

export function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="px-5 py-3 rounded-xl font-semibold disabled:opacity-60"
      style={{ background: BRAND.colors.panel, color: "white", border: `1px solid ${BRAND.colors.bg}` }}
    />
  );
}
