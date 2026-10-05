-- Trainer invite codes: clients enter their trainer's code when they sign up in the app.
ALTER TABLE trainers ADD COLUMN invite_code VARCHAR(12) NULL AFTER organization_id;
ALTER TABLE trainers ADD UNIQUE KEY uq_trainers_invite_code (invite_code);
-- 6-character code: 2 random base-36 characters + the trainer id in base-36 (unique per trainer).
-- Uses only CONV/LPAD/RAND, which every MySQL & MariaDB server has (no MD5 needed).
UPDATE trainers
   SET invite_code = UPPER(CONCAT(LPAD(CONV(FLOOR(RAND() * 1296), 10, 36), 2, '0'), LPAD(CONV(id, 10, 36), 4, '0')))
 WHERE invite_code IS NULL;
