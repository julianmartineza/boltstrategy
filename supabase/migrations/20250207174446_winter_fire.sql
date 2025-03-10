/*
  # Add annual revenue column to companies table

  1. Changes
    - Add `annual_revenue` column to `companies` table to store company revenue information
    - Column type is numeric to properly store currency values
    - Default value of 0 to ensure data consistency
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'annual_revenue'
  ) THEN
    ALTER TABLE companies ADD COLUMN annual_revenue numeric DEFAULT 0;
  END IF;
END $$;