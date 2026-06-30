"use client";

import { create } from "zustand";
import type { ComponentType, ResumeComponent, ResumeProject, SaveStatus } from "@/types/project";

interface EditorState {
  project: ResumeProject;
  selectedComponentId: string | null;
  saveStatus: SaveStatus;
  mode: "edit" | "preview";
  selectComponent: (id: string | null) => void;
  addComponent: (type: ComponentType) => void;
  updateComponent: (id: string, patch: Partial<ResumeComponent>) => void;
  setMode: (mode: "edit" | "preview") => void;
  markSaved: () => void;
}

export function createEditorStore(initialProject: ResumeProject) {
  return create<EditorState>((set) => ({
    project: initialProject,
    selectedComponentId: null,
    saveStatus: "idle",
    mode: "edit",
    selectComponent: (id) => set({ selectedComponentId: id }),
    setMode: (mode) => set({ mode }),
    markSaved: () => set({ saveStatus: "saved" }),
    addComponent: (type) =>
      set((state) => {
        const component: ResumeComponent = {
          id: crypto.randomUUID(),
          type,
          x: 96,
          y: 120,
          width: type === "divider" ? 520 : 360,
          height: type === "text" ? 96 : 140,
          content: type === "text" ? "새 텍스트를 입력하세요" : undefined,
          props: {},
        };

        const [page] = state.project.pages;
        const [section] = page.sections;

        return {
          saveStatus: "dirty",
          selectedComponentId: component.id,
          project: {
            ...state.project,
            pages: [
              {
                ...page,
                sections: [
                  {
                    ...section,
                    components: [...section.components, component],
                  },
                ],
              },
            ],
          },
        };
      }),
    updateComponent: (id, patch) =>
      set((state) => ({
        saveStatus: "dirty",
        project: {
          ...state.project,
          pages: state.project.pages.map((page) => ({
            ...page,
            sections: page.sections.map((section) => ({
              ...section,
              components: section.components.map((component) =>
                component.id === id ? { ...component, ...patch } : component,
              ),
            })),
          })),
        },
      })),
  }));
}

