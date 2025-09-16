// /data/categories.ts
import {
  Music,
  Palette,
  Users,
  Group,
  Utensils,
  Dumbbell,
  Heart,
  Gift,
  Cpu,
  Sparkles,
} from "lucide-react";

export interface Category {
  id: number;
  name: string;
  eventsCount: number;
  icon: React.ElementType;
  iconColor: string;
}

export const categories: Category[] = [
  {
    id: 1,
    name: "Music & Entertainment",
    eventsCount: 30,
    icon: Music,
    iconColor: "#099409",
  },
  {
    id: 2,
    name: "Arts & Culture",
    eventsCount: 130,
    icon: Palette,
    iconColor: "#946809",
  },
  {
    id: 3,
    name: "Conferences & Networking",
    eventsCount: 210,
    icon: Users,
    iconColor: "#093c94",
  },
  {
    id: 4,
    name: "Food & Drink",
    eventsCount: 67,
    icon: Utensils,
    iconColor: "#366b33",
  },
  {
    id: 5,
    name: "Sports & Fitness",
    eventsCount: 400,
    icon: Dumbbell,
    iconColor: "#6a701a",
  },
  {
    id: 6,
    name: "Community & Lifestyle",
    eventsCount: 20,
    icon: Group,
    iconColor: "#6e4f1e",
  },
  {
    id: 7,
    name: "Health & Wellness",
    eventsCount: 23,
    icon: Heart,
    iconColor: "#821515",
  },
  {
    id: 8,
    name: "Special Occasions",
    eventsCount: 110,
    icon: Gift,
    iconColor: "#6e1582",
  },
  {
    id: 9,
    name: "Technology & Education",
    eventsCount: 89,
    icon: Cpu,
    iconColor: "#153282",
  },
  {
    id: 10,
    name: "Niche / Emerging",
    eventsCount: 10,
    icon: Sparkles,
    iconColor: "#158275",
  },
];
