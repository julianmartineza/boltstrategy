/*
  # Add Program-Stage Relationship

  1. Changes
    - Add program_id column to strategy_stages table
    - Create initial program if not exists
    - Link existing stages to the strategy program
  
  2. Security
    - No changes to RLS policies needed
*/

-- Add program_id to strategy_stages
ALTER TABLE strategy_stages 
ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES programs(id);

-- Update existing stages to link to the strategy program
DO $$ 
DECLARE
  v_program_id uuid;
BEGIN
  -- Get the strategy program ID
  SELECT id INTO v_program_id FROM programs 
  WHERE name = 'Strategic Development Program' 
  LIMIT 1;

  IF FOUND THEN
    -- Update all existing stages to link to this program
    UPDATE strategy_stages 
    SET program_id = v_program_id
    WHERE program_id IS NULL;
  END IF;
END $$;