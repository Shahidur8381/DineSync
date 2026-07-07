-- DineSync Supabase Schema & Seed Data (Simplified Logic)


--0. Drop All Tables First
DROP TABLE IF EXISTS "Log" CASCADE;
DROP TABLE IF EXISTS "MealStatus" CASCADE;
DROP TABLE IF EXISTS "MealSession" CASCADE;
DROP TABLE IF EXISTS "Device" CASCADE;
DROP TABLE IF EXISTS "Card" CASCADE;
DROP TABLE IF EXISTS "Student" CASCADE;
DROP TABLE IF EXISTS "Admin" CASCADE;

-- 1. Create Tables
CREATE TABLE "Admin" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "email" TEXT UNIQUE NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" TEXT DEFAULT 'admin',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE "Student" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "studentId" TEXT UNIQUE NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT UNIQUE NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "status" TEXT DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE "Card" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "uid" TEXT UNIQUE NOT NULL,
  "studentId" UUID REFERENCES "Student"("id") ON DELETE CASCADE,
  "status" TEXT DEFAULT 'ACTIVE',
  "issuedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE "Device" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "location" TEXT,
  "apiKeyHash" TEXT NOT NULL,
  "firmwareVersion" TEXT,
  "lastHeartbeat" TIMESTAMP WITH TIME ZONE,
  "status" TEXT DEFAULT 'OFFLINE',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE "MealSession" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "isActive" BOOLEAN DEFAULT FALSE,
  "mealType" TEXT NOT NULL, -- 'LUNCH' or 'DINNER'
  "totalMeals" INT DEFAULT 0,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE "MealStatus" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "studentId" UUID REFERENCES "Student"("id") ON DELETE CASCADE,
  "isAllowed" BOOLEAN DEFAULT TRUE,
  "isConsumed" BOOLEAN DEFAULT FALSE,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE "Log" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "deviceId" TEXT REFERENCES "Device"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL, -- 'INFO', 'WARNING', 'CRITICAL'
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Insert Seed Data
-- Admins
INSERT INTO "Admin" ("id", "name", "email", "passwordHash", "role")
VALUES 
  (gen_random_uuid(), 'Admin', 'admin@dinesync.local', '$2a$12$q0YvLPb2qC1br6VBhpJVWOgadSODsdlQPg8gHVt.1jXXy7AA0jcNm', 'admin');

-- Students
INSERT INTO "Student" ("id", "studentId", "name", "email", "passwordHash")
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2207103', 'Shawon', 'shawon@student.dinesync.local', '$2a$12$Hkx2/x4Dhun0dxKWnZDsCuE2yFukZdgJ5luVf3JCbpCETyHmjyFX6'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2207106', 'Siam', 'siam@student.dinesync.local', '$2a$12$Hkx2/x4Dhun0dxKWnZDsCuE2yFukZdgJ5luVf3JCbpCETyHmjyFX6'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '103', 'Shahidur', 'shahidur@student.dinesync.local', '$2a$12$Hkx2/x4Dhun0dxKWnZDsCuE2yFukZdgJ5luVf3JCbpCETyHmjyFX6'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '106', 'Shuvro', 'shuvro@student.dinesync.local', '$2a$12$Hkx2/x4Dhun0dxKWnZDsCuE2yFukZdgJ5luVf3JCbpCETyHmjyFX6');

-- Cards
INSERT INTO "Card" ("uid", "studentId")
VALUES
  ('23 10 63 A6', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('A1 B2 C3 D4', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  ('12 34 56 78', 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  ('87 65 43 21', 'dddddddd-dddd-dddd-dddd-dddddddddddd');

-- Initialize MealStatus for all students
INSERT INTO "MealStatus" ("studentId", "isAllowed", "isConsumed")
SELECT "id", TRUE, FALSE FROM "Student";

-- Initialize a single MealSession settings row
INSERT INTO "MealSession" ("isActive", "mealType", "totalMeals")
VALUES (TRUE, 'LUNCH', 100);

-- Devices
INSERT INTO "Device" ("id", "name", "location", "apiKeyHash")
VALUES
  ('kiosk-hall-a-01', 'Hall A Main Entrance Kiosk', 'Hall A', '$2a$12$PBZH8lXTZ3X7a9bYBhfXG.OKAahfp5VCxVrQfx7243SFecfDQZmeK');
