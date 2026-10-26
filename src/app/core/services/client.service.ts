import { Injectable } from '@angular/core';
import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '../../../environments/environment.generated';
import { QueryCache } from '../utils/query-cache';

@Injectable({ providedIn: 'root' })
export class ClientService {
  readonly cache = new QueryCache();
  readonly client = createClient(supabaseConfig.supabaseUrl, supabaseConfig.supabaseAnonKey, {
    auth: { storageKey: 'trotapie-new-session', persistSession: true, autoRefreshToken: true },
    global: { fetch: (url, init) => {
      const timeout = AbortSignal.timeout(20_000);
      const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
      return fetch(url, { ...init, signal });
    } },
  });
  constructor() {
    this.client.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT' || event === 'SIGNED_IN' || event === 'USER_UPDATED') this.cache.clear();
    });
  }
}
