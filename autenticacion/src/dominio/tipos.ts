export type RolUsuario = 'teacher' | 'student' | 'admin';

export type EstadoUsuario = 'Active' | 'Locked' | 'PendingVerification';

export interface PerfilPublico {
  id: string;
  nombre: string;
  correo: string;
  rol: RolUsuario;
  emailVerificado: boolean;
}

export interface TokensRespuesta {
  token: string;
  refreshToken: string;
  perfil: PerfilPublico;
}

export interface ClaimToken {
  sub: string;
  email: string;
  name: string;
  role: RolUsuario;
  iss: string;
  aud: string;
  jti: string;
  iat: number;
  exp: number;
  inst?: string;
}

export interface JwkKey {
  kty: string;
  use: string;
  alg: string;
  kid: string;
  n: string;
  e: string;
}

export interface JwksResponse {
  keys: JwkKey[];
}

export interface OpenIdConfiguration {
  issuer: string;
  jwks_uri: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  response_types_supported: string[];
  subject_types_supported: string[];
  id_token_signing_alg_values_supported: string[];
}
