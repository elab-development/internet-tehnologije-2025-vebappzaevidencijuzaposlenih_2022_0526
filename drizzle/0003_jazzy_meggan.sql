ALTER TABLE "work_day_records" ALTER COLUMN "hours" DROP DEFAULT;

-- Trigger funkcija: automatski izračunava hours na osnovu check_in i check_out
-- hours ostaje integer (zaokruživanje: ROUND na ceo sat)

CREATE OR REPLACE FUNCTION set_work_day_hours()
RETURNS trigger AS $$
BEGIN
  -- Ako imamo oba vremena, računamo razliku u satima
  IF NEW.check_in IS NOT NULL AND NEW.check_out IS NOT NULL THEN
    NEW.hours :=
      GREATEST(
        0,
        ROUND(EXTRACT(EPOCH FROM (NEW.check_out - NEW.check_in)) / 3600.0)
      )::int;
  ELSE
    -- Ako nedostaje check_out ili check_in, sati su 0
    NEW.hours := 0;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- skidamo stari trigger ako postoji 
DROP TRIGGER IF EXISTS trg_set_work_day_hours ON work_day_records;

-- Trigger se okida pre INSERT-a ili pre UPDATE-a check_in/check_out
CREATE TRIGGER trg_set_work_day_hours
BEFORE INSERT OR UPDATE OF check_in, check_out
ON work_day_records
FOR EACH ROW
EXECUTE FUNCTION set_work_day_hours();


UPDATE work_day_records
SET hours = GREATEST(
  0,
  ROUND(EXTRACT(EPOCH FROM (check_out - check_in)) / 3600.0)
)::int
WHERE check_in IS NOT NULL
  AND check_out IS NOT NULL;