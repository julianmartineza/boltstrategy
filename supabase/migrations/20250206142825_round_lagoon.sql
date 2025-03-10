/*
  # Initial Schema Setup for Strategic Consulting Platform

  1. New Tables
    - `companies`
      - `id` (uuid, primary key)
      - `name` (text)
      - `industry` (text)
      - `size` (text)
      - `created_at` (timestamptz)
    
    - `diagnostics`
      - `id` (uuid, primary key)
      - `company_id` (uuid, foreign key)
      - `diagnostic_data` (jsonb)
      - `created_at` (timestamptz)
    
    - `strategy_stages`
      - `id` (uuid, primary key)
      - `name` (text)
      - `order` (integer)
      - `required_content` (text)
      - `prompt_template` (text)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  industry text NOT NULL,
  size text NOT NULL,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id)
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own companies"
  ON companies
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own companies"
  ON companies
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Diagnostics table
CREATE TABLE IF NOT EXISTS diagnostics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  diagnostic_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id)
);

ALTER TABLE diagnostics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own diagnostics"
  ON diagnostics
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own diagnostics"
  ON diagnostics
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Strategy stages table
CREATE TABLE IF NOT EXISTS strategy_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  order_num integer NOT NULL,
  required_content text NOT NULL,
  prompt_template text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE strategy_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read strategy stages"
  ON strategy_stages
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert initial strategy stages
INSERT INTO strategy_stages (name, order_num, required_content, prompt_template) VALUES
  (
    'Corporate Strategy',
    1,
    'Before we begin, let''s understand what corporate strategy means and its key components...',
    'Based on the company profile and diagnostic data, help develop a corporate strategy by considering: {context}'
  ),
  (
    'Competitive Strategy',
    2,
    'Now let''s focus on how your company will compete in its chosen markets...',
    'Taking into account the corporate strategy developed earlier and {context}, let''s develop your competitive strategy'
  );