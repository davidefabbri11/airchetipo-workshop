export const AVAILABLE_CUISINES = [
  { id: "ITALIAN", label: "Italiana", emoji: "🇮🇹" },
  { id: "MEDITERRANEAN", label: "Mediterranea", emoji: "🫒" },
  { id: "JAPANESE", label: "Giapponese", emoji: "🇯🇵" },
  { id: "MEXICAN", label: "Messicana", emoji: "🇲🇽" },
  { id: "INDIAN", label: "Indiana", emoji: "🇮🇳" },
  { id: "CHINESE", label: "Cinese", emoji: "🇨🇳" },
  { id: "THAI", label: "Thailandese", emoji: "🇹🇭" },
  { id: "GREEK", label: "Greca", emoji: "🇬🇷" },
  { id: "AMERICAN", label: "Americana", emoji: "🇺🇸" },
  { id: "KOREAN", label: "Coreana", emoji: "🇰🇷" },
  { id: "MIDDLE_EASTERN", label: "Mediorientale", emoji: "🧆" },
  { id: "FRENCH", label: "Francese", emoji: "🇫🇷" },
  { id: "SPANISH", label: "Spagnola", emoji: "🇪🇸" },
  { id: "BRAZILIAN", label: "Brasiliana", emoji: "🇧🇷" },
  { id: "VIETNAMESE", label: "Vietnamita", emoji: "🇻🇳" },
  { id: "AFRICAN", label: "Africana", emoji: "🌍" },
  { id: "VEGETARIAN", label: "Vegetariana", emoji: "🌱" },
  { id: "VEGAN", label: "Vegana", emoji: "🥬" },
  { id: "SEAFOOD", label: "Pesce & Mare", emoji: "🐟" },
  { id: "HEALTHY", label: "Salutista", emoji: "🥗" },
] as const;

export type CuisineId = (typeof AVAILABLE_CUISINES)[number]["id"];
