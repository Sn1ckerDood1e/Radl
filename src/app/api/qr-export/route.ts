import { NextRequest, NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get teamId from query params
    const teamId = request.nextUrl.searchParams.get('teamId');
    if (!teamId) {
      return NextResponse.json({ error: 'teamId required' }, { status: 400 });
    }

    // Verify user is a coach on this team
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: user.id } },
      select: { role: true },
    });

    if (!membership || membership.role !== 'COACH') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get team name and all equipment
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { name: true },
    });

    const equipment = await prisma.equipment.findMany({
      where: { teamId },
      select: { id: true, name: true, type: true },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    if (equipment.length === 0) {
      return NextResponse.json({ error: 'No equipment found' }, { status: 404 });
    }

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter', // 8.5 x 11 inches
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://rowops.app';

    // Layout: 3 columns x 4 rows = 12 QR codes per page
    const cols = 3;
    const rows = 4;
    const qrSize = 50; // mm
    const marginX = 15; // mm from edge
    const marginY = 20; // mm from top
    const gapX = (215.9 - 2 * marginX - cols * qrSize) / (cols - 1); // Letter width is 215.9mm
    const gapY = 12; // mm between rows
    const labelHeight = 8; // mm for equipment name

    // Add title to first page
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${team?.name || 'Team'} - Equipment QR Codes`, marginX, 12);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Generated: ${new Date().toLocaleDateString()}`, marginX, 17);

    let currentPage = 0;
    let itemIndex = 0;

    for (const item of equipment) {
      const pageIndex = Math.floor(itemIndex / (cols * rows));
      const positionOnPage = itemIndex % (cols * rows);
      const col = positionOnPage % cols;
      const row = Math.floor(positionOnPage / cols);

      // Add new page if needed
      if (pageIndex > currentPage) {
        pdf.addPage();
        currentPage = pageIndex;
      }

      const x = marginX + col * (qrSize + gapX);
      const y = marginY + row * (qrSize + labelHeight + gapY);

      // Generate QR code as data URL
      const reportUrl = `${baseUrl}/report/${item.id}`;
      const qrDataUrl = await QRCode.toDataURL(reportUrl, {
        width: 500, // High resolution for print quality
        margin: 1,
        errorCorrectionLevel: 'M',
      });

      // Add QR code to PDF
      pdf.addImage(qrDataUrl, 'PNG', x, y, qrSize, qrSize);

      // Equipment name label below QR
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      const truncatedName = item.name.length > 20 ? item.name.substring(0, 18) + '...' : item.name;
      pdf.text(truncatedName, x + qrSize / 2, y + qrSize + 5, { align: 'center' });

      itemIndex++;
    }

    // Get PDF as buffer
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));

    // Return PDF
    const fileName = `${team?.name?.toLowerCase().replace(/\s+/g, '-') || 'team'}-qr-codes.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('QR export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
