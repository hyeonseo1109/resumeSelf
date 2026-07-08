export type SubscriptionTier = "free" | "premium";

export type ProjectMode = "template" | "free";

export type NavigationMode = "router" | "scroll";

export type ComponentType =
  | "text"
  | "image"
  | "video"
  | "button"
  | "icon"
  | "link"
  | "divider"
  | "spacer"
  | "section"
  | "container"
  | "popup";

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

export interface NavigationItem {
  id: string;
  label: string;
  target: string;
  order: number;
}

export interface ResumeComponent {
  id: string;
  type: ComponentType;
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  props: Record<string, string | number | boolean | null>;
}

export interface ResumeSection {
  id: string;
  title: string;
  order: number;
  components: ResumeComponent[];
}

export interface ResumePage {
  id: string;
  slug: string;
  title: string;
  order: number;
  canvasBackground?: string;
  sections: ResumeSection[];
}

export interface ResumeProject {
  id: string;
  ownerId: string;
  title: string;
  slug: string;
  memo?: string;
  deleteLocked?: boolean;
  mode: ProjectMode;
  navigationMode: NavigationMode;
  navigation: NavigationItem[];
  pages: ResumePage[];
  updatedAt: string;
  publishedAt: string | null;
}
