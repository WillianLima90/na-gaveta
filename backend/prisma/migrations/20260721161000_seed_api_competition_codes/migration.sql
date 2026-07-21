-- Configure competitions synchronized through football-data.org

UPDATE "championships"
SET "api_competition_code" = 'BSA'
WHERE "slug" = 'brasileirao-serie-a-real'
  AND "api_competition_code" IS NULL;

UPDATE "championships"
SET "api_competition_code" = 'WC'
WHERE "slug" = 'copa-do-mundo-fifa-2026'
  AND "api_competition_code" IS NULL;
