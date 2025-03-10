/*
  # Add website and annual revenue fields to companies table

  1. Changes
    - Add `website` column to companies table
    - Add `annual_revenue` column to companies table
    - Both fields are optional to maintain backward compatibility

  2. Notes
    - No data migration needed as these are new optional fields
    - Existing RLS policies will automatically apply to new columns
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'website'
  ) THEN
    ALTER TABLE companies ADD COLUMN website text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'annual_revenue'
  ) THEN
    ALTER TABLE companies ADD COLUMN annual_revenue numeric;
  END IF;
END $$;