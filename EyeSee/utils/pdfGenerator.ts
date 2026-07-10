import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { IOPReading } from '../types';

export const generatePDFReport = async (
  readings: IOPReading[],
  insight: string
): Promise<void> => {
  const latestReading = readings.length > 0 ? readings[readings.length - 1] : null;

  const tableRows = readings
    .map(
      (r) =>
        `<tr>
          <td>${r.date.toLocaleDateString()}</td>
          <td>${r.date.toLocaleTimeString()}</td>
          <td>${r.value.toFixed(1)}</td>
        </tr>`
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Helvetica, Arial, sans-serif; padding: 30px; color: #0f172a; }
          h1 { color: #0891b2; font-size: 22px; margin-bottom: 4px; }
          h2 { color: #0f172a; font-size: 14px; margin-top: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
          .subtitle { font-size: 10px; color: #475569; }
          .summary { font-size: 12px; line-height: 1.6; }
          .insight { font-style: italic; font-size: 12px; margin: 12px 0; padding: 10px; background: #f0f9ff; border-radius: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
          th { background: #0e2940; color: #e0f2fe; padding: 8px; text-align: center; }
          td { border: 1px solid #e2e8f0; padding: 8px; text-align: center; }
        </style>
      </head>
      <body>
        <h1>EyeSee - IOP Report</h1>
        <p class="subtitle">Generated on: ${new Date().toLocaleDateString()}</p>

        <h2>Summary</h2>
        <p class="summary">
          This report contains ${readings.length} readings.<br/>
          The latest reading was ${latestReading?.value.toFixed(1) ?? 'N/A'} mmHg on ${latestReading?.date.toLocaleDateString() ?? 'N/A'}.
        </p>

        ${
          insight
            ? `<h2>AI-Driven Insight</h2><div class="insight">"${insight}"</div>`
            : ''
        }

        <h2>Readings History</h2>
        <table>
          <tr><th>Date</th><th>Time</th><th>IOP (mmHg)</th></tr>
          ${tableRows}
        </table>
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
};
