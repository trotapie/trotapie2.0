export interface QuoteFilters { client:string; hotel:string; adviser:string; start:string|null; end:string|null; }
export const emptyQuoteFilters=():QuoteFilters=>({client:'',hotel:'',adviser:'',start:null,end:null});
export function quoteDateBounds(filters:QuoteFilters){
  const start=filters.start?new Date(`${filters.start}T00:00:00`):null;
  const end=filters.end?new Date(`${filters.end}T00:00:00`):null;
  if(end)end.setDate(end.getDate()+1);
  return {start:start?.toISOString(),end:end?.toISOString()};
}
