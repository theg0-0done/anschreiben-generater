import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getAllScheduledEmails,
  saveScheduledEmail,
  rescheduleScheduledEmail,
  retryFailedEmail,
  deleteScheduledEmail,
  getScheduledEmailPdf,
} from "@/lib/scheduled-emails";
import { parseAttachmentRef, materializeForSchedule } from "@/lib/attachments";

export async function POST(request: NextRequest) {
  const t0 = performance.now();
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const t1 = performance.now();
    console.log(`[schedule POST] auth check: ${(t1 - t0).toFixed(0)}ms`);
    if (!user) {
      return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    }

    const payload = await request.json();
    const { to, subject, body, fileName, scheduledAt, metadata } = payload;

    if (!to || !subject || !body || !fileName || !scheduledAt) {
      return NextResponse.json(
        { error: "Fehlende Felder: to, subject, body, fileName und scheduledAt erforderlich." },
        { status: 400 }
      );
    }

    const attachment = parseAttachmentRef(payload, user.id);
    if (!attachment) {
      return NextResponse.json({ error: "Ungültiger Dateipfad." }, { status: 400 });
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

    // A scheduled send may go out days from now, by which time the generic
    // resume it points at could have been replaced, so the row gets its own
    // snapshot rather than a live reference.
    const pdfStoragePath = await materializeForSchedule(attachment, user.id);
    if (!pdfStoragePath) {
      return NextResponse.json({ error: "Anhang konnte nicht gesichert werden." }, { status: 502 });
    }

    const t2 = performance.now();
    const item = await saveScheduledEmail({
      userId: user.id,
      contextId: metadata?.contextId ?? null,
      to,
      subject,
      body,
      pdfStoragePath,
      fileName,
      scheduledAt: scheduledDate.toISOString(),
      metadata,
    });
    const t3 = performance.now();
    console.log(`[schedule POST] validation: ${(t2 - t1).toFixed(0)}ms, db insert: ${(t3 - t2).toFixed(0)}ms, total: ${(t3 - t0).toFixed(0)}ms`);

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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const isPdf = searchParams.get("pdf") === "true";

    if (id && isPdf) {
      const pdfData = await getScheduledEmailPdf(id, user.id);
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

    const list = await getAllScheduledEmails(user.id);
    return NextResponse.json({ scheduled: list });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Fehler beim Abrufen" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    }

    const { id, scheduledAt, retry } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "ID ist erforderlich." }, { status: 400 });
    }

    // Retry = put a failed send back in the queue as due now. The processor
    // picks it up on its next tick; the client nudges it so that's immediate.
    if (retry) {
      const result = await retryFailedEmail(id, user.id);
      if (!result.ok) {
        return NextResponse.json(
          {
            error:
              result.reason === "attachment_gone"
                ? "Der Anhang wurde nach zwei Tagen gelöscht. Bitte die Bewerbung neu erstellen."
                : "Diese E-Mail kann nicht erneut gesendet werden.",
          },
          { status: 409 }
        );
      }
      return NextResponse.json({ success: true, retried: true });
    }

    if (!scheduledAt) {
      return NextResponse.json({ error: "scheduledAt ist erforderlich." }, { status: 400 });
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

    const success = await rescheduleScheduledEmail(id, user.id, newDate.toISOString());
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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const permanent = searchParams.get("permanent") === "true";

    if (!id) {
      return NextResponse.json({ error: "ID erforderlich" }, { status: 400 });
    }

    const result = await deleteScheduledEmail(id, user.id, permanent);
    return NextResponse.json({ success: result });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Fehler beim Löschen/Abbrechen" }, { status: 500 });
  }
}
