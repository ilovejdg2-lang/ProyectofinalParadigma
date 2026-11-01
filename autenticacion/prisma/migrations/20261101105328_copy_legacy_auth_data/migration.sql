DO $migration$
BEGIN
  IF to_regclass('public."User"') IS NULL THEN
    RAISE NOTICE 'No legacy authentication data found; skipping transfer.';
  ELSE
    IF to_regclass('public."Institution"') IS NULL
       OR to_regclass('public."EmailDomainPolicy"') IS NULL
       OR to_regclass('public."RefreshToken"') IS NULL
       OR to_regclass('public."EmailVerificationToken"') IS NULL THEN
      RAISE EXCEPTION 'Legacy authentication schema is incomplete; no data was copied.';
    END IF;

    INSERT INTO auth_service."Institution"
      ("id", "name", "isActive", "createdAt")
    SELECT "id", "name", "isActive", "createdAt"
    FROM public."Institution";

    INSERT INTO auth_service."EmailDomainPolicy"
      ("id", "domain", "institutionId", "defaultRole",
       "autoGrantRole", "requiresVerification", "createdAt")
    SELECT "id", "domain", "institutionId", "defaultRole",
           "autoGrantRole", "requiresVerification", "createdAt"
    FROM public."EmailDomainPolicy";

    INSERT INTO auth_service."User"
      ("id", "email", "passwordHash", "displayName", "role",
       "emailVerified", "institutionId", "status", "createdAt", "updatedAt")
    SELECT "id", "email", "passwordHash", "displayName", "role",
           "emailVerified", "institutionId", "status", "createdAt", "updatedAt"
    FROM public."User";

    INSERT INTO auth_service."RefreshToken"
      ("id", "userId", "tokenHash", "familyId", "expiresAt",
       "revokedAt", "replacedBy", "createdByIp", "createdAt")
    SELECT "id", "userId", "tokenHash", "familyId", "expiresAt",
           "revokedAt", "replacedBy", "createdByIp", "createdAt"
    FROM public."RefreshToken";

    INSERT INTO auth_service."EmailVerificationToken"
      ("id", "userId", "tokenHash", "expiresAt", "usedAt", "createdAt")
    SELECT "id", "userId", "tokenHash", "expiresAt", "usedAt", "createdAt"
    FROM public."EmailVerificationToken";
  END IF;
END
$migration$;