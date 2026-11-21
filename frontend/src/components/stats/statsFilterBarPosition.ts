export const DONG_MENU_DEFAULT_WIDTH = 224;
export const DONG_MENU_VIEWPORT_MARGIN = 12;

export function computeClampedDropdownMaxWidth(
  viewportWidth: number,
  margin: number = DONG_MENU_VIEWPORT_MARGIN
): number {
  if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) {
    return 0;
  }
  const safeMargin = Number.isFinite(margin) && margin >= 0 ? margin : DONG_MENU_VIEWPORT_MARGIN;
  return Math.max(0, viewportWidth - safeMargin * 2);
}

export function computeClampedDropdownLeftOffset(
  triggerLeft: number,
  menuWidth: number,
  viewportWidth: number,
  margin: number = DONG_MENU_VIEWPORT_MARGIN
): number {
  if (!Number.isFinite(triggerLeft) || !Number.isFinite(viewportWidth) || viewportWidth <= 0) {
    return 0;
  }
  const safeMargin = Number.isFinite(margin) && margin >= 0 ? margin : DONG_MENU_VIEWPORT_MARGIN;
  const maxAvailableWidth = computeClampedDropdownMaxWidth(viewportWidth, safeMargin);
  const desiredWidth =
    Number.isFinite(menuWidth) && menuWidth > 0 ? menuWidth : DONG_MENU_DEFAULT_WIDTH;
  const effectiveMenuWidth = Math.min(desiredWidth, maxAvailableWidth);
  const maxViewportLeft = Math.max(safeMargin, viewportWidth - safeMargin - effectiveMenuWidth);
  const clampedViewportLeft = Math.min(Math.max(triggerLeft, safeMargin), maxViewportLeft);
  const offset = clampedViewportLeft - triggerLeft;
  return offset === 0 ? 0 : offset;
}
