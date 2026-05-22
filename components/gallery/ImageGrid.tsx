"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";

// ─── Types ───────────────────────────────────────────────────────────
interface CloudinaryImage {
  id: string;
  public_id: string;
  image_url: string;
  format: string | null;
  width: number | null;
  height: number | null;
  bytes: number | null;
  folder: string | null;
  tags: string[];
  created_at: string;
}

interface ImageGridProps {
  initialImages: CloudinaryImage[];
  totalCount: number;
  folders: string[];
  pageSize?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─── Component ───────────────────────────────────────────────────────
export default function ImageGrid({
  initialImages,
  totalCount,
  folders,
  pageSize = 20,
}: ImageGridProps) {
  const [images, setImages] = useState<CloudinaryImage[]>(initialImages);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialImages.length < totalCount);
  const [offset, setOffset] = useState(initialImages.length);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<CloudinaryImage | null>(null);
  const [visibleImages, setVisibleImages] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  // ─── Lazy loading with Intersection Observer ─────────────────────
  const imageRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const id = node.dataset.imageId;
    if (!id) return;

    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const imgId = (entry.target as HTMLElement).dataset.imageId;
              if (imgId) {
                setVisibleImages((prev) => new Set(prev).add(imgId));
              }
            }
          });
        },
        { rootMargin: "200px" }
      );
    }

    observerRef.current.observe(node);
  }, []);

  // ─── Load More ───────────────────────────────────────────────────
  const loadMore = async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    try {
      const params = new URLSearchParams({
        offset: offset.toString(),
        limit: pageSize.toString(),
      });
      if (selectedFolder) params.set("folder", selectedFolder);

      const res = await fetch(`/api/images?${params}`);
      const data = await res.json();

      if (data.images && data.images.length > 0) {
        setImages((prev) => [...prev, ...data.images]);
        setOffset((prev) => prev + data.images.length);
        setHasMore(offset + data.images.length < data.total);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Failed to load more images:", err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Folder Filter ──────────────────────────────────────────────
  const handleFolderFilter = async (folder: string | null) => {
    setSelectedFolder(folder);
    setLoading(true);
    setOffset(0);

    try {
      const params = new URLSearchParams({
        offset: "0",
        limit: pageSize.toString(),
      });
      if (folder) params.set("folder", folder);

      const res = await fetch(`/api/images?${params}`);
      const data = await res.json();

      setImages(data.images || []);
      setOffset(data.images?.length || 0);
      setHasMore((data.images?.length || 0) < data.total);
    } catch (err) {
      console.error("Failed to filter:", err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Keyboard shortcut for lightbox ──────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxImage(null);
      if (!lightboxImage) return;

      const idx = images.findIndex((img) => img.id === lightboxImage.id);
      if (e.key === "ArrowRight" && idx < images.length - 1) {
        setLightboxImage(images[idx + 1]);
      }
      if (e.key === "ArrowLeft" && idx > 0) {
        setLightboxImage(images[idx - 1]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxImage, images]);

  // ─── Cleanup observer ────────────────────────────────────────────
  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return (
    <>
      {/* ─── Filter Bar ─────────────────────────────────────────── */}
      {folders.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => handleFolderFilter(null)}
            className={`
              px-4 py-2 rounded-full text-sm font-medium transition-all duration-300
              ${
                !selectedFolder
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25"
                  : "bg-white/10 text-gray-300 hover:bg-white/20 border border-white/10"
              }
            `}
          >
            All Images
          </button>
          {folders.map((folder) => (
            <button
              key={folder}
              onClick={() => handleFolderFilter(folder)}
              className={`
                px-4 py-2 rounded-full text-sm font-medium transition-all duration-300
                ${
                  selectedFolder === folder
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25"
                    : "bg-white/10 text-gray-300 hover:bg-white/20 border border-white/10"
                }
              `}
            >
              📂 {folder}
            </button>
          ))}
        </div>
      )}

      {/* ─── Image Grid ──────────────────────────────────────────── */}
      {images.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🖼️</div>
          <h3 className="text-xl font-semibold text-gray-300 mb-2">
            No images synced yet
          </h3>
          <p className="text-gray-500">
            Run a sync to fetch images from Cloudinary into Supabase.
          </p>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
          {images.map((img) => (
            <div
              key={img.id}
              ref={imageRef}
              data-image-id={img.id}
              onClick={() => setLightboxImage(img)}
              className="
                break-inside-avoid group cursor-pointer
                bg-white/5 rounded-2xl overflow-hidden
                border border-white/10 hover:border-violet-500/50
                transition-all duration-500 ease-out
                hover:shadow-2xl hover:shadow-violet-500/10
                hover:-translate-y-1
              "
              style={{
                opacity: visibleImages.has(img.id) ? 1 : 0,
                transform: visibleImages.has(img.id)
                  ? "translateY(0)"
                  : "translateY(20px)",
                transition: "opacity 0.6s ease-out, transform 0.6s ease-out",
              }}
            >
              {/* Image */}
              <div className="relative overflow-hidden">
                {img.width && img.height ? (
                  <Image
                    src={img.image_url}
                    alt={img.public_id}
                    width={img.width}
                    height={img.height}
                    loading="lazy"
                    className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                  />
                ) : (
                  <img
                    src={img.image_url}
                    alt={img.public_id}
                    loading="lazy"
                    className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                )}

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                  <div className="text-white">
                    <p className="text-xs font-mono opacity-80 truncate">
                      {img.public_id}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {img.format && (
                        <span className="text-[10px] uppercase px-2 py-0.5 bg-white/20 rounded-full font-semibold backdrop-blur-sm">
                          {img.format}
                        </span>
                      )}
                      {img.bytes && (
                        <span className="text-[10px] px-2 py-0.5 bg-white/20 rounded-full font-medium backdrop-blur-sm">
                          {formatBytes(img.bytes)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {img.tags && img.tags.length > 0 && (
                <div className="px-3 py-2 flex flex-wrap gap-1">
                  {img.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-2 py-0.5 bg-violet-500/20 text-violet-300 rounded-full font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                  {img.tags.length > 3 && (
                    <span className="text-[10px] px-2 py-0.5 text-gray-500 font-medium">
                      +{img.tags.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ─── Load More Button ────────────────────────────────────── */}
      {hasMore && (
        <div className="flex justify-center mt-12">
          <button
            onClick={loadMore}
            disabled={loading}
            className="
              px-8 py-3 rounded-xl font-semibold text-sm
              bg-gradient-to-r from-violet-600 to-indigo-600
              text-white shadow-lg shadow-violet-500/25
              hover:shadow-xl hover:shadow-violet-500/30
              hover:-translate-y-0.5
              transition-all duration-300
              disabled:opacity-50 disabled:cursor-not-allowed
              disabled:hover:translate-y-0
            "
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Loading…
              </span>
            ) : (
              "Load More Images"
            )}
          </button>
        </div>
      )}

      {/* ─── Lightbox Modal ──────────────────────────────────────── */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl"
          onClick={() => setLightboxImage(null)}
        >
          {/* Close Button */}
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors z-10"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Navigation arrows */}
          {(() => {
            const idx = images.findIndex(
              (img) => img.id === lightboxImage.id
            );
            return (
              <>
                {idx > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxImage(images[idx - 1]);
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors z-10"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                {idx < images.length - 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxImage(images[idx + 1]);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors z-10"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </>
            );
          })()}

          {/* Image + Info Panel */}
          <div
            className="max-w-5xl max-h-[90vh] mx-auto flex flex-col items-center gap-4 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImage.image_url}
              alt={lightboxImage.public_id}
              className="max-h-[75vh] max-w-full object-contain rounded-xl shadow-2xl"
            />

            {/* Info bar */}
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
              <span className="px-3 py-1.5 bg-white/10 text-gray-300 rounded-lg font-mono text-xs">
                {lightboxImage.public_id}
              </span>
              {lightboxImage.format && (
                <span className="px-3 py-1.5 bg-violet-500/20 text-violet-300 rounded-lg uppercase font-semibold text-xs">
                  {lightboxImage.format}
                </span>
              )}
              {lightboxImage.width && lightboxImage.height && (
                <span className="px-3 py-1.5 bg-white/10 text-gray-300 rounded-lg text-xs">
                  {lightboxImage.width} × {lightboxImage.height}
                </span>
              )}
              {lightboxImage.bytes && (
                <span className="px-3 py-1.5 bg-white/10 text-gray-300 rounded-lg text-xs">
                  {formatBytes(lightboxImage.bytes)}
                </span>
              )}
              <span className="px-3 py-1.5 bg-white/10 text-gray-400 rounded-lg text-xs">
                {formatDate(lightboxImage.created_at)}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
