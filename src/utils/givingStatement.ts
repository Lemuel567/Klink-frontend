import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { Payment } from '../api/giving';
import { formatCurrency, formatDate } from './formatters';

const TYPE_LABELS: Record<string, string> = {
  TITHE: 'Tithe',
  OFFERING: 'Offering',
  WELFARE: 'Welfare',
  SPECIAL_CONTRIBUTION: 'Special',
  DUES: 'Group dues',
};

/**
 * Builds a personal year-end giving statement as a PDF and opens the share
 * sheet (save / email / print). Uses ONLY the member's own payments — the
 * same records they can already see in their giving history.
 */
export async function shareGivingStatement(opts: {
  memberName: string;
  churchName: string;
  year: number;
  payments: Payment[];
}): Promise<boolean> {
  const { memberName, churchName, year } = opts;

  const items = opts.payments
    .filter((p) => p.paymentType !== 'DUES') // church giving only, not group dues
    .filter((p) => (p.status ?? 'CONFIRMED') === 'CONFIRMED')
    .filter((p) => (p.paymentDate ?? '').startsWith(String(year)))
    .sort((a, b) => (a.paymentDate < b.paymentDate ? -1 : 1));

  if (items.length === 0) {
    Alert.alert('No giving to report', `You have no giving recorded for ${year} yet.`);
    return false;
  }

  const total = items.reduce((s, p) => s + p.amount, 0);
  const byType: Record<string, number> = {};
  items.forEach((p) => { byType[p.paymentType] = (byType[p.paymentType] ?? 0) + p.amount; });

  const rows = items
    .map(
      (p) =>
        `<tr><td>${formatDate(p.paymentDate)}</td><td>${TYPE_LABELS[p.paymentType] ?? p.paymentType}</td><td class="amt">${formatCurrency(p.amount)}</td></tr>`,
    )
    .join('');

  const breakdown = Object.entries(byType)
    .map(([t, a]) => `<tr><td>${TYPE_LABELS[t] ?? t}</td><td class="amt">${formatCurrency(a)}</td></tr>`)
    .join('');

  const esc = (s: string) => s.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));

  const html = `
    <html><head><meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      body { font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; color: #1A0533; padding: 36px; }
      .brand { color: #6B3FA0; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; font-weight: 700; }
      h1 { font-size: 26px; margin: 4px 0 2px; }
      .church { font-size: 15px; color: #6B5B8E; margin-bottom: 20px; }
      .meta { display: flex; justify-content: space-between; font-size: 13px; color: #4A3570; margin-bottom: 18px; }
      .total { background: #F4A429; color: #1A0533; border-radius: 12px; padding: 16px 20px; margin: 8px 0 24px; }
      .total .label { font-size: 12px; letter-spacing: 1px; text-transform: uppercase; font-weight: 700; }
      .total .value { font-size: 30px; font-weight: 800; }
      h2 { font-size: 13px; letter-spacing: 1px; text-transform: uppercase; color: #6B3FA0; margin: 22px 0 8px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th { text-align: left; color: #8B7BA8; border-bottom: 2px solid #E8DFF5; padding: 8px 6px; }
      td { padding: 8px 6px; border-bottom: 1px solid #F0EBF8; }
      .amt { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
      tfoot td { font-weight: 800; border-top: 2px solid #E8DFF5; border-bottom: none; }
      .footer { margin-top: 28px; font-size: 11px; color: #8B7BA8; line-height: 1.6; }
    </style></head>
    <body>
      <div class="brand">Klink · Giving Statement</div>
      <h1>${esc(memberName)}</h1>
      <div class="church">${esc(churchName)}</div>
      <div class="meta"><span>Statement for ${year}</span><span>Generated ${formatDate(new Date())}</span></div>

      <div class="total">
        <div class="label">Total given in ${year}</div>
        <div class="value">${formatCurrency(total)}</div>
      </div>

      <h2>Summary by type</h2>
      <table><tbody>${breakdown}</tbody>
        <tfoot><tr><td>Total</td><td class="amt">${formatCurrency(total)}</td></tr></tfoot>
      </table>

      <h2>All contributions</h2>
      <table>
        <thead><tr><th>Date</th><th>Type</th><th class="amt">Amount</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td colspan="2">Total</td><td class="amt">${formatCurrency(total)}</td></tr></tfoot>
      </table>

      <div class="footer">
        This is a personal giving record generated from the Klink app for ${esc(memberName)}.
        It reflects contributions recorded in the app and is provided for your own reference.
      </div>
    </body></html>`;

  try {
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Giving statement ${year}`,
        UTI: 'com.adobe.pdf',
      });
    }
    return true;
  } catch {
    Alert.alert('Could not create the statement', 'Please try again.');
    return false;
  }
}
