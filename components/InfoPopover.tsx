import { useEffect, useRef, useState } from 'react';
import { Info } from 'lucide-react';

interface Props {
  /** aria-label and tooltip for the trigger icon. */
  label: string;
  /** Optional bold lead-in line inside the popover, above `children`. */
  title?: string;
  children: React.ReactNode;
}

/**
 * Small info icon that reveals a popover on click. Closed by default so it
 * costs nothing for someone who already knows what a section does, and is
 * one click away for someone who doesn't — same shape WebImport already used
 * for its tab-list note, generalized so any section can anchor one.
 */
export function InfoPopover({ label, title, children }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative inline-flex items-center" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center w-4 h-4 rounded-full text-gray-400 hover:text-notebooklm-blue hover:bg-notebooklm-light transition-colors"
        aria-label={label}
        title={label}
      >
        <Info className="w-3 h-3" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-20 w-64 rounded-lg border border-gray-200 bg-white shadow-lg p-3 text-[11px] text-gray-500 leading-5">
          {title && <p className="font-medium text-gray-700 mb-1">{title}</p>}
          <p>{children}</p>
        </div>
      )}
    </div>
  );
}
