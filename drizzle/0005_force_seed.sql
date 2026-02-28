-- Force seed za sve korisnike, poslednjih 6 meseci, pon–pet
-- Jednostavno 09:00 - 17:00 (8h)

WITH u AS (
  SELECT id AS user_id FROM users
),
days AS (
  SELECT
    u.user_id,
    d::date AS work_date,
    (d::date + time '09:00') AS check_in,
    (d::date + time '17:00') AS check_out,
    'Force seed'::text AS note
  FROM u
  CROSS JOIN generate_series(
    (date_trunc('month', current_date) - interval '5 months')::date,
    current_date::date,
    interval '1 day'
  ) AS d
  WHERE extract(isodow from d) < 6
)
INSERT INTO work_day_records (user_id, work_date, check_in, check_out, note)
SELECT d.user_id, d.work_date, d.check_in, d.check_out, d.note
FROM days d
LEFT JOIN work_day_records w
  ON w.user_id = d.user_id
 AND w.work_date = d.work_date
WHERE w.id IS NULL;