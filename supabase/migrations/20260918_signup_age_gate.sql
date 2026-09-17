-- 21+ signup age gate (self-attested).
--
-- The platform is 21+ but nothing enforced it at account creation: DOB was
-- optional and only collected later in settings. This makes the gate real —
-- handle_new_user() now reads a self-attested date_of_birth from the signup
-- metadata, persists it on the profile, and ABORTS the signup (auth.users
-- insert rolls back) when it is missing or under 21. The signup form collects
-- and validates the DOB client-side for good UX; this trigger is the server-side
-- backstop that a crafted request cannot bypass.
--
-- Preserves the SECURITY DEFINER + pinned search_path hardening from
-- 20260620_security_hardening.sql.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  dob date;
BEGIN
  -- Parse the attested DOB from signup metadata; treat anything unparseable as
  -- absent so the checks below give a clean error rather than a cast failure.
  BEGIN
    dob := (NEW.raw_user_meta_data->>'date_of_birth')::date;
  EXCEPTION WHEN others THEN
    dob := NULL;
  END;

  IF dob IS NULL THEN
    RAISE EXCEPTION 'A date of birth is required to join be.vocl.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF dob > (current_date - interval '21 years') THEN
    RAISE EXCEPTION 'You must be 21 or older to join be.vocl.'
      USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.profiles (id, username, display_name, date_of_birth)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    NEW.raw_user_meta_data->>'display_name',
    dob
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
