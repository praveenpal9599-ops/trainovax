-- Rebrand: AJ CLAN Pro -> TrainovaX.
-- Updates platform settings and the built-in demo data in an EXISTING database so it matches the new name.
-- Only touches rows that still carry the old demo values; your own data is left as it is.
UPDATE settings SET setting_value = 'TrainovaX' WHERE setting_key = 'platform_name' AND setting_value = 'AJ CLAN Pro';
UPDATE settings SET setting_value = 'support@trainovax.fit' WHERE setting_key = 'support_email' AND setting_value = 'support@ajclan.fit';

UPDATE organizations SET name = 'Elevate Fitness Studio', slug = 'elevate-fitness', email = 'hello@elevatefitness.in'
 WHERE slug = 'aj-clan-fitness';
UPDATE organizations SET name = 'Elevate Fitness Studio' WHERE name = 'AJ CLAN Fitness Studio';

-- Demo login e-mails: ajay@ajclan.fit -> ajay@trainovax.fit (only if the new address is free)
UPDATE users u
  LEFT JOIN users x ON x.email = REPLACE(u.email, '@ajclan.fit', '@trainovax.fit')
   SET u.email = REPLACE(u.email, '@ajclan.fit', '@trainovax.fit')
 WHERE u.email LIKE '%@ajclan.fit' AND x.id IS NULL;

UPDATE notifications SET body = REPLACE(body, 'AJ CLAN Fitness Studio', 'Elevate Fitness Studio') WHERE body LIKE '%AJ CLAN Fitness Studio%';
UPDATE notifications SET title = REPLACE(title, 'AJ CLAN Pro', 'TrainovaX') WHERE title LIKE '%AJ CLAN Pro%';
