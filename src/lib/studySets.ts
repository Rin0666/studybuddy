import supabase from "./supabase";
import type { StudySet, Model } from "@/types";

export interface SavedStudySet {
  id: string;
  user_id: string;
  topic: string;
  scope: StudySet["scope"];
  payload: StudySet;
  created_at: string;
  updated_at: string;
}

export interface PublicShare {
  id: string;
  study_set_id: string;
  slug: string;
  created_by: string;
  created_at: string;
}

export type ShareRecipient = {
  email: string;
  status: "invited" | "skipped" | "error";
  message?: string;
};

export interface ShareResult {
  slug: string;
  url: string;
  recipients: ShareRecipient[];
}

export async function saveStudySet(
  studySet: StudySet,
  model?: Model,
  savedId?: string
): Promise<SavedStudySet> {
  const payload: StudySet & { _meta?: { savedWithModel?: Model } } = { ...studySet };
  if (model) payload._meta = { savedWithModel: model };

  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error("You must be signed in to save a study set.");

  const values = {
    user_id: user.id,
    topic: studySet.topic,
    scope: studySet.scope,
    payload,
  };

  const query = savedId
    ? supabase
        .from("study_sets")
        .update(values)
        .eq("id", savedId)
        .eq("user_id", user.id)
    : supabase.from("study_sets").insert(values);

  const { data, error } = await query.select().single();

  if (error) throw new Error(error.message);
  return data as SavedStudySet;
}

export async function listSavedStudySets(): Promise<SavedStudySet[]> {
  const { data, error } = await supabase
    .from("study_sets")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as SavedStudySet[]) ?? [];
}

export async function deleteStudySet(id: string): Promise<void> {
  const { error } = await supabase.from("study_sets").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function getStudySetById(id: string): Promise<SavedStudySet | null> {
  const { data, error } = await supabase.from("study_sets").select("*").eq("id", id).single();
  if (error) return null;
  return data as SavedStudySet;
}

export async function getSharedStudySet(slug: string): Promise<{ share: PublicShare; studySet: StudySet } | null> {
  const { data: share, error } = await supabase
    .from("shared_study_sets")
    .select("*, study_sets!inner(payload)")
    .eq("slug", slug)
    .single();

  if (error || !share) return null;
  const typed = share as unknown as PublicShare & { study_sets: { payload: StudySet } };
  return { share: typed, studySet: typed.study_sets.payload };
}

export async function createShare(
  studySetId: string,
  emails: string[]
): Promise<ShareResult> {
  const { data: existing, error: lookupError } = await supabase
    .from("shared_study_sets")
    .select("id, slug")
    .eq("study_set_id", studySetId)
    .maybeSingle();

  if (lookupError) throw new Error(lookupError.message);

  let slug = existing?.slug as string | undefined;
  if (!slug) {
    const { data: created, error: createError } = await supabase
      .from("shared_study_sets")
      .insert({ study_set_id: studySetId })
      .select()
      .single();
    if (createError) throw new Error(createError.message);
    slug = (created as PublicShare).slug;
  }

  const url = `${window.location.origin}/s/${slug}`;
  const recipients: ShareRecipient[] = [];

  if (emails.length > 0) {
    const normalized = emails
      .map((e) => e.trim().toLowerCase())
      .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

    for (const email of normalized) {
      try {
        const { error } = await supabase.from("study_set_invites").insert({
          study_set_id: studySetId,
          email,
        });
        if (error?.code === "23505") {
          recipients.push({ email, status: "skipped", message: "Already invited" });
        } else if (error) {
          recipients.push({ email, status: "error", message: error.message });
        } else {
          recipients.push({ email, status: "invited" });
        }
      } catch (err) {
        recipients.push({
          email,
          status: "error",
          message: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }
  }

  return { slug, url, recipients };
}

export async function revokeShare(studySetId: string): Promise<void> {
  const { error } = await supabase.from("shared_study_sets").delete().eq("study_set_id", studySetId);
  if (error) throw new Error(error.message);
}
