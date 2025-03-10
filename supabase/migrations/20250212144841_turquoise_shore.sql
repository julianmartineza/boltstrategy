/*
  # Add Programs and Activities Tables

  1. New Tables
    - `programs`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `status` (text)
      - `created_at` (timestamp)
    - `activities`
      - `id` (uuid, primary key)
      - `stage_id` (uuid, foreign key)
      - `name` (text)
      - `description` (text)
      - `status` (text)
      - `created_at` (timestamp)
    - `activity_responses`
      - `id` (uuid, primary key)
      - `activity_id` (uuid, foreign key)
      - `content` (jsonb)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Programs table
CREATE TABLE IF NOT EXISTS programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'not_started',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read programs"
  ON programs
  FOR SELECT
  TO authenticated
  USING (true);

-- Activities table
CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id uuid REFERENCES strategy_stages(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read activities"
  ON activities
  FOR SELECT
  TO authenticated
  USING (true);

-- Activity responses table
CREATE TABLE IF NOT EXISTS activity_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid REFERENCES activities(id) ON DELETE CASCADE,
  content jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id)
);

ALTER TABLE activity_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own responses"
  ON activity_responses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own responses"
  ON activity_responses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Insert initial strategy program
INSERT INTO programs (name, description, status) VALUES (
  'Strategic Development Program',
  'A comprehensive program to develop and implement your business strategy, from paradigm identification to organizational design.',
  'not_started'
);

-- Insert initial activities for each stage
DO $$ 
DECLARE
  stage_id uuid;
BEGIN
  -- Get the first stage ID (Paradigm Identification)
  SELECT id INTO stage_id FROM strategy_stages WHERE name = 'Identificación de Paradigmas' LIMIT 1;
  
  IF FOUND THEN
    INSERT INTO activities (stage_id, name, description) VALUES
    (stage_id, 'Identify Current Paradigms', 'Identify and analyze your current business paradigms'),
    (stage_id, 'Transform Paradigms', 'Transform limiting paradigms into amplifying ones');
  END IF;
END $$;