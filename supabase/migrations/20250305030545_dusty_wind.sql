/*
  # Add stage content management

  1. New Tables
    - `stage_content`
      - `id` (uuid, primary key)
      - `stage_id` (uuid, references strategy_stages)
      - `content_type` (text - 'video' or 'text')
      - `title` (text)
      - `content` (text - video URL or markdown content)
      - `order_num` (integer)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `stage_content` table
    - Add policy for authenticated users to read content
*/

CREATE TABLE IF NOT EXISTS stage_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id uuid REFERENCES strategy_stages(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('video', 'text')),
  title text NOT NULL,
  content text NOT NULL,
  order_num integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stage_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read stage content"
  ON stage_content
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert sample content for the Paradigm Identification stage
DO $$ 
DECLARE
  v_stage_id uuid;
BEGIN
  -- Get the stage ID for Paradigm Identification
  SELECT id INTO v_stage_id FROM strategy_stages 
  WHERE name = 'Identificación de Paradigmas' 
  LIMIT 1;

  IF FOUND THEN
    -- Add video content
    INSERT INTO stage_content 
      (stage_id, content_type, title, content, order_num) 
    VALUES 
      (
        v_stage_id,
        'video',
        'Introduction to Paradigm Identification',
        'https://player.vimeo.com/video/304871602', -- Example Vimeo video
        1
      );

    -- Add text content
    INSERT INTO stage_content 
      (stage_id, content_type, title, content, order_num) 
    VALUES 
      (
        v_stage_id,
        'text',
        'Understanding Business Paradigms',
        E'# Understanding Business Paradigms\n\nParadigms are the mental models and beliefs that shape how we view and operate in business. They can either limit or expand our potential for growth and innovation.\n\n## Key Concepts\n\n1. **Mental Models**: The frameworks through which we interpret business reality\n2. **Limiting Beliefs**: Assumptions that restrict our strategic options\n3. **Paradigm Shifts**: Transformative changes in how we think about business\n\n## Impact on Strategy\n\nYour business paradigms directly influence:\n- Decision-making processes\n- Innovation capacity\n- Market approach\n- Growth potential',
        2
      );
  END IF;
END $$;