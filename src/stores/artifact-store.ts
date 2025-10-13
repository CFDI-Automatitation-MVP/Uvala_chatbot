import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CodeType } from "@/lib/code-extraction";

export interface Artifact {
  id: string;
  title: string;
  code: string;
  type: CodeType;
  createdAt: number;
  updatedAt: number;
  messageId?: string;
  threadId?: string; // Add thread association
}

interface ArtifactStore {
  artifacts: Map<string, Artifact>;
  activeArtifactId: string | null;

  // Actions
  addArtifact: (artifact: Omit<Artifact, "createdAt" | "updatedAt">) => void;
  updateArtifact: (id: string, updates: Partial<Artifact>) => void;
  deleteArtifact: (id: string) => void;
  setActiveArtifact: (id: string | null) => void;
  getArtifact: (id: string) => Artifact | undefined;
  getArtifactsByMessage: (messageId: string) => Artifact[];
  getArtifactsByThread: (threadId: string) => Artifact[];
  loadArtifactsForThread: (threadId: string) => void;
  clearArtifacts: () => void;
}

export const useArtifactStore = create<ArtifactStore>()(
  persist(
    (set, get) => ({
      artifacts: new Map(),
      activeArtifactId: null,

      addArtifact: (artifact) => {
        console.log("[ARTIFACT STORE] addArtifact called with:", {
          id: artifact.id,
          title: artifact.title,
          type: artifact.type,
          codeLength: artifact.code.length,
          threadId: artifact.threadId,
        });

        const now = Date.now();
        const newArtifact: Artifact = {
          ...artifact,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => {
          const newArtifacts = new Map(state.artifacts);
          newArtifacts.set(artifact.id, newArtifact);
          console.log("[ARTIFACT STORE] Artifact added, total artifacts:", newArtifacts.size);
          console.log("[ARTIFACT STORE] Setting activeArtifactId to:", artifact.id);
          return {
            artifacts: newArtifacts,
            activeArtifactId: artifact.id,
          };
        });
      },

      updateArtifact: (id, updates) => {
        set((state) => {
          const artifact = state.artifacts.get(id);
          if (!artifact) return state;

          const updatedArtifact: Artifact = {
            ...artifact,
            ...updates,
            updatedAt: Date.now(),
          };

          const newArtifacts = new Map(state.artifacts);
          newArtifacts.set(id, updatedArtifact);

          return { artifacts: newArtifacts };
        });
      },

      deleteArtifact: (id) => {
        set((state) => {
          const newArtifacts = new Map(state.artifacts);
          newArtifacts.delete(id);

          return {
            artifacts: newArtifacts,
            activeArtifactId:
              state.activeArtifactId === id ? null : state.activeArtifactId,
          };
        });
      },

      setActiveArtifact: (id) => {
        set({ activeArtifactId: id });
      },

      getArtifact: (id) => {
        return get().artifacts.get(id);
      },

      getArtifactsByMessage: (messageId) => {
        const artifacts = Array.from(get().artifacts.values());
        return artifacts.filter((artifact) => artifact.messageId === messageId);
      },

      getArtifactsByThread: (threadId) => {
        const artifacts = Array.from(get().artifacts.values());
        return artifacts.filter((artifact) => artifact.threadId === threadId);
      },

      loadArtifactsForThread: (threadId) => {
        console.log("[ARTIFACT STORE] Loading artifacts for thread:", threadId);
        const threadArtifacts = get().getArtifactsByThread(threadId);
        console.log("[ARTIFACT STORE] Found artifacts for thread:", threadArtifacts.length);

        if (threadArtifacts.length > 0) {
          // Set the most recent artifact as active
          const mostRecent = threadArtifacts.sort((a, b) => b.createdAt - a.createdAt)[0];
          set({ activeArtifactId: mostRecent.id });
        }
      },

      clearArtifacts: () => {
        set({ artifacts: new Map(), activeArtifactId: null });
      },
    }),
    {
      name: "artifact-storage",
      storage: createJSONStorage(() => localStorage),
      // Custom serialization for Map
      partialize: (state) => ({
        artifacts: Array.from(state.artifacts.entries()),
        activeArtifactId: state.activeArtifactId,
      }),
      // Custom deserialization for Map
      merge: (persistedState: any, currentState) => ({
        ...currentState,
        artifacts: new Map(persistedState?.artifacts || []),
        activeArtifactId: persistedState?.activeArtifactId || null,
      }),
    }
  )
);
