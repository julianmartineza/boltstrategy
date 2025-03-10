/*
  # Add Admin Role and User Profiles Table

  1. New Tables
    - `user_profiles`
      - `id` (uuid, primary key, references auth.users)
      - `is_admin` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `user_profiles` table
    - Add policies for authenticated users
*/

-- Create user_profiles table to store additional user information
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read their own profile
CREATE POLICY "Users can read their own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Crear una función auxiliar para verificar si un usuario es administrador sin usar RLS
-- Esta función evita la recursión infinita al acceder directamente a la tabla
CREATE OR REPLACE FUNCTION check_is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = user_id AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create policy for admins to read all profiles
CREATE POLICY "Admins can read all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (check_is_admin(auth.uid()) OR auth.uid() = id);

-- Create policy for admins to update all profiles
CREATE POLICY "Admins can update all profiles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (check_is_admin(auth.uid()) OR auth.uid() = id);

-- Create policies for admins to manage programs
CREATE POLICY "Admins can insert programs"
  ON programs
  FOR INSERT
  TO authenticated
  WITH CHECK (check_is_admin(auth.uid()));

CREATE POLICY "Admins can update programs"
  ON programs
  FOR UPDATE
  TO authenticated
  USING (check_is_admin(auth.uid()));

CREATE POLICY "Admins can delete programs"
  ON programs
  FOR DELETE
  TO authenticated
  USING (check_is_admin(auth.uid()));

-- Create policies for admins to manage strategy_stages
CREATE POLICY "Admins can insert strategy_stages"
  ON strategy_stages
  FOR INSERT
  TO authenticated
  WITH CHECK (check_is_admin(auth.uid()));

CREATE POLICY "Admins can update strategy_stages"
  ON strategy_stages
  FOR UPDATE
  TO authenticated
  USING (check_is_admin(auth.uid()));

CREATE POLICY "Admins can delete strategy_stages"
  ON strategy_stages
  FOR DELETE
  TO authenticated
  USING (check_is_admin(auth.uid()));

-- Create policies for admins to manage stage_content
CREATE POLICY "Admins can insert stage_content"
  ON stage_content
  FOR INSERT
  TO authenticated
  WITH CHECK (check_is_admin(auth.uid()));

CREATE POLICY "Admins can update stage_content"
  ON stage_content
  FOR UPDATE
  TO authenticated
  USING (check_is_admin(auth.uid()));

CREATE POLICY "Admins can delete stage_content"
  ON stage_content
  FOR DELETE
  TO authenticated
  USING (check_is_admin(auth.uid()));

-- Create a function to check if a user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN check_is_admin(auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to set a user as admin
CREATE OR REPLACE FUNCTION set_user_admin(user_id uuid, admin_status boolean)
RETURNS void AS $$
BEGIN
  -- Check if the current user is an admin
  IF NOT check_is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can set admin status';
  END IF;

  -- Check if the user profile exists
  IF EXISTS (SELECT 1 FROM user_profiles WHERE id = user_id) THEN
    -- Update the existing profile
    UPDATE user_profiles
    SET is_admin = admin_status,
        updated_at = now()
    WHERE id = user_id;
  ELSE
    -- Create a new profile
    INSERT INTO user_profiles (id, is_admin)
    VALUES (user_id, admin_status);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a table to track viewed content
CREATE TABLE IF NOT EXISTS viewed_contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id uuid REFERENCES stage_content(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, content_id)
);

-- Enable Row Level Security
ALTER TABLE viewed_contents ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read their own viewed content
CREATE POLICY "Users can read their own viewed content"
  ON viewed_contents
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policy for users to insert their own viewed content
CREATE POLICY "Users can insert their own viewed content"
  ON viewed_contents
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create policy for admins to read all viewed content
CREATE POLICY "Admins can read all viewed content"
  ON viewed_contents
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND is_admin = true
  ));

-- Create the first admin user (replace with your user ID)
-- INSERT INTO user_profiles (id, is_admin)
-- VALUES ('your-user-id-here', true);
