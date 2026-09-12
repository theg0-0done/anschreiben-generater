import { NextRequest, NextResponse } from "next/server";
import { getTokensFromCookies } from "@/lib/gmail";
import {
  getAllScheduledEmails,
  saveScheduledEmail,
  rescheduleScheduledEmail,
  deleteScheduledEmail,
  getScheduledEmailPdf,
} from "@/lib/scheduled-emails";

export async function POST(request: NextRequest) {
  try {
    const tokens = await getTokensFromCookies();
    if (!tokens) {
      return NextResponse.json(
        { error: "Nicht mit Gmail verbunden. Bitte zuerst authentifizieren." },
        { status: 401 }
      );
    }

    const { to, subject, body, pdfBase64, fileName, scheduledAt, metadata } = await request.json();

    if (!to || !subject || !body || !pdfBase64 || !fileName || !scheduledAt) {
      return NextResponse.json(
        { error: "Fehlende Felder: to, subject, body, pdfBase64, fileName und scheduledAt erforderlich." },
        { status: 400 }
      );
    }

    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json(
        { error: "Ungültiges Datum für scheduledAt." },
        { status: 400 }
      );
    }

    if (scheduledDate.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "Das geplante Sendedatum muss in der Zukunft liegen." },
        { status: 400 }
      );
    }

    // saveScheduledEmail is async (uploads PDF to Supabase Storage)
    const item = await saveScheduledEmail({
      to,
      subject,
      body,
      pdfBase64,
      fileName,
      scheduledAt: scheduledDate.toISOString(),
      tokens,
      metadata,
    });

    return NextResponse.json({ success: true, item });
  } catch (error: any) {
    console.error("Schedule email error:", error);
    return NextResponse.json(
      { error: error?.message || "Fehler beim Planen der E-Mail." },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const isPdf = searchParams.get("pdf") === "true";

    // If requesting PDF preview
    if (id && isPdf) {
      const pdfData = await getScheduledEmailPdf(id);
      if (!pdfData) {
        return new NextResponse("PDF nicht gefunden", { status: 404 });
      }

      return new NextResponse(new Uint8Array(pdfData.buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${encodeURIComponent(pdfData.fileName)}"`,
        },
      });
    }

    const list = await getAllScheduledEmails();
    return NextResponse.json({ scheduled: list });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Fehler beim Abrufen" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, scheduledAt } = await request.json();
    if (!id || !scheduledAt) {
      return NextResponse.json({ error: "ID und scheduledAt sind erforderlich." }, { status: 400 });
    }

    const newDate = new Date(scheduledAt);
    if (isNaN(newDate.getTime())) {
      return NextResponse.json({ error: "Ungültiges Datum für scheduledAt." }, { status: 400 });
    }

    if (newDate.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "Das neue Sendedatum muss in der Zukunft liegen." },
        { status: 400 }
      );
    }

    const success = await rescheduleScheduledEmail(id, newDate.toISOString());
    if (!success) {
      return NextResponse.json({ error: "Konnte geplante E-Mail nicht verschieben." }, { status: 500 });
    }

    return NextResponse.json({ success: true, scheduledAt: newDate.toISOString() });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Fehler beim Verschieben." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const permanent = searchParams.get("permanent") === "true";

    if (!id) {
      return NextResponse.json({ error: "ID erforderlich" }, { status: 400 });
    }

    const result = await deleteScheduledEmail(id, permanent);
    return NextResponse.json({ success: result });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Fehler beim Löschen/Abbrechen" }, { status: 500 });
  }
}

