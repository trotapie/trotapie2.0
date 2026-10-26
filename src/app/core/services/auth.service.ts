import { Injectable, inject, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ClientService } from './client.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private backend = inject(ClientService);
  private router = inject(Router);
  readonly identity = signal<{ id: string; email: string; name: string; role: string; employeeId: number; permissions: string[]; firstLogin: boolean } | null>(null);
  private pending?: Promise<boolean>;
  private checked = 0;
  error = signal('');
  hasPermission(key: string) { return this.identity()?.role === 'admin' || !!this.identity()?.permissions.includes(key); }
  async ensure(): Promise<boolean> {
    if (this.identity() && Date.now() - this.checked < 60_000) return true;
    if (this.pending) return this.pending;
    this.pending = this.resolve().finally(() => this.pending = undefined);
    return this.pending;
  }
  private async resolve(): Promise<boolean> {
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
    this.identity.set({ id: user.id, email: user.email || '', name: employee.data.nombre, employeeId: employee.data.id, role: role.data.key, permissions: (permissions || []).flatMap((r: any) => r.permission?.key ? [r.permission.key] : []), firstLogin: !!(profile.data?.primera_vez_login || employee.data.primera_vez_login) });
    this.checked = Date.now(); return true;
  }
  async signIn(email: string, password: string) {
    this.error.set('');
    const { error } = await this.backend.client.auth.signInWithPassword({ email, password });
    if (error) throw new Error('No pudimos iniciar sesión. Revisa tu correo y contraseña.');
    try { if (!await this.ensure()) throw new Error('No pudimos validar la sesión.'); }
    catch (error) { await this.signOut(); throw error; }
  }
  async signOut() { await this.backend.client.auth.signOut(); this.identity.set(null); this.checked = 0; this.backend.cache.clear(); }
  showMissingTokenDialog() { this.identity.set(null); this.backend.cache.clear(); void this.router.navigate(['/acceso']); }
}

export const authGuard: CanActivateFn = async (route, state) => {
  const auth = inject(AuthService), router = inject(Router);
  try {
    if (!await auth.ensure()) return router.createUrlTree(['/acceso'], { queryParams: { returnTo: state.url } });
    if (auth.identity()?.firstLogin && !state.url.includes('cambiar-password')) return router.createUrlTree(['/cambiar-password']);
    const permission = route.data['permission'];
    return !permission || auth.hasPermission(permission) ? true : router.createUrlTree(['/sin-acceso']);
  } catch (error) { auth.error.set(error instanceof Error ? error.message : 'No pudimos validar tu acceso.'); return router.createUrlTree(['/acceso']); }
};
