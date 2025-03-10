/*
  # Update stage content for MP4 support

  1. Changes
    - Add metadata column to stage_content table for additional video information
    - Update sample content to use MP4 URLs

  2. Notes
    - Metadata can include poster image URLs and other video-specific data
*/

-- Add metadata column
ALTER TABLE stage_content ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Update existing video content to use MP4 URLs
UPDATE stage_content 
SET content = 'https://example.com/videos/paradigm-intro.mp4',
    metadata = jsonb_build_object(
      'poster', 'https://example.com/images/paradigm-intro-poster.jpg'
    )
WHERE content_type = 'video';