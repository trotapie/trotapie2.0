const SVG_NS = 'http://www.w3.org/2000/svg';
const paint = /^(?:#[\da-f]{3,8}|[a-z]+)$/i;
const pathData = /^[\dMmZzLlHhVvCcSsQqTtAaEe.,+\s-]+$/;
const presentation = ['fill', 'fill-rule', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin'];
const rootAttributes = new Set(['xmlns', 'width', 'height', 'viewBox', ...presentation]);
const pathAttributes = new Set(['d', ...presentation]);

interface IconPath {
  d: string;
  fill: 'none' | 'currentColor';
  stroke: 'none' | 'currentColor';
  fillRule: string | null;
  strokeWidth: string | null;
  lineCap: string | null;
  lineJoin: string | null;
}

export function parseSvgPathIcon(markup: unknown): { viewBox: string; paths: IconPath[] } | null {
  if (typeof markup !== 'string' || markup.length > 12000 || /<!|<\?/.test(markup) || typeof DOMParser === 'undefined') return null;
  const root = new DOMParser().parseFromString(markup, 'image/svg+xml').documentElement;
  const validElement = (element: Element, name: string, attrs: Set<string>) =>
    element.localName === name && element.namespaceURI === SVG_NS && !element.prefix &&
    Array.from(element.attributes).every(attr => attrs.has(attr.name));
  if (!validElement(root, 'svg', rootAttributes) || root.textContent?.trim()) return null;

  const viewBox = root.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(Number);
  if (!viewBox || viewBox.length !== 4 || viewBox.some(n => !Number.isFinite(n)) ||
      viewBox[2] <= 0 || viewBox[3] <= 0) return null;
  const children = Array.from(root.children);
  if (!children.length || children.length > 32) return null;

  const paths: IconPath[] = [];
  for (const element of children) {
    if (!validElement(element, 'path', pathAttributes) || element.children.length) return null;
    const d = element.getAttribute('d')?.trim();
    if (!d || !/^[Mm]/.test(d) || !pathData.test(d)) return null;
    const attr = (name: string) => element.getAttribute(name) ?? root.getAttribute(name);
    const fill = attr('fill') ?? 'currentColor';
    const stroke = attr('stroke') ?? 'none';
    const fillRule = attr('fill-rule');
    const strokeWidth = attr('stroke-width');
    const lineCap = attr('stroke-linecap');
    const lineJoin = attr('stroke-linejoin');
    if (!paint.test(fill) || !paint.test(stroke) ||
        (fillRule !== null && !['nonzero', 'evenodd'].includes(fillRule)) ||
        (strokeWidth !== null && !/^\d*\.?\d+$/.test(strokeWidth)) ||
        (lineCap !== null && !['butt', 'round', 'square'].includes(lineCap)) ||
        (lineJoin !== null && !['miter', 'round', 'bevel'].includes(lineJoin))) return null;
    paths.push({
      d, fill: fill.toLowerCase() === 'none' ? 'none' : 'currentColor',
      stroke: stroke.toLowerCase() === 'none' ? 'none' : 'currentColor',
      fillRule, strokeWidth, lineCap, lineJoin,
    });
  }
  return { viewBox: viewBox.join(' '), paths };
}
