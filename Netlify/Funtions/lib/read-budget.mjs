export function isQuotaError(error) {
  return ['8','resource-exhausted','resource_exhausted'].includes(String(error?.code).toLowerCase());
}

// A warm function shares successful reads and an in-flight request, and pauses
// repeated reads briefly after quota errors. It never changes Firebase quotas.
export function createReadBudget({ttlMs=30000,cooldownMs=60000,now=Date.now}={}) {
  let cached,expires=0,blockedUntil=0,lastQuota,pending,generation=0;
  return {
    invalidate(){generation++;cached=undefined;expires=0;pending=undefined;},
    async load(loader){
      if(cached!==undefined && now()<expires)return cached;
      if(now()<blockedUntil)throw lastQuota;
      if(pending)return pending.promise;
      const current={generation};
      current.promise=Promise.resolve().then(loader).then(value=>{
        if(generation===current.generation){cached=value;expires=now()+ttlMs;}
        return value;
      }).catch(error=>{
        if(isQuotaError(error)){lastQuota=error;blockedUntil=now()+cooldownMs;}
        throw error;
      }).finally(()=>{if(pending===current)pending=undefined;});
      pending=current;
      return current.promise;
    },
  };
}
