import type { ResumeComponent } from "@/types/project";

export function getSpacerOffsetBefore(
  components: ResumeComponent[],
  component: ResumeComponent,
) {
  return components
    .filter(
      (item) =>
        item.id !== component.id &&
        item.type === "spacer" &&
        !item.props.popupId &&
        item.y < component.y,
    )
    .reduce((total, spacer) => total + spacer.height, 0);
}

export function getEffectiveComponentY(
  components: ResumeComponent[],
  component: ResumeComponent,
) {
  return component.y + getSpacerOffsetBefore(components, component);
}

export function getPageTitleSpacerOffset(components: ResumeComponent[]) {
  const firstContentY = Math.min(
    ...components
      .filter((component) => component.type !== "spacer" && !component.props.popupId)
      .map((component) => component.y),
  );
  const threshold = Number.isFinite(firstContentY) ? firstContentY : 0;

  return components
    .filter(
      (component) =>
        component.type === "spacer" &&
        !component.props.popupId &&
        component.y <= threshold,
    )
    .reduce((total, spacer) => total + spacer.height, 0);
}
