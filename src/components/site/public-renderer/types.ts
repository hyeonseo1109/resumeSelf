import type { ResumeComponent, ResumePage } from "@/types/project";

export interface PageLayout {
  page: ResumePage;
  components: ResumeComponent[];
  offset: number;
  height: number;
}

export interface RenderedComponent {
  component: ResumeComponent;
  displayTop: number;
}

export interface MobileComponentNode {
  component: ResumeComponent;
  children: MobileComponentNode[];
}
