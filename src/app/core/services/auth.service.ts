import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { ClientService } from './client.service';
import { ADMIN_IDLE_REASON, createAdminIdleSession, isAdminUrl, readSessionId } from '../utils/admin-idle-session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private backend = inject(ClientService);
  private router = inject(Router);
  private window = inject(DOCUMENT).defaultView;
  readonly identity = signal<{ id: string; email: string; name: string; role: string; employeeId: number; permissions: string[]; firstLogin: boolean } | null>(null);
  readonly idleWarning = signal(false);
  readonly idleExpired = signal(false);
  private pending?: Promise<boolean>;
  private idleSignOut?: Promise<void>;
  private sessionId?: string;
  private authGeneration = 0;
  private checked = 0;
  private idle = this.window && createAdminIdleSession(this.window, () => isAdminUrl(this.router.url), (state, id) => {
    this.idleWarning.set(state === 'warning');
    this.idleExpired.set(state === 'expired');
    if (state === 'expired') this.expireAdminSession(id);
  });
  error = signal('');
  constructor() {
    const {data: {subscription}} = this.backend.client.auth.onAuthStateChange(event => {
      if (event !== 'SIGNED_OUT') return;
      this.idle?.check();
      this.clearIdentity();
      if (!this.idleExpired()) {
        this.idle?.stop();
        this.idleWarning.set(false);
      }
    });
    inject(DestroyRef).onDestroy(() => {
      subscription.unsubscribe();
      this.idle?.stop();
    });
  }
  hasPermission(key: string) { return this.identity()?.role === 'admin' || (key !== 'configuracion.manage' && !!this.identity()?.permissions.includes(key)); }
  async ensure(): Promise<boolean> {
    if (this.idleExpired()) return false;
    if (this.identity() && Date.now() - this.checked < 60_000) return true;
    if (this.pending) return this.pending;
    this.pending = this.resolve().finally(() => this.pending = undefined);
    return this.pending;
  }
  private async resolve(): Promise<boolean> {
    const generation = this.authGeneration;
    const client = this.backend.client;
    const { data: session } = await client.auth.getSession();
    if (!session.session) { this.identity.set(null); return false; }
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) { this.identity.set(null); return false; }
    const user = data.user;
    const [profile, employee] = await Promise.all([
      client.from('profiles').select('role, primera_vez_login').eq('id', user.id).maybeSingle(),
      client.from('empleados').select('id, nombre, estatus_id, primera_vez_login').eq('auth_user_id', user.id).maybeSingle(),
    ]);
    if (profile.error || employee.error || !employee.data) throw new Error('No encontramos un empleado asociado a tu acceso.');
    const [status, role] = await Promise.all([
      client.from('estatus_empleado').select('clave, activo').eq('id', employee.data.estatus_id).maybeSingle(),
      client.from('roles').select('id, key').eq('key', profile.data?.role || 'cotizador').maybeSingle(),
    ]);
    if (status.error || !status.data?.activo || status.data.clave?.toLowerCase() !== 'activo') throw new Error('Tu acceso está inactivo. Contacta al administrador.');
    if (role.error || !role.data) throw new Error('No encontramos un rol para tu acceso.');
    const { data: permissions, error: permissionError } = await client.from('role_permissions').select('permission:permissions(key)').eq('role_id', role.data.id);
    if (permissionError) throw permissionError;
    if (generation !== this.authGeneration) return false;
    this.sessionId = readSessionId(session.session.access_token);
    this.identity.set({ id: user.id, email: user.email || '', name: employee.data.nombre, employeeId: employee.data.id, role: role.data.key, permissions: (permissions || []).flatMap((r: any) => r.permission?.key ? [r.permission.key] : []), firstLogin: !!(profile.data?.primera_vez_login || employee.data.primera_vez_login) });
    this.checked = Date.now(); return true;
  }
  checkAdminIdle() {
    if (this.sessionId) this.idle?.start(this.sessionId);
    return !this.idleExpired();
  }
  keepAdminSessionAlive() { this.idle?.keepAlive(); }
  idleAccessUrl(returnTo: string): UrlTree {
    return this.router.createUrlTree(['/acceso'], { queryParams: { returnTo, reason: ADMIN_IDLE_REASON } });
  }
  private expireAdminSession(id: string) {
    if (this.idleSignOut) return;
    this.clearIdentity();
    this.idleSignOut = this.revokeIdleSession(id).finally(() => this.idleSignOut = undefined);
    const returnTo = this.router.url;
    if (isAdminUrl(returnTo)) {
      void this.router.navigateByUrl(this.idleAccessUrl(returnTo), { replaceUrl: true });
    }
  }
  private async revokeIdleSession(id: string) {
    try {
      const auth = this.backend.client.auth;
      const {data} = await auth.getSession();
      if (data.session && readSessionId(data.session.access_token) === id) {
        // Revoke this browser's session, not other devices signed in as the same user.
        const {error} = await auth.signOut({scope: 'local'});
        if (!error) return;
      }
    } catch {
      // Supabase may be unreachable; still discard the local credentials below.
    }
    this.backend.discardStoredSession(id);
  }
  async signIn(email: string, password: string) {
    this.error.set('');
    await this.idleSignOut;
    this.clearIdentity();
    const { error } = await this.backend.client.auth.signInWithPassword({ email, password });
    if (error) throw new Error('No pudimos iniciar sesión. Revisa tu correo y contraseña.');
    this.idle?.stop();
    this.idleWarning.set(false);
    this.idleExpired.set(false);
    await this.pending?.catch(() => false);
    try { if (!await this.ensure()) throw new Error('No pudimos validar la sesión.'); }
    catch (error) { await this.signOut(); throw error; }
  }
  async signOut() {
    await this.backend.client.auth.signOut();
    this.idle?.stop();
    this.idleWarning.set(false);
    this.clearIdentity();
  }
  private clearIdentity() {
    this.authGeneration++;
    this.identity.set(null);
    this.sessionId = undefined;
    this.checked = 0;
    this.backend.cache.clear();
  }
  showMissingTokenDialog() { this.clearIdentity(); void this.router.navigate(['/acceso']); }
}

export const authGuard: CanActivateFn = async (route, state) => {
  const auth = inject(AuthService), router = inject(Router);
  try {
    if (!await auth.ensure()) {
      return auth.idleExpired() && isAdminUrl(state.url) ? auth.idleAccessUrl(state.url) :
        router.createUrlTree(['/acceso'], { queryParams: { returnTo: state.url } });
    }
    if (auth.identity()?.firstLogin && !state.url.includes('cambiar-password')) return router.createUrlTree(['/cambiar-password']);
    if (isAdminUrl(state.url) && !auth.checkAdminIdle()) return auth.idleAccessUrl(state.url);
    const permission = route.data['permission'];
    return !permission || auth.hasPermission(permission) ? true : router.createUrlTree(['/sin-acceso']);
  } catch (error) { auth.error.set(error instanceof Error ? error.message : 'No pudimos validar tu acceso.'); return router.createUrlTree(['/acceso']); }
};
