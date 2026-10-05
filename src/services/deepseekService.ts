/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EstimateProject } from '../types/xactimate';

/**
 * Client half of the DeepSeek integration.
 *
 * This module never touches an API key: it calls the server-side proxy at
 * `/api/deepseek`, which holds the credential. Anything rendered from here is
 * model output and must be reviewed by the estimator before it is sent out.
 */

export type DeepSeekTask = 'estimate-review' | 'narrative' | 'question';

export interface DeepSeekStatus {
  configured: boolean;
  model?: string;
  error?: string;
}

export type DeepSeekResult =
  | { ok: true; text: string; model?: string }
  | { ok: false; error: string };

const ENDPOINT = '/api/deepseek';
const CONTEXT_BUDGET_CHARS = 11_000;
const DEFAULT_LINE_ITEM_LIMIT = 40;

function money(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export const DeepSeekService = {
  /** Asks the proxy whether a server-side key is present. Safe to call on mount. */
  async status(): Promise<DeepSeekStatus> {
    try {
      const res = await fetch(ENDPOINT, { headers: { Accept: 'application/json' } });
      if (!res.ok) return { configured: false, error: `Proxy responded ${res.status}` };
      const data: unknown = await res.json().catch(() => null);
      const record = (data ?? {}) as { configured?: unknown; model?: unknown };
      return {
        configured: record.configured === true,
        model: typeof record.model === 'string' ? record.model : undefined,
      };
    } catch (err: unknown) {
      return { configured: false, error: errorMessage(err) };
    }
  },

  /** Runs one task against the proxy. Never throws — failures come back as `ok: false`. */
  async run(task: DeepSeekTask, context: string, prompt?: string): Promise<DeepSeekResult> {
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, context, prompt }),
      });

      const data: unknown = await res.json().catch(() => null);
      const record = (data ?? {}) as { text?: unknown; error?: unknown; model?: unknown };

      if (!res.ok) {
        return {
          ok: false,
          error: typeof record.error === 'string' ? record.error : `Request failed (${res.status}).`,
        };
      }

      const text = typeof record.text === 'string' ? record.text.trim() : '';
      if (!text) return { ok: false, error: 'The model returned an empty response.' };

      return { ok: true, text, model: typeof record.model === 'string' ? record.model : undefined };
    } catch (err: unknown) {
      return { ok: false, error: `Could not reach the AI proxy: ${errorMessage(err)}` };
    }
  },

  /**
   * Flattens the loaded estimate into the text digest the proxy sends upstream.
   *
   * Deliberately lossy: it carries the claim header, totals, the measured
   * geometry summary and the highest-value line items (plus every flagged one),
   * then stops. The model is told to say "not in estimate" rather than guess.
   */
  buildContext(project: EstimateProject, lineItemLimit: number = DEFAULT_LINE_ITEM_LIMIT): string {
    const { claim, insured, estimator, totals, lineItems, roofFacets, rooms } = project;
    const lines: string[] = [];

    lines.push('CLAIM');
    lines.push(`Claim number: ${claim.claimNumber}`);
    lines.push(`Policy number: ${claim.policyNumber}`);
    lines.push(`Type of loss: ${claim.typeOfLoss}`);
    lines.push(`Date of loss: ${claim.dateOfLoss}`);
    lines.push(`Date inspected: ${claim.dateInspected}`);
    lines.push(`Price list: ${claim.priceList}`);
    lines.push(`Profile: ${claim.profile}`);
    if (claim.catastropheCode) lines.push(`Catastrophe code: ${claim.catastropheCode}`);
    lines.push(
      `Tax ${claim.taxRatePercent}% | Overhead ${claim.overheadPercent}% | Profit ${claim.profitPercent}%`
    );

    lines.push('');
    lines.push('INSURED AND PROPERTY');
    lines.push(`Insured: ${insured.name}`);
    lines.push(
      `Address: ${insured.propertyAddress}, ${insured.city}, ${insured.state} ${insured.zip}`
    );

    lines.push('');
    lines.push('ESTIMATOR');
    lines.push(`${estimator.name} — ${estimator.company}`);
    if (estimator.licenseNumber) lines.push(`License: ${estimator.licenseNumber}`);

    lines.push('');
    lines.push('TOTALS');
    lines.push(`Line item total: ${money(totals.lineItemTotal)}`);
    lines.push(`Tax: ${money(totals.taxTotal)}`);
    lines.push(`Overhead: ${money(totals.overheadTotal)}`);
    lines.push(`Profit: ${money(totals.profitTotal)}`);
    lines.push(`RCV total: ${money(totals.rcvTotal)}`);
    lines.push(`Depreciation: ${money(totals.depreciationTotal)}`);
    lines.push(`ACV total: ${money(totals.acvTotal)}`);
    lines.push(`Deductible: ${money(totals.deductible)}`);
    lines.push(`Net claim: ${money(totals.netClaim)}`);

    if (roofFacets.length > 0) {
      lines.push('');
      lines.push(`ROOF GEOMETRY (${roofFacets.length} facets)`);
      for (const facet of roofFacets) {
        lines.push(
          `${facet.id} "${facet.label}" pitch ${facet.pitch} — ${facet.surfaceArea} SF surface, ` +
            `${facet.linearEave} LF eave, ${facet.linearRake} LF rake, ${facet.linearRidge} LF ridge, ` +
            `${facet.linearValley} LF valley`
        );
      }
    }

    if (rooms.length > 0) {
      lines.push('');
      lines.push(`ROOMS (${rooms.length} measured)`);
      for (const room of rooms) {
        lines.push(
          `${room.id} "${room.name}" — ${room.length} x ${room.width} ft, ${room.ceilingHeight} ft ceiling, ` +
            `${room.floorArea} SF floor, ${room.wallArea} SF wall, ${room.ceilingArea} SF ceiling`
        );
      }
    }

    const flagged = lineItems.filter((item) => item.validationStatus !== 'VALID');
    const ranked = [...lineItems].sort((a, b) => b.total - a.total);
    const selected: typeof ranked = [];
    const seen = new Set<string>();
    for (const item of [...flagged, ...ranked]) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      selected.push(item);
      if (selected.length >= lineItemLimit) break;
    }

    lines.push('');
    lines.push(
      `LINE ITEMS (${lineItems.length} total; showing ${selected.length} — all flagged items plus the ` +
        'highest-value items)'
    );
    for (const item of selected) {
      const flag = item.validationStatus === 'VALID' ? '' : ` [${item.validationStatus}]`;
      const note = item.f9Note ? ` note="${item.f9Note}"` : '';
      lines.push(
        `${item.id} ${item.category} ${item.selector} ${item.activity} "${item.description}" — ` +
          `${item.quantity} ${item.unit} @ ${money(item.unitPrice)} = ${money(item.total)}${flag}${note}`
      );
    }
    if (selected.length < lineItems.length) {
      lines.push(`(${lineItems.length - selected.length} lower-value line items omitted)`);
    }

    if (flagged.length > 0) {
      lines.push('');
      lines.push(`VALIDATION FLAGS (${flagged.length})`);
      for (const item of flagged) {
        lines.push(
          `${item.id} ${item.category} ${item.selector}: ${item.validationStatus} — ` +
            `${item.validationMessage || 'no message supplied'}`
        );
      }
    }

    const digest = lines.join('\n');
    return digest.length > CONTEXT_BUDGET_CHARS
      ? `${digest.slice(0, CONTEXT_BUDGET_CHARS)}\n[digest truncated]`
      : digest;
  },
};
