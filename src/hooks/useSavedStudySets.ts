import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { saveStudySet, listSavedStudySets, deleteStudySet, createShare, revokeShare, getStudySetById } from "@/lib/studySets";
import type { SavedStudySet, ShareResult } from "@/lib/studySets";
import type { StudySet, Model } from "@/types";

type SaveStatus = "idle" | "loading" | "success" | "error";
type ShareStatus = "idle" | "loading" | "success" | "error";
type ListStatus = "idle" | "loading" | "success" | "error";

interface UseSavedStudySets {
  list: SavedStudySet[];
  listStatus: ListStatus;
  listError: string | null;
  refresh: () => Promise<void>;
  save: (studySet: StudySet, model?: Model) => Promise<SavedStudySet | null>;
  saveStatus: SaveStatus;
  saveError: string | null;
  remove: (id: string) => Promise<void>;
  removeStatus: SaveStatus;
  removeError: string | null;
  getById: (id: string) => Promise<SavedStudySet | null>;
  share: (studySetId: string, emails: string[]) => Promise<ShareResult | null>;
  shareStatus: ShareStatus;
  shareError: string | null;
  revoke: (studySetId: string) => Promise<void>;
}

export function useSavedStudySets(): UseSavedStudySets {
  const { user } = useAuth();
  const [list, setList] = useState<SavedStudySet[]>([]);
  const [listStatus, setListStatus] = useState<ListStatus>("idle");
  const [listError, setListError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [removeStatus, setRemoveStatus] = useState<SaveStatus>("idle");
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<ShareStatus>("idle");
  const [shareError, setShareError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setList([]);
      return;
    }
    setListStatus("loading");
    setListError(null);
    try {
      const data = await listSavedStudySets();
      setList(data);
      setListStatus("success");
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Failed to load saved study sets.");
      setListStatus("error");
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(async (studySet: StudySet, model?: Model): Promise<SavedStudySet | null> => {
    setSaveStatus("loading");
    setSaveError(null);
    try {
      const saved = await saveStudySet(studySet, model);
      setSaveStatus("success");
      setList((prev) => {
        const next = prev.filter((s) => s.id !== saved.id);
        return [saved, ...next];
      });
      return saved;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save study set.";
      setSaveError(message);
      setSaveStatus("error");
      return null;
    }
  }, []);

  const remove = useCallback(async (id: string): Promise<void> => {
    setRemoveStatus("loading");
    setRemoveError(null);
    try {
      await deleteStudySet(id);
      setRemoveStatus("success");
      setList((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete study set.";
      setRemoveError(message);
      setRemoveStatus("error");
    }
  }, []);

  const getById = useCallback(async (id: string): Promise<SavedStudySet | null> => {
    return getStudySetById(id);
  }, []);

  const share = useCallback(async (studySetId: string, emails: string[]): Promise<ShareResult | null> => {
    setShareStatus("loading");
    setShareError(null);
    try {
      const result = await createShare(studySetId, emails);
      setShareStatus("success");
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to share study set.";
      setShareError(message);
      setShareStatus("error");
      return null;
    }
  }, []);

  const revoke = useCallback(async (studySetId: string): Promise<void> => {
    await revokeShare(studySetId);
  }, []);

  return {
    list,
    listStatus,
    listError,
    refresh,
    save,
    saveStatus,
    saveError,
    remove,
    removeStatus,
    removeError,
    getById,
    share,
    shareStatus,
    shareError,
    revoke,
  };
}
