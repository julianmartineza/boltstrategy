/*
  # Add activity content type to stage_content

  1. Changes
    - Add 'activity' as a valid content_type in stage_content table
    - Add activity_data column for storing activity-specific configuration
    - Update existing content_type check constraint

  2. Security
    - Maintain existing RLS policies
*/

-- First, drop the existing check constraint
ALTER TABLE stage_content DROP CONSTRAINT IF EXISTS stage_content_content_type_check;

-- Add the new check constraint with 'activity' type
ALTER TABLE stage_content
ADD CONSTRAINT stage_content_content_type_check
CHECK (content_type IN ('video', 'text', 'activity'));

-- Add activity_data column for storing activity configuration
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stage_content' 
    AND column_name = 'activity_data'
  ) THEN
    ALTER TABLE stage_content
    ADD COLUMN activity_data jsonb DEFAULT NULL;
  END IF;
END $$;