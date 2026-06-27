/**
 * Starter demo menu seeded into a brand-new café so the owner sees a full,
 * image-rich menu instead of a blank screen. Budget-safe by design:
 *  - a handful of rows (≈5 categories + 9 items),
 *  - every image points to ONE shared set under /public/demo-menu (no Supabase
 *    storage, no per-café cost, served as static assets).
 * The owner edits or replaces it freely.
 */

export interface SeedItem { name: string; description: string; price: number; image: string }
export interface SeedCategory { name: string; image: string; items: SeedItem[] }

export const DEMO_MENU: SeedCategory[] = [
  {
    name: 'Cafés', image: '/demo-menu/coffee.webp',
    items: [
      { name: 'Espresso', description: 'Café serré et intense', price: 2.5, image: '/demo-menu/coffee.webp' },
      { name: 'Cappuccino', description: 'Espresso et lait moussé', price: 3.5, image: '/demo-menu/coffee.webp' },
      { name: 'Café latte', description: 'Doux et crémeux', price: 4, image: '/demo-menu/coffee.webp' },
    ],
  },
  {
    name: 'Boissons fraîches', image: '/demo-menu/drink.webp',
    items: [
      { name: 'Limonade maison', description: 'Citron pressé, menthe fraîche', price: 4, image: '/demo-menu/drink.webp' },
      { name: "Jus d'orange pressé", description: 'Pressé minute', price: 4.5, image: '/demo-menu/drink.webp' },
    ],
  },
  {
    name: 'Salades', image: '/demo-menu/salad.webp',
    items: [
      { name: 'Salade César', description: 'Laitue, parmesan, croûtons, poulet grillé', price: 12, image: '/demo-menu/salad.webp' },
    ],
  },
  {
    name: 'Plats', image: '/demo-menu/pizza.webp',
    items: [
      { name: 'Pizza Margherita', description: 'Tomate, mozzarella, basilic frais', price: 14, image: '/demo-menu/pizza.webp' },
      { name: 'Pâtes Alfredo', description: 'Sauce crémeuse, poulet grillé', price: 16, image: '/demo-menu/pasta.webp' },
    ],
  },
  {
    name: 'Desserts', image: '/demo-menu/dessert.webp',
    items: [
      { name: 'Tiramisu', description: 'Le grand classique italien', price: 7, image: '/demo-menu/dessert.webp' },
    ],
  },
]

/**
 * Insert the starter menu for `businessId` using the given Supabase client
 * (browser RLS client OR service-role). Best-effort + idempotent: skips if the
 * café already has any category, never throws (a failed seed just leaves the
 * menu empty for the owner to fill).
 */
export async function seedDemoMenu(supabase: any, businessId: string): Promise<{ seeded: boolean }> {
  try {
    const { count } = await supabase
      .from('categories')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
    if ((count ?? 0) > 0) return { seeded: false }

    let position = 0
    for (const cat of DEMO_MENU) {
      const { data: c, error } = await supabase
        .from('categories')
        .insert({ business_id: businessId, name: cat.name, position: position++, image_url: cat.image, available: true })
        .select('id')
        .single()
      if (error || !c) continue
      await supabase.from('items').insert(
        cat.items.map((it) => ({ category_id: c.id, name: it.name, description: it.description, price: it.price, image_url: it.image, available: true })),
      )
    }
    return { seeded: true }
  } catch (e: any) {
    console.error('seedDemoMenu:', e?.message)
    return { seeded: false }
  }
}
