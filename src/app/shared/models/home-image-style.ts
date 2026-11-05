export const HOME_IMAGE_POSITIONS = ['top-left','top-center','top-right','center-left','center','center-right','bottom-left','bottom-center','bottom-right'] as const;
export type HomeImagePosition = typeof HOME_IMAGE_POSITIONS[number];
export interface HomeImageStyle {
  zoom:number; x:number; y:number;
  textColor:string; textBackground:string; textSize:number; textPosition:HomeImagePosition;
}
export const HOME_IMAGE_STYLE:Readonly<HomeImageStyle> = {
  zoom:1, x:50, y:50, textColor:'#30392e', textBackground:'#ffffff', textSize:11, textPosition:'top-left',
};
export function normalizeHomeImageStyle(raw:unknown):HomeImageStyle {
  const value = raw && typeof raw === 'object' ? raw as Record<string,unknown> : {};
  const number = (key:keyof HomeImageStyle,min:number,max:number) => {
    const n = value[key] === null || value[key] === '' ? NaN : Number(value[key]);
    return Number.isFinite(n) ? Math.min(max,Math.max(min,n)) : HOME_IMAGE_STYLE[key] as number;
  };
  const color = (key:'textColor'|'textBackground') => /^#[\da-f]{6}$/i.test(String(value[key])) ? String(value[key]) : HOME_IMAGE_STYLE[key];
  return {
    zoom:number('zoom',0.5,3),x:number('x',0,100),y:number('y',0,100),
    textColor:color('textColor'),textBackground:color('textBackground'),textSize:HOME_IMAGE_STYLE.textSize,
    textPosition:HOME_IMAGE_POSITIONS.includes(value['textPosition'] as HomeImagePosition) ? value['textPosition'] as HomeImagePosition : HOME_IMAGE_STYLE.textPosition,
  };
}
export function homeImagePhotoStyle(raw:unknown):Record<string,string> {
  const value = normalizeHomeImageStyle(raw);
  return {'object-position':`${value.x}% ${value.y}%`,transform:`scale(${value.zoom})`,'transform-origin':`${value.x}% ${value.y}%`};
}

/** Convert a screen-space drag to object-position/transform-origin coordinates. */
export function homeImagePanPosition(start:number,delta:number,frameSize:number,photoSize:number,zoom:number):number {
  const travel = frameSize-photoSize*zoom;
  // A perfectly fitted axis cannot pan with object-position at 100% zoom.
  if (Math.abs(travel)<0.01) return start;
  return Math.min(100,Math.max(0,start+delta/travel*100));
}
export function homeImageTextStyle(raw:unknown):Record<string,string> {
  const value = normalizeHomeImageStyle(raw);
  const index = HOME_IMAGE_POSITIONS.indexOf(value.textPosition), column = index%3, row = Math.floor(index/3);
  return {
    color:value.textColor,background:value.textBackground,'font-size':`${value.textSize}px`,
    left:['24px','50%','auto'][column],right:column===2?'24px':'auto',
    top:['24px','50%','auto'][row],bottom:row===2?'84px':'auto',
    transform:`translate(${column===1?'-50%':'0'},${row===1?'-50%':'0'})`,
  };
}
