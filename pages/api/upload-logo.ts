import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import { createClient } from '@supabase/supabase-js';

// Supabase admin client (server-side only)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

// We need to disable body parsing for this route because formidable handles it
export const config = {
  api: {
    bodyParser: false,
  },
};

type Data = { success: boolean; message?: string; imageUrl?: string; error?: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const form = formidable({
    multiples: false,
    keepExtensions: true,
    uploadDir: '.tmp', // Temporary directory for uploads
  });

  // Parse the form data
  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Formidable error:', err);
      return res.status(500).json({ success: false, error: 'Failed to parse form data.' });
    }

    const file = files.logo ? (Array.isArray(files.logo) ? files.logo[0] : files.logo) : null;

    if (!file) {
      return res.status(400).json({ success: false, error: 'No file uploaded.' });
    }

    const communityId = Array.isArray(fields.communityId) ? fields.communityId[0] : fields.communityId;

    if (!communityId) {
      return res.status(400).json({ success: false, error: 'Community ID is required for logo upload.' });
    }

    const fileExtension = file.originalFilename?.split('.').pop();
    const fileName = `${communityId}-logo-${Date.now()}.${fileExtension}`;
    const bucketName = 'community-logos'; // Define your Supabase storage bucket name

    try {
      const { data, error: uploadError } = await supabaseAdmin.storage
        .from(bucketName)
        .upload(fileName, file.filepath!, { // Use file.filepath for local path
          cacheControl: '3600',
          upsert: false,
          contentType: file.mimetype || undefined,
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        return res.status(500).json({ success: false, error: uploadError.message });
      }

      // Get the public URL
      const { data: publicUrlData } = supabaseAdmin.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      if (publicUrlData && publicUrlData.publicUrl) {
        return res.status(200).json({ success: true, message: 'Logo uploaded successfully!', imageUrl: publicUrlData.publicUrl });
      } else {
        return res.status(500).json({ success: false, error: 'Failed to get public URL after upload.' });
      }
    } catch (error: any) {
      console.error('Unexpected error during logo upload:', error);
      return res.status(500).json({ success: false, error: error.message || 'An unexpected error occurred.' });
    }
  });
}
