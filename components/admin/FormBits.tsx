"use client";

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-bold uppercase tracking-wider mb-2 text-white/40">{children}</div>;
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full px-4 py-3 rounded-xl outline-none bg-black/30 text-white border border-white/10 focus:border-brand focus:ring-1 focus:ring-brand/30 transition-all placeholder:text-white/20 text-sm"
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full px-4 py-3 rounded-xl outline-none min-h-[120px] bg-black/30 text-white border border-white/10 focus:border-brand focus:ring-1 focus:ring-brand/30 transition-all placeholder:text-white/20 text-sm resize-none"
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full px-4 py-3 rounded-xl outline-none bg-black/30 text-white border border-white/10 focus:border-brand focus:ring-1 focus:ring-brand/30 transition-all text-sm appearance-none cursor-pointer"
    />
  );
}

export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="px-5 py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50 bg-brand text-white hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-brand/20"
    />
  );
}

export function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="px-5 py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50 bg-white/5 text-white/80 border border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20 active:scale-[0.98] transition-all"
    />
  );
}

export function TabButton({ active, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      {...props}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${active
          ? "bg-brand/10 text-brand border border-brand/30"
          : "text-white/50 hover:text-white hover:bg-white/5 border border-transparent"
        }`}
    >
      {children}
    </button>
  );
}
