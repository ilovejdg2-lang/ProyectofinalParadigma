/**
 * Persona que identifica el servicio de autenticación (auth-service).
 * No hay tabla de usuarios ni contraseñas en esta API.
 * `id` coincide con Perfil.id, autorId y anfitrionId del frontend.
 */
export interface IdentidadExterna {
  id: string;
  nombre: string;
  role?: string;
  email?: string;
}

/** Dueño de los cuestionarios de demostración. */
export const AUTOR_DEMOSTRACION: IdentidadExterna = {
  id: 'perfil-demo',
  nombre: 'Docente de prueba',
  role: 'teacher',
  email: 'profesor@una.cr',
};
