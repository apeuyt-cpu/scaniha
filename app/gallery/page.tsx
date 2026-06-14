import { createClient } from "@supabase/supabase-js";
import ImageGrid from "@/components/gallery/ImageGrid";
import SyncButton from "@/components/gallery/SyncButton";
import { requireSuperAdmin } from "@/lib/auth";
import type { Metadata } from "next";

// Internal image-management tool — operator only. Never public/indexed.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Galerie d'images | Scaniha",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 20;

async function getImages() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Fetch initial page of images
  const { data: images, count, error } = await supabase
    .from("images")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(0, PAGE_SIZE - 1);

  if (error) {
    console.error("Failed to load images:", error.message);
    return { images: [], totalCount: 0, folders: [] };
  }

  // Fetch distinct folders for filter chips
  const { data: folderData } = await supabase
    .from("images")
    .select("folder")
    .not("folder", "is", null);

  const folders = Array.from(
    new Set(
      (folderData || [])
        .map((r: { folder: string | null }) => r.folder)
        .filter(Boolean) as string[]
    )
  );

  return {
    images: images || [],
    totalCount: count || 0,
    folders,
  };
}

export default async function GalleryPage() {
  // Operator-only: redirects owners → /admin and unauthenticated → /login.
  await requireSuperAdmin();

  const { images, totalCount, folders } = await getImages();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* ─── Animated Background ─────────────────────────────────── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-500/5 rounded-full blur-3xl" />
      </div>

      {/* ─── Content ──────────────────────────────────────────────── */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-[#FEFEFE] via-violet-200 to-indigo-200 bg-clip-text text-transparent">
              Galerie d'images
            </h1>
            <p className="text-gray-400 mt-2 text-sm">
              {totalCount} image{totalCount !== 1 ? "s" : ""} synchronisée{totalCount !== 1 ? "s" : ""} depuis Cloudinary
            </p>
          </div>

          <SyncButton />
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          <div className="bg-[#FEFEFE]/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
            <p className="text-2xl font-bold text-white">{totalCount}</p>
            <p className="text-xs text-gray-400 uppercase tracking-wider mt-1">Total images</p>
          </div>
          <div className="bg-[#FEFEFE]/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
            <p className="text-2xl font-bold text-white">{folders.length}</p>
            <p className="text-xs text-gray-400 uppercase tracking-wider mt-1">Dossiers</p>
          </div>
          <div className="bg-[#FEFEFE]/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
            <p className="text-2xl font-bold text-violet-400">CDN</p>
            <p className="text-xs text-gray-400 uppercase tracking-wider mt-1">Source</p>
          </div>
          <div className="bg-[#FEFEFE]/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
            <p className="text-2xl font-bold text-emerald-400">En ligne</p>
            <p className="text-xs text-gray-400 uppercase tracking-wider mt-1">Statut</p>
          </div>
        </div>

        {/* Image Grid */}
        <ImageGrid
          initialImages={images}
          totalCount={totalCount}
          folders={folders}
          pageSize={PAGE_SIZE}
        />
      </div>
    </div>
  );
}
