-- Marks accounts made before email verification as verified, so they can still sign in.
UPDATE "user" SET "emailVerified" = true;
