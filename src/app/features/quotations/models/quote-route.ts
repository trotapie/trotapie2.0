const internalRoutePattern=/^([1-9]\d*)-([\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12})$/i;

export function parseQuoteRoute(segment:string):{internalId:number|null;publicId:string}{
  const match=internalRoutePattern.exec(segment);
  const internalId=match?Number(match[1]):null;
  return match&&Number.isSafeInteger(internalId)
    ?{internalId,publicId:match[2]}
    :{internalId:null,publicId:segment};
}

export function quoteAdminSegment(id:unknown,publicId:string):string{
  const internalId=Number(id);
  return Number.isSafeInteger(internalId)&&internalId>0&&publicId
    ?`${internalId}-${publicId}`:publicId;
}
