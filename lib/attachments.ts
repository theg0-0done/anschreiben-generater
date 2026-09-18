import { supabase } from "./supabase";

const JOB_DOCUMENTS = "job-documents";
const SCHEDULED_PDFS = "scheduled-pdfs";

/**
 * Where the PDF about to be mailed actually lives.
 *
 * A per-company application is generated in the browser, so the only copy is
 * there and it has to be uploaded. A generic ("Allgemeine Bewerbung") one was
 * uploaded to job-documents once, weeks ago, and every send after that reused
 * it. Pushing those same bytes back up on every send cost the user a full
 * upload of a multi-megabyte file before anything could be sent, which is
 * where the twenty second wait came from. Naming the stored copy instead
 * keeps that transfer entirely between our server and Storage.
 */
export type AttachmentRef =
  | { kind: "uploaded"; path: string }
  | { kind: "generic"; contextId: string };

export function parseAttachmentRef(
  body: { pdfStoragePath?: unknown; genericContextId?: unknown },
  userId: string
): AttachmentRef | null {
  if (typeof body.genericContextId === "string" && body.genericContextId) {
    return { kind: "generic", contextId: body.genericContextId };
  }
  // The client uploads straight to Storage under its own user_id folder, so
  // anything outside that prefix is somebody else's file (or a probe).
  if (typeof body.pdfStoragePath === "string" && body.pdfStoragePath.startsWith(`${userId}/`)) {
    return { kind: "uploaded", path: body.pdfStoragePath };
  }
  return null;
}

/** The generic resume stored on this user's Ausbildung, if there is one. */
async function genericResumePath(userId: string, contextId: string): Promise<string | null> {
  const { data } = await supabase
    .from("job_contexts")
    .select("generic_resume_storage_path")
    .eq("id", contextId)
    .eq("user_id", userId)
    .maybeSingle();

  return data?.generic_resume_storage_path ?? null;
}

/** Fetch the bytes to attach, wherever they happen to be stored. */
export async function readAttachment(
  ref: AttachmentRef,
  userId: string
): Promise<Buffer | null> {
  const [bucket, path] =
    ref.kind === "uploaded"
      ? [SCHEDULED_PDFS, ref.path]
      : [JOB_DOCUMENTS, await genericResumePath(userId, ref.contextId)];

  if (!path) return null;

  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

/**
 * Give a scheduled row its own copy in scheduled-pdfs.
 *
 * A scheduled send may go out days later, by which time the generic resume it
 * pointed at could have been replaced, so the row needs a snapshot rather than
 * a reference. The copy happens server side, so it costs the user nothing.
 */
export async function materializeForSchedule(
  ref: AttachmentRef,
  userId: string
): Promise<string | null> {
  if (ref.kind === "uploaded") return ref.path;

  const source = await genericResumePath(userId, ref.contextId);
  if (!source) return null;

  const destination = `${userId}/${crypto.randomUUID()}.pdf`;
  const { error } = await supabase.storage
    .from(JOB_DOCUMENTS)
    .copy(source, destination, { destinationBucket: SCHEDULED_PDFS });

  if (!error) return destination;

  // Older Storage versions reject a cross-bucket copy; fall back to moving the
  // bytes through this process, which is still server-to-Storage on both legs.
  const bytes = await readAttachment(ref, userId);
  if (!bytes) return null;

  const { error: uploadError } = await supabase.storage
    .from(SCHEDULED_PDFS)
    .upload(destination, bytes, { contentType: "application/pdf" });

  return uploadError ? null : destination;
}
