"use client";

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-sm font-semibold mb-2 text-muted">{children}</div>;
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full px-4 py-3 rounded-xl outline-none bg-panel text-white border border-transparent focus:border-brand transition-colors"
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full px-4 py-3 rounded-xl outline-none min-h-[120px] bg-panel text-white border border-transparent focus:border-brand transition-colors"
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full px-4 py-3 rounded-xl outline-none bg-panel text-white border border-transparent focus:border-brand transition-colors"
    />
  );
}

export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="px-5 py-3 rounded-xl font-semibold disabled:opacity-60 bg-brand text-brand-foreground hover:opacity-90 transition-opacity"
    />
  );
}

export function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="px-5 py-3 rounded-xl font-semibold disabled:opacity-60 bg-panel text-white border border-transparent hover:bg-white/5 transition-colors"
    />
  );
}
