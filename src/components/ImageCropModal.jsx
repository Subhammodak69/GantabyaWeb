import { useEffect, useRef, useState } from "react";

export default function ImageCropModal({ imageSrc, open, onCrop, onCancel }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgNaturalSize, setImgNaturalSize] = useState({ width: 0, height: 0 });
  const [baseDimensions, setBaseDimensions] = useState({ width: 280, height: 280 });

  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const FRAME_SIZE = 280; // Size of circular crop viewport in px

  // Calculate base aspect-fit dimensions when image loads
  const handleImageLoad = (e) => {
    const nw = e.target.naturalWidth || 1;
    const nh = e.target.naturalHeight || 1;
    setImgNaturalSize({ width: nw, height: nh });

    // Calculate aspect-fill so the image completely covers the 280x280 frame initially
    const scaleToCover = Math.max(FRAME_SIZE / nw, FRAME_SIZE / nh);
    const baseW = nw * scaleToCover;
    const baseH = nh * scaleToCover;

    setBaseDimensions({ width: baseW, height: baseH });
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  useEffect(() => {
    if (open) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [open, imageSrc]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (e) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", handleKey);
    };
  }, [open, onCancel]);

  if (!open || !imageSrc) return null;

  // Constrain panning so the image always completely covers the circular frame
  const clampPan = (newX, newY, currentZoom = zoom) => {
    const currentW = baseDimensions.width * currentZoom;
    const currentH = baseDimensions.height * currentZoom;
    const maxPanX = Math.max(0, (currentW - FRAME_SIZE) / 2);
    const maxPanY = Math.max(0, (currentH - FRAME_SIZE) / 2);

    return {
      x: Math.min(Math.max(newX, -maxPanX), maxPanX),
      y: Math.min(Math.max(newY, -maxPanY), maxPanY),
    };
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const nextPan = clampPan(e.clientX - dragStart.x, e.clientY - dragStart.y);
    setPan(nextPan);
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      });
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const nextPan = clampPan(e.touches[0].clientX - dragStart.x, e.touches[0].clientY - dragStart.y);
    setPan(nextPan);
  };

  const handleTouchEnd = () => setIsDragging(false);

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY * -0.002;
    const newZoom = Math.min(Math.max(1, zoom + delta), 4);
    setZoom(newZoom);
    setPan((p) => clampPan(p.x, p.y, newZoom));
  };

  const handleZoomChange = (newZoom) => {
    setZoom(newZoom);
    setPan((p) => clampPan(p.x, p.y, newZoom));
  };

  const generateCroppedImage = async () => {
    const img = imgRef.current;
    if (!img || !imgNaturalSize.width || !imgNaturalSize.height) return;

    const canvas = document.createElement("canvas");
    const OUTPUT_SIZE = 512;
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");

    // Current displayed size on screen
    const displayedW = baseDimensions.width * zoom;
    const displayedH = baseDimensions.height * zoom;

    // Center of image relative to center of 280x280 viewport
    const imgLeft = (FRAME_SIZE - displayedW) / 2 + pan.x;
    const imgTop = (FRAME_SIZE - displayedH) / 2 + pan.y;

    // Convert from screen viewport coords (0..280) to natural image coords
    const scaleToNatural = imgNaturalSize.width / displayedW;

    const sourceCropX = (0 - imgLeft) * scaleToNatural;
    const sourceCropY = (0 - imgTop) * scaleToNatural;
    const sourceCropW = FRAME_SIZE * scaleToNatural;
    const sourceCropH = FRAME_SIZE * scaleToNatural;

    // Draw directly from natural image coordinates for pristine clarity
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      img,
      sourceCropX,
      sourceCropY,
      sourceCropW,
      sourceCropH,
      0,
      0,
      OUTPUT_SIZE,
      OUTPUT_SIZE
    );

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], "profile-crop.jpg", { type: "image/jpeg" });
          onCrop(file, canvas.toDataURL("image/jpeg", 0.92));
        }
      },
      "image/jpeg",
      0.92
    );
  };

  return (
    <div
      className="modal-viewport fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
    >
      <div className="modal-panel relative flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-[2.25rem] bg-white shadow-2xl shadow-slate-950/50">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-500">Edit Photo</p>
            <h2 className="font-display text-xl font-semibold text-slate-950">Crop profile picture</h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-lg text-slate-500 transition hover:bg-slate-200"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Crop Viewport */}
        <div className="relative min-h-0 flex-1 overflow-y-auto flex flex-col items-center justify-center bg-slate-950 px-4 py-8 select-none">
          {/* Circular Frame */}
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            className="relative h-[280px] w-[280px] cursor-grab active:cursor-grabbing overflow-hidden rounded-full border-4 border-amber-300 shadow-2xl ring-8 ring-white/10"
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop preview"
              onLoad={handleImageLoad}
              draggable={false}
              style={{
                width: `${baseDimensions.width}px`,
                height: `${baseDimensions.height}px`,
                maxWidth: "none",
                maxHeight: "none",
                transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
                transformOrigin: "center center",
              }}
              className="absolute left-1/2 top-1/2 pointer-events-none transition-transform duration-75"
            />

            {/* Rule-of-thirds grid overlay */}
            <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 border border-white/20">
              <div className="border-r border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div className="border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div className="border-b border-white/20" />
              <div className="border-r border-white/20" />
              <div className="border-r border-white/20" />
              <div />
            </div>
          </div>

          <p className="mt-4 text-xs font-medium text-white/60">Drag to reposition · Scroll or slide to zoom</p>
        </div>

        {/* Zoom Controls */}
        <div className="shrink-0 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-slate-500">−</span>
            <input
              type="range"
              min="1"
              max="4"
              step="0.05"
              value={zoom}
              onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-primary"
              aria-label="Zoom photo"
            />
            <span className="text-xs font-bold text-slate-500">+</span>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="btn-ghost text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={generateCroppedImage}
            className="btn-primary rounded-xl text-xs font-bold px-5 py-2.5 shadow-md"
          >
            Save Photo ✓
          </button>
        </div>
      </div>
    </div>
  );
}
