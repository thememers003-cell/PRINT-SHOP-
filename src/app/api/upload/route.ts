import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const shopSlug = (formData.get('shopSlug') as string) || 'default';

    if (!file) {
      return NextResponse.json({ error: 'No file provided in form data.' }, { status: 400 });
    }

    const safeSlug = shopSlug.replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueFilename = `${Date.now()}_${safeName}`;

    // Target directory: public/uploads/<safeSlug>/
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', safeSlug);
    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, uniqueFilename);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await fs.writeFile(filePath, buffer);

    const storageUrl = `/uploads/${safeSlug}/${uniqueFilename}`;

    return NextResponse.json({
      success: true,
      storageUrl,
      filename: file.name,
      storedFilename: uniqueFilename,
      fileSize: buffer.length,
      mimeType: file.type || 'application/octet-stream',
    });
  } catch (error: any) {
    console.error('File upload error:', error);
    return NextResponse.json({ error: error.message || 'File upload failed' }, { status: 500 });
  }
}
