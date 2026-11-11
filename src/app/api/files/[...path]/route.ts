import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_ROOTS = new Set(['uploads', 'spooler-output']);

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.pdf':
      return 'application/pdf';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    default:
      return 'application/octet-stream';
  }
}

async function resolveFallbackOrderFile(jobId: string): Promise<string | null> {
  try {
    const order = await prisma.order.findUnique({
      where: { jobId },
      include: {
        jobs: { select: { printReadyUrl: true } },
        documents: { select: { storageUrl: true } },
      },
    });
    const relUrl = order?.jobs?.[0]?.printReadyUrl || order?.documents?.[0]?.storageUrl;
    if (!relUrl || !relUrl.startsWith('/uploads/')) return null;

    const uploadsRoot = path.resolve(process.cwd(), 'public', 'uploads');
    const candidate = path.resolve(process.cwd(), 'public', relUrl.replace(/^\//, ''));
    if (!candidate.startsWith(uploadsRoot + path.sep)) return null;
    return candidate;
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: { path: string[] } }
) {
  try {
    const segments = params?.path || [];
    if (segments.length < 2 || !ALLOWED_ROOTS.has(segments[0])) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    const baseDir = path.resolve(process.cwd(), 'public', segments[0]);
    let targetPath = path.resolve(baseDir, ...segments.slice(1));

    // Prevent directory traversal outside public/uploads or public/spooler-output
    if (!targetPath.startsWith(baseDir + path.sep)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let fileBuffer: Buffer;
    try {
      fileBuffer = await fs.readFile(targetPath);
    } catch (readErr: any) {
      if (readErr?.code === 'ENOENT' && segments[0] === 'spooler-output') {
        const match = segments[1]?.match(/^order_(.+)\.pdf$/i);
        const fallbackPath = match ? await resolveFallbackOrderFile(match[1]) : null;
        if (!fallbackPath) {
          return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }
        targetPath = fallbackPath;
        fileBuffer = await fs.readFile(targetPath);
      } else {
        throw readErr;
      }
    }

    return new Response(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': getMimeType(targetPath),
        'Content-Length': String(fileBuffer.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
  }
}

