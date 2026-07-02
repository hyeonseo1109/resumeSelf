import type { ComponentType } from "@/types/project";

export interface InsertableComponent {
  type: ComponentType;
  label: string;
  description: string;
}

export const insertableComponents: InsertableComponent[] = [
  { type: "text", label: "Text", description: "이력서 문장, 소개, 경력 설명" },
  { type: "image", label: "Image", description: "프로필, 작업물, 인증 이미지" },
  { type: "video", label: "Video", description: "데모 영상 또는 자기소개 영상" },
  { type: "button", label: "Button", description: "메일, 링크, 다운로드 CTA" },
  { type: "link", label: "Hyperlink", description: "외부 페이지 또는 연락처 링크" },
  { type: "divider", label: "Divider", description: "콘텐츠 구획선" },
  { type: "spacer", label: "Spacer", description: "여백 조정" },
  { type: "section", label: "Section", description: "스크롤/라우팅 대상 구역" },
  { type: "container", label: "Container", description: "컴포넌트 그룹" },
];
