import { File, Directory, Paths } from 'expo-file-system';

// Base URL of your Hugging Face Gradio Space. Override via env if you fork/rename it.
const SPACE_URL =
  process.env.EXPO_PUBLIC_HF_SPACE_URL ?? 'https://nj-1111-eyeesee.hf.space';

// Only needed if the Space is PRIVATE. Public spaces ignore this.
const HF_TOKEN = process.env.EXPO_PUBLIC_HF_TOKEN ?? '';

// Gradio 5.x mounts its REST API under /gradio_api.
const API = `${SPACE_URL}/gradio_api`;
const ENDPOINT = 'analyse'; // the api_name from /config

export interface ModelResult {
  report: string; // Clinical Report textbox
  status: string; // Status textbox
  raw: unknown; // full parsed output array, for the DB + debugging
}

// ── Debug logging ────────────────────────────────────────────────────────────
// Writes step-by-step request/response artifacts to <documentDir>/eyesee-debug/.
// Inspect them with the debug viewer or by pulling the file off the device.
const writeDebug = (name: string, content: string) => {
  try {
    const dir = new Directory(Paths.document, 'eyesee-debug');
    try {
      dir.create({ intermediates: true });
    } catch {
      // already exists
    }
    const f = new File(dir, name);
    try {
      f.create();
    } catch {
      // already exists – we'll overwrite
    }
    f.write(content);
  } catch (e) {
    console.warn('[gradio] failed to write debug file', name, e);
  }
};

const authHeaders = (): Record<string, string> =>
  HF_TOKEN ? { Authorization: `Bearer ${HF_TOKEN}` } : {};

// Parses a Gradio SSE response body into ordered { event, data } records.
const parseSSE = (text: string): Array<{ event: string; data: string }> => {
  const blocks = text.split('\n\n');
  const records: Array<{ event: string; data: string }> = [];
  for (const block of blocks) {
    let event = 'message';
    const dataLines: string[] = [];
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
    }
    if (dataLines.length) records.push({ event, data: dataLines.join('\n') });
  }
  return records;
};

// Full pipeline: upload image → trigger analyse → poll SSE result → parse.
export const analyzeFundusImage = async (
  localUri: string
): Promise<{ data?: ModelResult; error?: string }> => {
  try {
    // ── Step 1: upload the file to Gradio's temp storage ─────────────────────
    const form = new FormData();
    form.append('files', {
      uri: localUri,
      name: 'scan.jpg',
      type: 'image/jpeg',
    } as any);

    const uploadRes = await fetch(`${API}/upload`, {
      method: 'POST',
      headers: { ...authHeaders() },
      body: form,
    });
    const uploadText = await uploadRes.text();
    writeDebug('01-upload-response.json', `status ${uploadRes.status}\n${uploadText}`);

    if (!uploadRes.ok) {
      return { error: `Upload failed (${uploadRes.status}): ${uploadText.slice(0, 200)}` };
    }

    // Returns a JSON array of server-side temp file paths.
    const uploadedPaths: string[] = JSON.parse(uploadText);
    const serverPath = uploadedPaths[0];

    // ── Step 2: trigger the `analyse` function with a FileData reference ──────
    const fileData = {
      path: serverPath,
      url: `${API}/file=${serverPath}`,
      orig_name: 'scan.jpg',
      meta: { _type: 'gradio.FileData' },
    };

    const callRes = await fetch(`${API}/call/${ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ data: [fileData] }),
    });
    const callText = await callRes.text();
    writeDebug('02-call-response.json', `status ${callRes.status}\n${callText}`);

    if (!callRes.ok) {
      return { error: `Call failed (${callRes.status}): ${callText.slice(0, 200)}` };
    }

    const { event_id } = JSON.parse(callText) as { event_id: string };
    if (!event_id) return { error: 'No event_id returned from the model.' };

    // ── Step 3: read the SSE result stream (closes when prediction finishes) ──
    const resultRes = await fetch(`${API}/call/${ENDPOINT}/${event_id}`, {
      method: 'GET',
      headers: { ...authHeaders() },
    });
    const sseText = await resultRes.text();
    writeDebug('03-sse-raw.txt', sseText);

    const records = parseSSE(sseText);

    // An error event from the queue means the function raised server-side.
    const errorRecord = records.find((r) => r.event === 'error');
    if (errorRecord) {
      return { error: `Model error: ${errorRecord.data.slice(0, 300)}` };
    }

    // The final output is in the last `complete` event (fall back to last data).
    const completeRecord =
      [...records].reverse().find((r) => r.event === 'complete') ??
      [...records].reverse().find((r) => r.data);

    if (!completeRecord) {
      return { error: 'No result returned from the model.' };
    }

    const output = JSON.parse(completeRecord.data) as unknown[];
    const result: ModelResult = {
      report: typeof output[0] === 'string' ? output[0] : JSON.stringify(output[0]),
      status: typeof output[1] === 'string' ? output[1] : '',
      raw: output,
    };

    writeDebug('04-parsed.json', JSON.stringify(result, null, 2));
    return { data: result };
  } catch (e: any) {
    const message = e?.message ?? 'Network error contacting the model.';
    writeDebug('99-error.txt', message + '\n' + (e?.stack ?? ''));
    return { error: message };
  }
};
