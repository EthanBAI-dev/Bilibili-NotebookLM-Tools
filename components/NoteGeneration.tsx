import { useState } from 'react';
import { FileText, Loader2, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

type State = 'idle' | 'starting' | 'generating' | 'done' | 'error';

export function NoteGeneration() {
  const { t } = useI18n();
  const [state, setState] = useState<State>('idle');
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  const handleGenerate = () => {
    setState('starting');
    setError('');

    const port = chrome.runtime.connect({ name: 'note-generation' });
    port.postMessage({ type: 'GENERATE_NOTE' });

    port.onMessage.addListener((msg) => {
      if (msg.phase === 'starting' || msg.phase === 'generating') {
        setState(msg.phase);
      } else if (msg.phase === 'done') {
        setTitle(msg.title || '');
        setState('done');
        port.disconnect();
      } else if (msg.phase === 'error') {
        setError(msg.error || t('notes.error'));
        setState('error');
        port.disconnect();
      }
    });
  };

  const isBusy = state === 'starting' || state === 'generating';

  return (
    <div className="rounded-xl border border-border-strong bg-white p-4 shadow-soft space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-notebooklm-light flex items-center justify-center">
          <FileText className="w-4.5 h-4.5 text-notebooklm-blue" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-gray-900">{t('notes.title')}</div>
          <p className="mt-0.5 text-xs leading-5 text-gray-500">{t('notes.description')}</p>
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={isBusy}
        className="w-full py-2.5 bg-notebooklm-blue hover:bg-blue-600 text-white text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-btn hover:shadow-btn-hover transition-all duration-150 btn-press"
      >
        {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {state === 'starting' && t('notes.starting')}
        {state === 'generating' && t('notes.generating')}
        {(state === 'idle' || state === 'done' || state === 'error') && t('notes.generate')}
      </button>

      {state === 'done' && (
        <div className="flex items-center gap-2 text-xs text-emerald-700">
          <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{t('notes.done', { title })}</span>
        </div>
      )}
      {state === 'error' && (
        <div className="flex items-center gap-2 text-xs text-red-600">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
