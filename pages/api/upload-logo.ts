import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { Formidable } from 'formidable';
import path from 'path';
import fs from 'fs';

const uploadDir = path.join(process.cwd(), './tmp'); // Define uploadDir here

// Set up Supabase client for admin actions (server-side)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_KEY; // Use SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Supabase URL or Service Role Key is missing.');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

export const config = {
  api: {
    bodyParser: false, // Disable Next.js body parser
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const communityId = req.query.community_id as string;
  if (!communityId) {
    return res.status(400).json({ success: false, error: 'Community ID is required.' });
  }

  const form = new Formidable({
    uploadDir: uploadDir, // Use the defined uploadDir variable
    keepExtensions: true,
    maxFileSize: 5 * 1024 * 1024, // 5MB limit
    filename: (name, ext, part) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      return `${part.originalFilename?.split('.')[0] || 'upload'}-${uniqueSuffix}${ext}`;
    }
  });

  // No need to call fs.mkdirSync(form.uploadDir) here anymore

  try {
    fs.mkdirSync(uploadDir, { recursive: true }); // Ensure the directory exists before parsing
    const [fields, files] = await form.parse(req);
    const file = files.logo?.[0];

    if (!file) {
      return res.status(400).json({ success: false, error: 'No file uploaded.' });
    }

    const filePath = file.filepath;
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = `logos/${communityId}/${file.newFilename}`;

    const { data, error: uploadError } = await supabaseAdmin.storage
      .from('community-assets') // Your Supabase Storage bucket name
      .upload(fileName, fileBuffer, {
        contentType: file.mimetype || undefined,
        upsert: true,
      });

    // Clean up temporary file
    fs.unlinkSync(filePath);

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return res.status(500).json({ success: false, error: uploadError.message });
    }

    // Get public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('community-assets')
      .getPublicUrl(fileName);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      console.error('Error getting public URL:', publicUrlData);
      return res.status(500).json({ success: false, error: 'Failed to get public URL.' });
    }

    return res.status(200).json({ success: true, url: publicUrlData.publicUrl });

  } catch (error: any) {
    console.error('Error parsing form or uploading file:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error.' });
  } finally {
    // Ensure tmp directory is cleaned up in case of error during parsing
    if (fs.existsSync(uploadDir)) {
      fs.rmSync(uploadDir, { recursive: true, force: true });
    }
  }
}
