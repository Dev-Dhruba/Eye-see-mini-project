import { File } from 'expo-file-system';
import { supabase } from './supabase';

const BUCKET = 'eyeScan';

export interface UploadResult {
  path: string;
  publicUrl: string;
}

// Uploads a local image file (from CameraView.takePictureAsync) to the eyeScan bucket.
export const uploadScanImage = async (
  localUri: string,
  userId?: number | null
): Promise<{ data?: UploadResult; error?: string }> => {
  try {
    const bytes = await new File(localUri).bytes();

    const folder = userId != null ? String(userId) : 'anon';
    const path = `${folder}/${Date.now()}.jpg`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
      contentType: 'image/jpeg',
      upsert: false,
    });

    if (error) return { error: error.message };

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { data: { path, publicUrl: data.publicUrl } };
  } catch (e: any) {
    return { error: e?.message ?? 'Failed to upload image.' };
  }
};
