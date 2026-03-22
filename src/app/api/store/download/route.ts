import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { env } from '@/lib/env';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  // Look up the download token
  const downloadToken = await db.downloadToken.findUnique({
    where: { token },
    include: {
      orderItem: {
        include: { product: true },
      },
    },
  });

  if (!downloadToken) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
  }

  // Check expiration
  if (downloadToken.expiresAt < new Date()) {
    return NextResponse.json(
      { error: 'Download link expired', heading: 'Download Link Expired', body: 'This download link has expired. Check your email for the original order confirmation to request a new link.' },
      { status: 410 }
    );
  }

  // Check download limit
  if (downloadToken.downloadCount >= downloadToken.maxDownloads) {
    return NextResponse.json(
      { error: 'Download limit reached' },
      { status: 410 }
    );
  }

  const product = downloadToken.orderItem.product;
  const pathname = product.digitalFilePathname;

  if (!pathname) {
    return NextResponse.json(
      { error: 'Digital file not found' },
      { status: 404 }
    );
  }

  // Check for blob token
  const blobToken = env.BLOB_PRIVATE_READ_WRITE_TOKEN;
  if (!blobToken) {
    return NextResponse.json(
      { error: 'Download service not configured' },
      { status: 503 }
    );
  }

  try {
    // Fetch from Vercel Blob using the head API then download
    const { head } = await import('@vercel/blob');
    const blobInfo = await head(pathname, { token: blobToken });

    // Download the blob content
    const response = await fetch(blobInfo.url);
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch file' }, { status: 500 });
    }

    // Increment download count
    await db.downloadToken.update({
      where: { token },
      data: { downloadCount: { increment: 1 } },
    });

    const fileName = product.digitalFileName ?? 'print.png';
    const blob = await response.blob();

    return new NextResponse(blob, {
      headers: {
        'Content-Type': blobInfo.contentType ?? 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    console.error('Download error:', err);
    return NextResponse.json(
      { error: 'Failed to serve download' },
      { status: 500 }
    );
  }
}
