// Demo data used to preview the menu design templates.
// A deliberate mix of items WITH and WITHOUT images so previews show how each
// design handles both — owners can add photos to some items and not others.
const IMG = {
  pizza: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=640&q=70',
  pasta: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=640&q=70',
  salad: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=640&q=70',
  dessert: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=640&q=70',
  drink: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=640&q=70',
  coffee: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=640&q=70',
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
  name: 'Le Bon Goût',
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
    id: '1', name: 'Pizzas', image_url: IMG.pizza, available: true,
    items: [
      { id: 'p1', name: 'Margherita', description: 'Tomate, mozzarella, basilic frais', price: 8.9, image_url: IMG.pizza, available: true },
      { id: 'p2', name: 'Pepperoni', description: 'Pepperoni épicé, double fromage', price: 11.5, image_url: null, available: true },
    ],
  },
  {
    id: '2', name: 'Pâtes', image_url: IMG.pasta, available: true,
    items: [
      { id: 'pa1', name: 'Chicken Alfredo', description: 'Sauce crémeuse, poulet grillé', price: 9.9, image_url: IMG.pasta, available: true },
      { id: 'pa2', name: 'Truffle Pasta', description: 'Pâtes fraîches à la truffe', price: 12.9, image_url: null, available: true },
    ],
  },
  {
    id: '3', name: 'Salades', image_url: IMG.salad, available: true,
    items: [
      { id: 's1', name: 'Salade César', description: 'Laitue, parmesan, croûtons', price: 7.5, image_url: IMG.salad, available: true },
    ],
  },
  {
    id: '4', name: 'Boissons', image_url: IMG.drink, available: true,
    items: [
      { id: 'b1', name: 'Limonade fraîche', description: 'Citron pressé', price: 3.5, image_url: null, available: true },
      { id: 'b2', name: "Jus d'orange", description: 'Pressé minute', price: 4.0, image_url: null, available: true },
    ],
  },
  {
    id: '5', name: 'Cafés', image_url: IMG.coffee, available: true,
    items: [
      { id: 'c1', name: 'Espresso', description: 'Café serré', price: 2.5, image_url: null, available: true },
    ],
  },
  {
    id: '6', name: 'Desserts', image_url: IMG.dessert, available: true,
    items: [
      { id: 'd1', name: 'Tiramisu', description: 'Le classique italien', price: 5.9, image_url: IMG.dessert, available: true },
    ],
  },
]
