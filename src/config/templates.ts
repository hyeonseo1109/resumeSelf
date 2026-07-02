import type { ResumeProject } from "@/types/project";

export const starterResumeProject: ResumeProject = {
  id: "starter",
  ownerId: "system",
  title: "Eunseo Resume",
  slug: "eunseo",
  mode: "template",
  navigationMode: "scroll",
  updatedAt: "2026-01-01T00:00:00.000Z",
  publishedAt: null,
  navigation: [
    { id: "nav-resume", label: "Resume", target: "resume", order: 0 },
    { id: "nav-portfolio", label: "Portfolio", target: "portfolio", order: 1 },
    { id: "nav-about", label: "About", target: "about", order: 2 },
  ],
  pages: [
    {
      id: "page-home",
      slug: "home",
      title: "Home",
      order: 0,
      sections: [
        {
          id: "resume",
          title: "Resume",
          order: 0,
          components: [
            {
              id: "headline",
              type: "text",
              x: 80,
              y: 72,
              width: 640,
              height: 120,
              content: "안녕하세요. 문제를 구조화하고 제품으로 풀어내는 Product Designer Eunseo입니다.",
              props: { fontSize: 34, color: "#111827", fontWeight: 700 },
            },
            {
              id: "summary",
              type: "text",
              x: 84,
              y: 214,
              width: 520,
              height: 92,
              content: "Framer처럼 빠르게 배치하고 Notion처럼 쉽게 작성하는 웹 이력서 템플릿입니다.",
              props: { fontSize: 17, color: "#4b5563" },
            },
          ],
        },
      ],
    },
  ],
};
