import { supabase } from './supabase';
import type { ModelResult } from './gradioModel';

export interface ScanResultRow {
  userId?: number | null;
  imagePath?: string | null;
  imageUrl?: string | null;
  model: ModelResult;
}

// Best-effort extraction of structured fields from the free-text clinical report.
// The raw report is always stored too, so parsing failures are non-fatal.
const parseReport = (report: string) => {
  const num = (re: RegExp): number | null => {
    const m = report.match(re);
    return m ? parseFloat(m[1]) : null;
  };

  const vcdr = num(/vCDR[^0-9]*([0-9]*\.?[0-9]+)/i);
  const uncertainty = num(/uncertain[a-z]*[^0-9]*([0-9]*\.?[0-9]+)/i);

  let risk: string | null = null;
  const riskMatch = report.match(/\b(low|moderate|medium|high|severe)\b\s*risk/i);
  if (riskMatch) risk = riskMatch[1].toLowerCase();

  return { vcdr, uncertainty, risk };
};

export const saveScanResult = async (
  row: ScanResultRow
): Promise<{ id?: number; error?: string }> => {
  const parsed = parseReport(row.model.report);

  const { data, error } = await supabase
    .from('scan_results')
    .insert({
      user_id: row.userId ?? null,
      image_path: row.imagePath ?? null,
      image_url: row.imageUrl ?? null,
      clinical_report: row.model.report,
      status: row.model.status,
      vcdr: parsed.vcdr,
      uncertainty: parsed.uncertainty,
      risk_level: parsed.risk,
      raw_response: row.model.raw,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };
  return { id: (data as { id: number }).id };
};
