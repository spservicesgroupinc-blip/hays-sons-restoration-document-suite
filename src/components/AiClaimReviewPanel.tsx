/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { EstimateProject } from '../types/xactimate';
import { DeepSeekService, DeepSeekTask, DeepSeekStatus } from '../services/deepseekService';
import {
  Sparkles,
  Loader2,
  AlertTriangle,
  Copy,
  Check,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface AiClaimReviewPanelProps {
  project: EstimateProject;
  /** Human label for the document currently selected, used to steer the narrative draft. */
  documentLabel?: string;
}

/**
 * DeepSeek-backed estimate review.
 *
 * Calls the server-side proxy — the API key never reaches the browser. Output is
 * model-generated and is labelled as such: it is a second pair of eyes on the
 * scope, not a substitute for the estimator's review before anything is sent.
 */
export const AiClaimReviewPanel: React.FC<AiClaimReviewPanelProps> = ({
  project,
  documentLabel,
}) => {
  const [status, setStatus] = useState<DeepSeekStatus | null>(null);
  const [busyTask, setBusyTask] = useState<DeepSeekTask | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [resultMeta, setResultMeta] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void DeepSeekService.status().then((next) => {
      if (!cancelled) setStatus(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const run = async (task: DeepSeekTask, prompt?: string) => {
    setBusyTask(task);
    setError(null);
    setResultMeta(null);

    const response = await DeepSeekService.run(task, DeepSeekService.buildContext(project), prompt);

    if (response.ok) {
      setResult(response.text);
      setResultMeta(response.model ? `Draft returned by ${response.model}` : null);
    } else {
      setResult(null);
      setError(response.error);
    }
    setBusyTask(null);
  };

  const handleCopy = () => {
    if (!result) return;
    void navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const unavailable = status !== null && !status.configured;
  const isBusy = busyTask !== null;

  const actionButton =
    'flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded border transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-xs print:hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded bg-red-50 border border-red-100">
            <Sparkles className="w-4 h-4 text-red-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">AI Estimate Review</h2>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 bg-slate-100 border border-slate-200 rounded">
                DeepSeek{status?.model ? ` · ${status.model}` : ''}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5 max-w-2xl">
              Audits the loaded scope, drafts narrative copy, and answers questions about this
              estimate. The API key is held server-side by the Vercel function.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded transition cursor-pointer self-start"
        >
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{isOpen ? 'Hide' : 'Open'}</span>
        </button>
      </div>

      {isOpen && (
        <div className="border-t border-slate-200 p-4 space-y-4">
          {unavailable && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">DeepSeek is not configured on the server yet.</p>
                <p className="mt-0.5">
                  Add <code className="font-mono">DEEPSEEK_API_KEY</code> to the Vercel project
                  (Settings &gt; Environment Variables) — or to <code className="font-mono">.env.local</code>{' '}
                  when running <code className="font-mono">vercel dev</code> — then redeploy.
                  {status?.error ? ` Probe note: ${status.error}` : ''}
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isBusy || unavailable}
              onClick={() => void run('estimate-review')}
              className={`${actionButton} text-white bg-red-600 hover:bg-red-700 border-red-600`}
            >
              {busyTask === 'estimate-review' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5" />
              )}
              <span>Review Scope</span>
            </button>
            <button
              type="button"
              disabled={isBusy || unavailable}
              onClick={() => void run('narrative', documentLabel)}
              className={`${actionButton} text-slate-700 bg-white hover:bg-slate-100 border-slate-300`}
            >
              {busyTask === 'narrative' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>Draft Narrative</span>
            </button>
            {isBusy && (
              <span className="text-xs text-slate-500">
                Working — a full audit can take up to a minute.
              </span>
            )}
          </div>

          {/* Question */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (question.trim()) void run('question', question.trim());
            }}
            className="flex flex-col sm:flex-row gap-2"
          >
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about this estimate, e.g. “Does the drywall quantity cover the flooded rooms?”"
              className="flex-1 px-3 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
            />
            <button
              type="submit"
              disabled={isBusy || unavailable || question.trim().length === 0}
              className={`${actionButton} justify-center text-slate-700 bg-white hover:bg-slate-100 border-slate-300`}
            >
              {busyTask === 'question' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>Ask</span>
            </button>
          </form>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="border border-slate-200 rounded">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-slate-50">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {resultMeta || 'Draft'}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded transition cursor-pointer"
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-3 text-xs text-slate-800 whitespace-pre-wrap font-sans leading-relaxed max-h-96 overflow-y-auto">
                {result}
              </pre>
              <div className="px-3 py-2 border-t border-slate-200 bg-amber-50 text-[11px] text-amber-900">
                AI-generated draft. Verify every figure against the estimate before it leaves the
                office — the model was told not to invent values, but it can still misread them.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
