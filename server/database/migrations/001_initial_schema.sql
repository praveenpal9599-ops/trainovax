-- =====================================================================
-- TrainovaX — Initial schema
-- MySQL 8.0+ / MariaDB 10.6+ · InnoDB · utf8mb4
-- =====================================================================

-- ---------------------------------------------------------------------
-- Access control
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  id            TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(40)  NOT NULL,
  label         VARCHAR(80)  NOT NULL,
  description   VARCHAR(255) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS permissions (
  id            SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code          VARCHAR(80)  NOT NULL,
  module        VARCHAR(40)  NOT NULL,
  description   VARCHAR(255) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_permissions_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       TINYINT UNSIGNED  NOT NULL,
  permission_id SMALLINT UNSIGNED NOT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_rp_perm FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Organizations / subscriptions
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organizations (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(150) NOT NULL,
  slug          VARCHAR(160) NOT NULL,
  email         VARCHAR(190) NULL,
  phone         VARCHAR(30)  NULL,
  address       VARCHAR(255) NULL,
  city          VARCHAR(100) NULL,
  country       VARCHAR(100) NULL DEFAULT 'India',
  logo_url      VARCHAR(500) NULL,
  status        ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_org_slug (slug),
  KEY idx_org_status (status),
  KEY idx_org_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subscription_plans (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name           VARCHAR(80)  NOT NULL,
  description    VARCHAR(255) NULL,
  price_monthly  DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_yearly   DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_trainers   INT UNSIGNED NOT NULL DEFAULT 1,
  max_clients    INT UNSIGNED NOT NULL DEFAULT 25,
  status         ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sub_plan_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subscriptions (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  organization_id INT UNSIGNED NOT NULL,
  plan_id         INT UNSIGNED NOT NULL,
  billing_cycle   ENUM('monthly','yearly') NOT NULL DEFAULT 'monthly',
  amount          DECIMAL(10,2) NOT NULL DEFAULT 0,
  status          ENUM('trial','active','past_due','cancelled','expired') NOT NULL DEFAULT 'trial',
  start_date      DATE NOT NULL,
  end_date        DATE NULL,
  auto_renew      TINYINT(1) NOT NULL DEFAULT 1,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_sub_org (organization_id),
  KEY idx_sub_status (status),
  CONSTRAINT fk_sub_org  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_sub_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Users / trainers / clients
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  role_id             TINYINT UNSIGNED NOT NULL,
  organization_id     INT UNSIGNED NULL,
  name                VARCHAR(120) NOT NULL,
  email               VARCHAR(190) NOT NULL,
  password_hash       VARCHAR(100) NOT NULL,
  phone               VARCHAR(30)  NULL,
  avatar_url          VARCHAR(500) NULL,
  status              ENUM('active','inactive') NOT NULL DEFAULT 'active',
  last_login_at       DATETIME NULL,
  reset_token_hash    CHAR(64) NULL,
  reset_token_expires DATETIME NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at          DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role_id),
  KEY idx_users_org (organization_id),
  KEY idx_users_status (status),
  KEY idx_users_reset (reset_token_hash),
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id),
  CONSTRAINT fk_users_org  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS trainers (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id          INT UNSIGNED NOT NULL,
  organization_id  INT UNSIGNED NULL,
  specialization   VARCHAR(150) NULL,
  experience_years TINYINT UNSIGNED NULL,
  certifications   VARCHAR(255) NULL,
  bio              TEXT NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at       DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_trainers_user (user_id),
  KEY idx_trainers_org (organization_id),
  CONSTRAINT fk_trainers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_trainers_org  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS clients (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id            INT UNSIGNED NULL,
  organization_id    INT UNSIGNED NULL,
  trainer_id         INT UNSIGNED NULL,
  full_name          VARCHAR(120) NOT NULL,
  email              VARCHAR(190) NULL,
  phone              VARCHAR(30)  NULL,
  age                TINYINT UNSIGNED NULL,
  gender             ENUM('male','female','other') NULL,
  height_cm          DECIMAL(5,1) NULL,
  starting_weight_kg DECIMAL(5,1) NULL,
  current_weight_kg  DECIMAL(5,1) NULL,
  fitness_goal       ENUM('weight_loss','muscle_gain','strength_training','endurance','general_fitness','flexibility') NOT NULL DEFAULT 'general_fitness',
  photo_url          VARCHAR(500) NULL,
  notes              TEXT NULL,
  status             ENUM('active','inactive') NOT NULL DEFAULT 'active',
  joined_on          DATE NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at         DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_clients_user (user_id),
  KEY idx_clients_trainer (trainer_id),
  KEY idx_clients_org (organization_id),
  KEY idx_clients_status (status),
  KEY idx_clients_name (full_name),
  KEY idx_clients_deleted (deleted_at),
  CONSTRAINT fk_clients_user    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_clients_org     FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL,
  CONSTRAINT fk_clients_trainer FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS client_profiles (
  id                       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id                INT UNSIGNED NOT NULL,
  date_of_birth            DATE NULL,
  address                  VARCHAR(255) NULL,
  occupation               VARCHAR(120) NULL,
  emergency_contact_name   VARCHAR(120) NULL,
  emergency_contact_phone  VARCHAR(30)  NULL,
  target_weight_kg         DECIMAL(5,1) NULL,
  activity_level           ENUM('sedentary','light','moderate','active','very_active') NULL,
  experience_level         ENUM('beginner','intermediate','advanced') NULL,
  dietary_preference       ENUM('vegetarian','non_vegetarian','vegan','eggetarian') NULL,
  medical_conditions       VARCHAR(500) NULL,
  injuries                 VARCHAR(500) NULL,
  allergies                VARCHAR(255) NULL,
  medications              VARCHAR(255) NULL,
  workout_days_per_week    TINYINT UNSIGNED NULL,
  preferred_workout_time   ENUM('early_morning','morning','afternoon','evening','night') NULL,
  sleep_hours              DECIMAL(3,1) NULL,
  water_goal_ml            INT UNSIGNED NULL DEFAULT 3000,
  created_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cp_client (client_id),
  CONSTRAINT fk_cp_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS client_notes (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id   INT UNSIGNED NOT NULL,
  author_id   INT UNSIGNED NULL,
  content     TEXT NOT NULL,
  is_pinned   TINYINT(1) NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at  DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_cn_client (client_id),
  CONSTRAINT fk_cn_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  CONSTRAINT fk_cn_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS attendance (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id     INT UNSIGNED NOT NULL,
  trainer_id    INT UNSIGNED NULL,
  session_date  DATE NOT NULL,
  check_in_time TIME NULL,
  status        ENUM('present','absent','late','excused') NOT NULL DEFAULT 'present',
  notes         VARCHAR(255) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_att_client_date (client_id, session_date),
  KEY idx_att_date (session_date),
  CONSTRAINT fk_att_client  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  CONSTRAINT fk_att_trainer FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tasks (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL,
  client_id   INT UNSIGNED NULL,
  title       VARCHAR(200) NOT NULL,
  due_date    DATE NULL,
  priority    ENUM('low','medium','high') NOT NULL DEFAULT 'medium',
  status      ENUM('open','done') NOT NULL DEFAULT 'open',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at  DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_tasks_user_status (user_id, status, due_date),
  CONSTRAINT fk_tasks_user   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_tasks_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Exercise master
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exercise_categories (
  id          SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(60) NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_excat_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS muscle_groups (
  id          SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(60) NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_muscle_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS exercises (
  id                   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name                 VARCHAR(120) NOT NULL,
  description          TEXT NULL,
  category_id          SMALLINT UNSIGNED NULL,
  primary_muscle_id    SMALLINT UNSIGNED NULL,
  secondary_muscle_id  SMALLINT UNSIGNED NULL,
  equipment            VARCHAR(100) NULL,
  difficulty           ENUM('beginner','intermediate','advanced') NOT NULL DEFAULT 'beginner',
  exercise_type        ENUM('reps','time','distance') NOT NULL DEFAULT 'reps',
  instructions         TEXT NULL,
  default_sets         TINYINT UNSIGNED NULL,
  default_reps         VARCHAR(20) NULL,
  default_duration_sec INT UNSIGNED NULL,
  default_rest_sec     INT UNSIGNED NULL,
  video_url            VARCHAR(500) NULL,
  image_url            VARCHAR(500) NULL,
  status               ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_by           INT UNSIGNED NULL,
  created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at           DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_ex_name (name),
  KEY idx_ex_category (category_id),
  KEY idx_ex_muscle (primary_muscle_id),
  KEY idx_ex_status (status),
  CONSTRAINT fk_ex_category FOREIGN KEY (category_id) REFERENCES exercise_categories(id) ON DELETE SET NULL,
  CONSTRAINT fk_ex_primary  FOREIGN KEY (primary_muscle_id) REFERENCES muscle_groups(id) ON DELETE SET NULL,
  CONSTRAINT fk_ex_second   FOREIGN KEY (secondary_muscle_id) REFERENCES muscle_groups(id) ON DELETE SET NULL,
  CONSTRAINT fk_ex_creator  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Food master
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS food_categories (
  id          SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(60) NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_foodcat_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS foods (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name           VARCHAR(120) NOT NULL,
  category_id    SMALLINT UNSIGNED NULL,
  serving_size   DECIMAL(7,1) NOT NULL DEFAULT 100,
  serving_unit   VARCHAR(20)  NOT NULL DEFAULT 'g',
  calories       DECIMAL(7,1) NOT NULL DEFAULT 0,
  protein_g      DECIMAL(6,1) NOT NULL DEFAULT 0,
  carbs_g        DECIMAL(6,1) NOT NULL DEFAULT 0,
  fat_g          DECIMAL(6,1) NOT NULL DEFAULT 0,
  fiber_g        DECIMAL(6,1) NOT NULL DEFAULT 0,
  sugar_g        DECIMAL(6,1) NOT NULL DEFAULT 0,
  sodium_mg      DECIMAL(7,1) NOT NULL DEFAULT 0,
  is_vegetarian  TINYINT(1) NOT NULL DEFAULT 1,
  is_vegan       TINYINT(1) NOT NULL DEFAULT 0,
  allergens      VARCHAR(255) NULL,
  status         ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_by     INT UNSIGNED NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at     DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_food_name (name),
  KEY idx_food_category (category_id),
  KEY idx_food_status (status),
  CONSTRAINT fk_food_category FOREIGN KEY (category_id) REFERENCES food_categories(id) ON DELETE SET NULL,
  CONSTRAINT fk_food_creator  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Workout templates  (template -> days -> exercises)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workout_templates (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  organization_id INT UNSIGNED NULL,           -- NULL = global/platform template
  created_by      INT UNSIGNED NULL,
  name            VARCHAR(150) NOT NULL,
  description     TEXT NULL,
  goal            VARCHAR(40) NULL,
  difficulty      ENUM('beginner','intermediate','advanced') NOT NULL DEFAULT 'beginner',
  duration_weeks  TINYINT UNSIGNED NULL,
  status          ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_wt_org (organization_id),
  CONSTRAINT fk_wt_org     FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_wt_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS workout_template_days (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  template_id  INT UNSIGNED NOT NULL,
  day_of_week  TINYINT UNSIGNED NULL,          -- 1=Mon … 7=Sun
  name         VARCHAR(100) NOT NULL,
  focus        VARCHAR(120) NULL,
  sort_order   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_wtd_template (template_id, sort_order),
  CONSTRAINT fk_wtd_template FOREIGN KEY (template_id) REFERENCES workout_templates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS workout_template_exercises (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  day_id        INT UNSIGNED NOT NULL,
  exercise_id   INT UNSIGNED NOT NULL,
  sets          TINYINT UNSIGNED NULL,
  reps          VARCHAR(20) NULL,
  duration_sec  INT UNSIGNED NULL,
  weight_kg     DECIMAL(6,2) NULL,
  rest_sec      INT UNSIGNED NULL,
  tempo         VARCHAR(20) NULL,
  notes         VARCHAR(500) NULL,
  sort_order    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_wte_day (day_id, sort_order),
  CONSTRAINT fk_wte_day FOREIGN KEY (day_id) REFERENCES workout_template_days(id) ON DELETE CASCADE,
  CONSTRAINT fk_wte_ex  FOREIGN KEY (exercise_id) REFERENCES exercises(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Workout plans assigned to clients (plan -> days -> exercises)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workout_plans (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id    INT UNSIGNED NOT NULL,
  trainer_id   INT UNSIGNED NULL,
  template_id  INT UNSIGNED NULL,
  name         VARCHAR(150) NOT NULL,
  description  TEXT NULL,
  goal         VARCHAR(40) NULL,
  difficulty   ENUM('beginner','intermediate','advanced') NOT NULL DEFAULT 'beginner',
  start_date   DATE NULL,
  end_date     DATE NULL,
  status       ENUM('draft','active','completed','archived') NOT NULL DEFAULT 'active',
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at   DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_wp_client_status (client_id, status),
  KEY idx_wp_trainer (trainer_id),
  CONSTRAINT fk_wp_client   FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  CONSTRAINT fk_wp_trainer  FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE SET NULL,
  CONSTRAINT fk_wp_template FOREIGN KEY (template_id) REFERENCES workout_templates(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS workout_days (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  plan_id      INT UNSIGNED NOT NULL,
  day_of_week  TINYINT UNSIGNED NULL,
  name         VARCHAR(100) NOT NULL,
  focus        VARCHAR(120) NULL,
  sort_order   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_wd_plan (plan_id, sort_order),
  KEY idx_wd_dow (plan_id, day_of_week),
  CONSTRAINT fk_wd_plan FOREIGN KEY (plan_id) REFERENCES workout_plans(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS workout_exercises (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  day_id        INT UNSIGNED NOT NULL,
  exercise_id   INT UNSIGNED NOT NULL,
  sets          TINYINT UNSIGNED NULL,
  reps          VARCHAR(20) NULL,
  duration_sec  INT UNSIGNED NULL,
  weight_kg     DECIMAL(6,2) NULL,
  rest_sec      INT UNSIGNED NULL,
  tempo         VARCHAR(20) NULL,
  notes         VARCHAR(500) NULL,
  sort_order    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_we_day (day_id, sort_order),
  CONSTRAINT fk_we_day FOREIGN KEY (day_id) REFERENCES workout_days(id) ON DELETE CASCADE,
  CONSTRAINT fk_we_ex  FOREIGN KEY (exercise_id) REFERENCES exercises(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS workout_logs (
  id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id           INT UNSIGNED NOT NULL,
  workout_exercise_id INT UNSIGNED NOT NULL,
  log_date            DATE NOT NULL,
  status              ENUM('completed','skipped') NOT NULL,
  actual_sets         TINYINT UNSIGNED NULL,
  actual_reps         VARCHAR(20) NULL,
  actual_weight_kg    DECIMAL(6,2) NULL,
  notes               VARCHAR(255) NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wl_ex_date (workout_exercise_id, log_date),
  KEY idx_wl_client_date (client_id, log_date),
  CONSTRAINT fk_wl_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  CONSTRAINT fk_wl_we     FOREIGN KEY (workout_exercise_id) REFERENCES workout_exercises(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Diet templates  (template -> meals -> foods)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS diet_templates (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  organization_id  INT UNSIGNED NULL,
  created_by       INT UNSIGNED NULL,
  name             VARCHAR(150) NOT NULL,
  description      TEXT NULL,
  goal             VARCHAR(40) NULL,
  diet_type        ENUM('vegetarian','non_vegetarian','vegan','eggetarian','mixed') NOT NULL DEFAULT 'mixed',
  target_calories  INT UNSIGNED NULL,
  status           ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at       DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_dt_org (organization_id),
  CONSTRAINT fk_dt_org     FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_dt_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS diet_template_meals (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  template_id  INT UNSIGNED NOT NULL,
  meal_type    ENUM('breakfast','mid_morning','lunch','snack','pre_workout','post_workout','dinner','bedtime') NOT NULL,
  name         VARCHAR(100) NOT NULL,
  meal_time    TIME NULL,
  sort_order   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_dtm_template (template_id, sort_order),
  CONSTRAINT fk_dtm_template FOREIGN KEY (template_id) REFERENCES diet_templates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS diet_template_foods (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  meal_id     INT UNSIGNED NOT NULL,
  food_id     INT UNSIGNED NOT NULL,
  quantity    DECIMAL(6,2) NOT NULL DEFAULT 1,     -- number of servings
  notes       VARCHAR(255) NULL,
  sort_order  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_dtf_meal (meal_id, sort_order),
  CONSTRAINT fk_dtf_meal FOREIGN KEY (meal_id) REFERENCES diet_template_meals(id) ON DELETE CASCADE,
  CONSTRAINT fk_dtf_food FOREIGN KEY (food_id) REFERENCES foods(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Diet plans assigned to clients (plan -> meals -> foods)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS diet_plans (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id        INT UNSIGNED NOT NULL,
  trainer_id       INT UNSIGNED NULL,
  template_id      INT UNSIGNED NULL,
  name             VARCHAR(150) NOT NULL,
  description      TEXT NULL,
  goal             VARCHAR(40) NULL,
  diet_type        ENUM('vegetarian','non_vegetarian','vegan','eggetarian','mixed') NOT NULL DEFAULT 'mixed',
  target_calories  INT UNSIGNED NULL,
  water_target_ml  INT UNSIGNED NULL DEFAULT 3000,
  start_date       DATE NULL,
  end_date         DATE NULL,
  status           ENUM('draft','active','completed','archived') NOT NULL DEFAULT 'active',
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at       DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_dp_client_status (client_id, status),
  KEY idx_dp_trainer (trainer_id),
  CONSTRAINT fk_dp_client   FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  CONSTRAINT fk_dp_trainer  FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE SET NULL,
  CONSTRAINT fk_dp_template FOREIGN KEY (template_id) REFERENCES diet_templates(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS diet_meals (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  plan_id     INT UNSIGNED NOT NULL,
  meal_type   ENUM('breakfast','mid_morning','lunch','snack','pre_workout','post_workout','dinner','bedtime') NOT NULL,
  name        VARCHAR(100) NOT NULL,
  meal_time   TIME NULL,
  sort_order  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_dm_plan (plan_id, sort_order),
  CONSTRAINT fk_dm_plan FOREIGN KEY (plan_id) REFERENCES diet_plans(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS diet_foods (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  meal_id     INT UNSIGNED NOT NULL,
  food_id     INT UNSIGNED NOT NULL,
  quantity    DECIMAL(6,2) NOT NULL DEFAULT 1,
  notes       VARCHAR(255) NULL,
  sort_order  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_df_meal (meal_id, sort_order),
  CONSTRAINT fk_df_meal FOREIGN KEY (meal_id) REFERENCES diet_meals(id) ON DELETE CASCADE,
  CONSTRAINT fk_df_food FOREIGN KEY (food_id) REFERENCES foods(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS diet_logs (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id    INT UNSIGNED NOT NULL,
  diet_meal_id INT UNSIGNED NOT NULL,
  log_date     DATE NOT NULL,
  status       ENUM('completed','skipped') NOT NULL,
  notes        VARCHAR(255) NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_dl_meal_date (diet_meal_id, log_date),
  KEY idx_dl_client_date (client_id, log_date),
  CONSTRAINT fk_dl_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  CONSTRAINT fk_dl_meal   FOREIGN KEY (diet_meal_id) REFERENCES diet_meals(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS water_logs (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id   INT UNSIGNED NOT NULL,
  log_date    DATE NOT NULL,
  amount_ml   INT UNSIGNED NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_water_client_date (client_id, log_date),
  CONSTRAINT fk_water_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Progress tracking
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS progress_records (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id     INT UNSIGNED NOT NULL,
  recorded_by   INT UNSIGNED NULL,
  record_date   DATE NOT NULL,
  weight_kg     DECIMAL(5,1) NULL,
  chest_cm      DECIMAL(5,1) NULL,
  waist_cm      DECIMAL(5,1) NULL,
  arms_cm       DECIMAL(5,1) NULL,
  thighs_cm     DECIMAL(5,1) NULL,
  hips_cm       DECIMAL(5,1) NULL,
  neck_cm       DECIMAL(5,1) NULL,
  calves_cm     DECIMAL(5,1) NULL,
  body_fat_pct  DECIMAL(4,1) NULL,
  bmi           DECIMAL(4,1) NULL,
  notes         VARCHAR(500) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_pr_client_date (client_id, record_date),
  CONSTRAINT fk_pr_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  CONSTRAINT fk_pr_user   FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS progress_photos (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id          INT UNSIGNED NOT NULL,
  progress_record_id INT UNSIGNED NULL,
  photo_url          VARCHAR(500) NOT NULL,
  pose               ENUM('front','side','back','other') NOT NULL DEFAULT 'front',
  taken_on           DATE NOT NULL,
  notes              VARCHAR(255) NULL,
  uploaded_by        INT UNSIGNED NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at         DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_pp_client_date (client_id, taken_on),
  CONSTRAINT fk_pp_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  CONSTRAINT fk_pp_record FOREIGN KEY (progress_record_id) REFERENCES progress_records(id) ON DELETE SET NULL,
  CONSTRAINT fk_pp_user   FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Messaging / notifications
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  sender_id        INT UNSIGNED NOT NULL,
  recipient_id     INT UNSIGNED NOT NULL,
  body             TEXT NULL,
  attachment_url   VARCHAR(500) NULL,
  attachment_name  VARCHAR(255) NULL,
  read_at          DATETIME NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at       DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_msg_pair (sender_id, recipient_id, created_at),
  KEY idx_msg_recipient_unread (recipient_id, read_at),
  CONSTRAINT fk_msg_sender    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_msg_recipient FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL,
  type        VARCHAR(40) NOT NULL DEFAULT 'general',
  title       VARCHAR(200) NOT NULL,
  body        VARCHAR(500) NULL,
  link        VARCHAR(255) NULL,
  read_at     DATETIME NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notif_user_read (user_id, read_at, created_at),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Audit / settings
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      INT UNSIGNED NULL,
  action       VARCHAR(40)  NOT NULL,
  entity_type  VARCHAR(60)  NULL,
  entity_id    INT UNSIGNED NULL,
  description  VARCHAR(500) NULL,
  ip_address   VARCHAR(45)  NULL,
  user_agent   VARCHAR(255) NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_user (user_id),
  KEY idx_audit_entity (entity_type, entity_id),
  KEY idx_audit_created (created_at),
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS settings (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  setting_key    VARCHAR(100) NOT NULL,
  setting_value  TEXT NULL,
  value_type     ENUM('string','number','boolean') NOT NULL DEFAULT 'string',
  setting_group  VARCHAR(40)  NOT NULL DEFAULT 'general',
  label          VARCHAR(150) NULL,
  is_public      TINYINT(1) NOT NULL DEFAULT 0,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_settings_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
