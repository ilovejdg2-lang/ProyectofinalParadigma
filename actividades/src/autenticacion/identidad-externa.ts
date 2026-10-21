/**
 * Persona que deberá identificar el servicio de autenticación.
 * No hay tabla de usuarios ni contraseñas en esta API.
 * `id` coincide con Perfil.id, autorId y anfitrionId del frontend.
 */
export interface IdentidadExterna {
  id: string;
  nombre: string;
}

/** Dueño de los cuestionarios de demostración. No es una cuenta real. */
export const AUTOR_DEMOSTRACION: IdentidadExterna = {
  id: 'perfil-demo',
  nombre: 'Docente de prueba',
};
