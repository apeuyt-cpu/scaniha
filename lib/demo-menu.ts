// Demo data used to preview the menu design templates (e.g. /menu/1 … /menu/4
// and /menu-designs/<n>). A realistic, appetising "Saveur" bistro so a prospect
// sees each design at its best. A deliberate mix of items WITH and WITHOUT images
// shows how each design handles both — real owners photograph some dishes, not all.
const IMG = {
  pizza: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=640&q=70',
  pasta: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=640&q=70',
  salad: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=640&q=70',
  dessert: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=640&q=70',
  drink: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=640&q=70',
  coffee: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=640&q=70',
  burger: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=640&q=70',
  bruschetta: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?auto=format&fit=crop&w=640&q=70',
  steak: 'https://images.unsplash.com/photo-1546964124-0cce460f38ef?auto=format&fit=crop&w=640&q=70',
  cheesecake: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=640&q=70',
}

// Shared demo settings so EVERY design preview renders fully populated —
// logo, tagline, "À la une" showcase and the contact/hours footer — instead
// of looking sparse. Real menus get this from each owner's own settings.
const demoSettings = {
  showLogo: true,
  tagline: 'Cuisine maison · Sousse',
  showcase: true,
  showPrices: true,
  showDescriptions: true,
  contactEnabled: true,
  phone: '+216 20 123 456',
  address: '12 Av. Habib Bourguiba, Sousse',
  hours: 'Lun–Dim · 8h – 23h',
}

export const mockBusiness = {
  id: 'demo',
  slug: 'saveur',
  name: 'Saveur',
  status: 'active',
  theme_id: 'design1',
  logo_url: '/logo.png',
  primary_color: '#F47B20',
  instagram_url: 'https://instagram.com',
  facebook_url: 'https://facebook.com',
  whatsapp_number: '+216 20 123 456',
  website_url: 'https://scaniha.com',
  design_settings: {
    design1: demoSettings,
    design2: demoSettings,
    design6: demoSettings,
    design11: demoSettings,
    design12: demoSettings,
  },
}

export const mockCategories = [
  {
    id: '1', name: 'Entrées', image_url: IMG.bruschetta, available: true,
    items: [
      { id: 'e1', name: 'Bruschetta à la truffe', description: 'Pain grillé, tomates confites, crème de truffe', price: 6.5, image_url: IMG.bruschetta, available: true },
      { id: 'e2', name: 'Calamars frits', description: 'Beignets de calamars, sauce citronnée', price: 9.5, image_url: null, available: true },
      { id: 'e3', name: 'Houmous maison', description: 'Pois chiches, tahini, huile d’olive', price: 5.0, image_url: null, available: true },
    ],
  },
  {
    id: '2', name: 'Plats signature', image_url: IMG.steak, available: true,
    items: [
      { id: 'm1', name: 'Burger Saveur', description: 'Bœuf, cheddar fondu, oignons caramélisés, frites maison', price: 13.9, image_url: IMG.burger, available: true },
      { id: 'm2', name: 'Entrecôte grillée', description: 'Sauce poivre, pommes grenailles', price: 24.0, image_url: IMG.steak, available: true },
      { id: 'm3', name: 'Pâtes à la truffe', description: 'Tagliatelles fraîches, parmesan, truffe', price: 14.5, image_url: IMG.pasta, available: true },
      { id: 'm4', name: 'Poulet rôti aux herbes', description: 'Mariné au thym et citron, légumes de saison', price: 12.9, image_url: null, available: true },
    ],
  },
  {
    id: '3', name: 'Pizzas', image_url: IMG.pizza, available: true,
    items: [
      { id: 'p1', name: 'Margherita', description: 'Tomate, mozzarella, basilic frais', price: 8.9, image_url: IMG.pizza, available: true },
      { id: 'p2', name: 'Pepperoni', description: 'Pepperoni épicé, double fromage', price: 11.5, image_url: null, available: true },
      { id: 'p3', name: '4 Fromages', description: 'Mozzarella, gorgonzola, chèvre, parmesan', price: 12.0, image_url: null, available: true },
    ],
  },
  {
    id: '4', name: 'Salades', image_url: IMG.salad, available: true,
    items: [
      { id: 's1', name: 'Salade César', description: 'Laitue, poulet grillé, parmesan, croûtons', price: 9.5, image_url: IMG.salad, available: true },
      { id: 's2', name: 'Salade Saveur', description: 'Chèvre chaud, miel, noix, roquette', price: 10.5, image_url: null, available: true },
    ],
  },
  {
    id: '5', name: 'Desserts', image_url: IMG.dessert, available: true,
    items: [
      { id: 'd1', name: 'Tiramisu', description: 'Le classique italien, mascarpone & café', price: 5.9, image_url: IMG.dessert, available: true },
      { id: 'd2', name: 'Cheesecake fruits rouges', description: 'Onctueux, coulis maison', price: 6.5, image_url: IMG.cheesecake, available: true },
      { id: 'd3', name: 'Fondant au chocolat', description: 'Cœur coulant, glace vanille', price: 6.9, image_url: null, available: true },
    ],
  },
  {
    id: '6', name: 'Boissons & Cafés', image_url: IMG.coffee, available: true,
    items: [
      { id: 'b1', name: 'Limonade fraîche', description: 'Citron pressé, menthe', price: 3.5, image_url: IMG.drink, available: true },
      { id: 'b2', name: "Jus d'orange pressé", description: 'Pressé minute', price: 4.0, image_url: null, available: true },
      { id: 'c1', name: 'Espresso', description: 'Café serré', price: 2.5, image_url: null, available: true },
      { id: 'c2', name: 'Cappuccino', description: 'Mousse de lait onctueuse', price: 3.8, image_url: IMG.coffee, available: true },
    ],
  },
]
