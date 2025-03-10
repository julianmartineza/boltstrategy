/*
  # Add website column to companies table

  1. Changes
    - Add `website` column to `companies` table to store company website URLs
    - Column type is text to store URLs
    - Default value is empty string to ensure data consistency
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'website'
  ) THEN
    ALTER TABLE companies ADD COLUMN website text DEFAULT '';
  END IF;
END $$;