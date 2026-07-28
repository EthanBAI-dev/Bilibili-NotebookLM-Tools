import { useEffect, useState } from 'react';
import { Star, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

const STORAGE_KEY = 'rate_us_dismissed';
const STORE_URL = 'https://chromewebstore.google.com/detail/noteflow/fdfmlojhomggnppohcmidnmfmffnebcn';

/**
 * Persistent footer CTA, shown under the shared import action regardless of
 * which source tab is active. Dismissed state is sticky (chrome.storage.local)
 * so it asks once, not on every open — same pattern as OnboardingTour's
 * one-time-completed flag.
 */
export function RateUsBar() {
  const { t } = useI18n();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEY).then((result) => {
      setDismissed(Boolean(result[STORAGE_KEY]));
    });
  }, []);

  const dismiss = () => {
    setDismissed(true);
    chrome.storage.local.set({ [STORAGE_KEY]: true }).catch(() => {});
  };

  const openStore = () => {
    chrome.tabs.create({ url: STORE_URL });
    dismiss();
  };

  if (dismissed) return null;

  return (
    <div className="mx-4 mb-4 flex items-center gap-2.5 px-3 py-2.5 bg-amber-50 border border-amber-200/60 rounded-lg shadow-soft animate-fade-in">
      <div className="flex text-amber-400 flex-shrink-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="w-3.5 h-3.5" fill="currentColor" strokeWidth={0} />
        ))}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-amber-900 truncate">{t('more.rateTitle')}</p>
        <p className="text-[10.5px] text-amber-700/80 truncate">{t('more.rateDesc')}</p>
      </div>
      <button
        onClick={openStore}
        className="flex-shrink-0 px-2.5 py-1.5 text-[11px] font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-md transition-colors btn-press"
      >
        {t('more.rateBtn')}
      </button>
      <button
        onClick={dismiss}
        title={t('close')}
        className="flex-shrink-0 p-1 text-amber-400 hover:text-amber-600 rounded transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
