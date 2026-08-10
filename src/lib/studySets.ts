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

export interface ReceivedStudySet {
  studySet: SavedStudySet;
}

interface LessonShareRow {
  id: string;
  lesson_id: string;
  owner_id: string;
  topic: string;
  scope: StudySet["scope"];
  payload: StudySet;
  shared_emails: string[];
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

export type ShareVisibility = "private" | "public";

export interface ShareResult {
  visibility: ShareVisibility;
  slug: string | null;
  url: string | null;
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
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  if (!authData.user) return [];

  const { data, error } = await supabase
    .from("study_sets")
    .select("*")
    .eq("user_id", authData.user.id)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as SavedStudySet[]) ?? [];
}

export async function listReceivedStudySets(): Promise<ReceivedStudySet[]> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);

  const email = authData.user?.email?.trim().toLowerCase();
  if (!email) return [];

  const { data, error } = await supabase
    .from("lesson_shares")
    .select("id, lesson_id, owner_id, topic, scope, payload, shared_emails, created_at, updated_at")
    .contains("shared_emails", [email])
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);

  return ((data ?? []) as LessonShareRow[]).map((share) => ({
    studySet: {
      id: share.lesson_id,
      user_id: share.owner_id,
      topic: share.topic,
      scope: share.scope,
      payload: share.payload,
      created_at: share.created_at,
      updated_at: share.updated_at,
    },
  }));
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
  emails: string[],
  visibility: ShareVisibility
): Promise<ShareResult> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  if (!authData.user) throw new Error("You must be signed in to share a study set.");
  const normalized = [...new Set(
    emails
      .map((email) => email.trim().toLowerCase())
      .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  )];

  const { data: existingShare, error: existingShareError } = await supabase
    .from("lesson_shares")
    .select("shared_emails")
    .eq("lesson_id", studySetId)
    .eq("owner_id", authData.user.id)
    .maybeSingle();

  if (existingShareError) throw new Error(existingShareError.message);

  const existingEmails = ((existingShare?.shared_emails as string[] | undefined) ?? [])
    .map((email) => email.trim().toLowerCase());
  const mergedEmails = [...new Set([...existingEmails, ...normalized])];

  const { data: lesson, error: lessonError } = await supabase
    .from("study_sets")
    .select("id, user_id, topic, scope, payload")
    .eq("id", studySetId)
    .eq("user_id", authData.user.id)
    .single();

  if (lessonError) throw new Error(lessonError.message);

  const { error: lessonShareError } = await supabase
    .from("lesson_shares")
    .upsert(
      {
        lesson_id: lesson.id,
        owner_id: lesson.user_id,
        topic: lesson.topic,
        scope: lesson.scope,
        payload: lesson.payload,
        shared_emails: mergedEmails,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "lesson_id" }
    );

  if (lessonShareError) throw new Error(lessonShareError.message);

  const visibilityResult = await setLessonShareVisibility(studySetId, visibility);

  const recipients: ShareRecipient[] = normalized.map((email) =>
    existingEmails.includes(email)
      ? { email, status: "skipped", message: "Already shared" }
      : { email, status: "invited" }
  );

  return {
    visibility,
    slug: visibilityResult.slug,
    url: visibilityResult.url,
    recipients,
  };
}

export async function setLessonShareVisibility(
  studySetId: string,
  visibility: ShareVisibility
): Promise<{ slug: string | null; url: string | null }> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  if (!authData.user) throw new Error("You must be signed in to change lesson visibility.");

  const { data: lessonShare, error: lessonShareLookupError } = await supabase
    .from("lesson_shares")
    .select("lesson_id")
    .eq("lesson_id", studySetId)
    .eq("owner_id", authData.user.id)
    .maybeSingle();

  if (lessonShareLookupError) throw new Error(lessonShareLookupError.message);
  if (!lessonShare) throw new Error("Save the sharing settings before changing visibility.");

  let slug: string | null = null;

  if (visibility === "public") {
    const { data: existing, error: lookupError } = await supabase
      .from("shared_study_sets")
      .select("id, slug")
      .eq("study_set_id", studySetId)
      .maybeSingle();

    if (lookupError) throw new Error(lookupError.message);
    slug = (existing?.slug as string | undefined) ?? null;

    if (!slug) {
      const { data: created, error: createError } = await supabase
        .from("shared_study_sets")
        .insert({
          study_set_id: studySetId,
          created_by: authData.user.id,
        })
        .select()
        .single();
      if (createError) throw new Error(createError.message);
      slug = (created as PublicShare).slug;
    }
  } else {
    const { error: revokeError } = await supabase
      .from("shared_study_sets")
      .delete()
      .eq("study_set_id", studySetId)
      .eq("created_by", authData.user.id);
    if (revokeError) throw new Error(revokeError.message);
  }

  const { error: visibilityError } = await supabase
    .from("lesson_shares")
    .update({ visibility, updated_at: new Date().toISOString() })
    .eq("lesson_id", studySetId)
    .eq("owner_id", authData.user.id);
  if (visibilityError) throw new Error(visibilityError.message);

  return {
    slug,
    url: slug ? `${window.location.origin}/s/${slug}` : null,
  };
}

export async function revokeShare(studySetId: string): Promise<void> {
  const { error: recipientError } = await supabase
    .from("lesson_shares")
    .delete()
    .eq("lesson_id", studySetId);
  if (recipientError) throw new Error(recipientError.message);

  const { error: publicShareError } = await supabase
    .from("shared_study_sets")
    .delete()
    .eq("study_set_id", studySetId);
  if (publicShareError) throw new Error(publicShareError.message);
}
