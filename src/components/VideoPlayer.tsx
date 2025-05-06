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

  // Prevenir la descarga del video mediante clic derecho
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    return false;
  };

  return (
    <div className={`aspect-video rounded-lg overflow-hidden bg-gray-900 ${className || ''}`}>
      <video
        className="w-full h-full"
        controls
        preload="metadata"
        poster={poster}
        playsInline
        controlsList="nodownload nofullscreen" // Deshabilita el botón de descarga y limita el control de pantalla completa
        onContextMenu={handleContextMenu} // Deshabilita el menú contextual
        disablePictureInPicture // Deshabilita la función de picture-in-picture
      >
        <source src={src} type="video/mp4" />
        <source src={src.replace('.mp4', '.webm')} type="video/webm" />
        Tu navegador no soporta la reproducción de videos.
      </video>
    </div>
  );
}