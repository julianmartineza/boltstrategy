

interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
}

export default function VideoPlayer({ src, poster, className }: VideoPlayerProps) {
  if (!src) {
    return (
      <div className="aspect-video rounded-lg overflow-hidden bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">No video source provided</p>
      </div>
    );
  }

  return (
    <div className={`aspect-video rounded-lg overflow-hidden bg-gray-900 ${className || ''}`}>
      <video
        className="w-full h-full"
        controls
        preload="metadata"
        poster={poster}
        playsInline
      >
        <source src={src} type="video/mp4" />
        <source src={src.replace('.mp4', '.webm')} type="video/webm" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}