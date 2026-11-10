import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filePathParam = searchParams.get('path');
    const fileNameParam = searchParams.get('name') || '';
    const isDownload = searchParams.get('download') === '1';

    if (!filePathParam && !fileNameParam) {
      return NextResponse.json({ error: 'File path or name required.' }, { status: 400 });
    }

    // Resolve file within uploads directory
    const uploadsDir = path.join(process.cwd(), 'data', 'uploads');
    let targetPath = '';

    if (filePathParam) {
      const cleanPath = filePathParam.replace(/^uploads[/\\]/, '');
      targetPath = path.join(uploadsDir, cleanPath);
    } else if (fileNameParam) {
      // Find matching file in uploads directory
      if (fs.existsSync(uploadsDir)) {
        const files = fs.readdirSync(uploadsDir);
        const match = files.find(f => f.toLowerCase().includes(fileNameParam.toLowerCase().replace(/\s+/g, '_')));
        if (match) {
          targetPath = path.join(uploadsDir, match);
        }
      }
    }

    if (!targetPath || !fs.existsSync(targetPath)) {
      // Return a friendly HTML response if viewing in browser
      return new Response(
        `<!DOCTYPE html>
        <html>
        <head><title>File Notice - AI Pathashala</title><meta charset="utf-8"></head>
        <body style="font-family:system-ui,sans-serif;padding:40px;text-align:center;background:#f9fafb;color:#1f2937">
          <div style="max-width:500px;margin:auto;background:white;padding:30px;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.08);border:1px solid #e5e7eb">
            <div style="font-size:40px;margin-bottom:12px">📄</div>
            <h2 style="margin:0 0 8px 0;font-size:18px">Document Notice</h2>
            <p style="color:#6b7280;font-size:14px;line-height:1.5">
              The requested document <strong>${fileNameParam || path.basename(targetPath || '')}</strong> was processed in-memory for multi-agent evaluation.
            </p>
            <p style="color:#9ca3af;font-size:12px;margin-top:20px">AI Pathashala Academic Operating System</p>
          </div>
        </body>
        </html>`,
        { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    const fileBuffer = fs.readFileSync(targetPath);
    const resolvedName = fileNameParam || path.basename(targetPath);
    const lowerName = resolvedName.toLowerCase();

    // Determine content type
    let contentType = 'application/octet-stream';
    if (lowerName.endsWith('.pdf')) {
      contentType = 'application/pdf';
    } else if (lowerName.endsWith('.docx')) {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (lowerName.endsWith('.doc')) {
      contentType = 'application/msword';
    } else if (lowerName.endsWith('.txt')) {
      contentType = 'text/plain; charset=utf-8';
    } else if (lowerName.endsWith('.py')) {
      contentType = 'text/x-python; charset=utf-8';
    } else if (lowerName.endsWith('.json')) {
      contentType = 'application/json';
    } else if (lowerName.endsWith('.md')) {
      contentType = 'text/markdown; charset=utf-8';
    } else if (lowerName.endsWith('.png')) {
      contentType = 'image/png';
    } else if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) {
      contentType = 'image/jpeg';
    }

    const dispositionType = isDownload || lowerName.endsWith('.docx') || lowerName.endsWith('.doc') ? 'attachment' : 'inline';
    const safeHeaderFileName = resolvedName.replace(/["\r\n]/g, '_');

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `${dispositionType}; filename="${safeHeaderFileName}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err: any) {
    console.error('File serving error:', err);
    return NextResponse.json({ error: 'Failed to read file.' }, { status: 500 });
  }
}
