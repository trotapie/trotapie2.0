export function selectedIndexAfterMove(current:number,from:number,to:number):number {
  if(current===from)return to;
  if(from<current&&to>=current)return current-1;
  if(from>current&&to<=current)return current+1;
  return current;
}
