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
  id: string;
  name: string;
  eventsCount: number;
  iconComponent: React.ElementType;
  iconName: string;
  iconColor: string;
  // icon: string;
}

export const categories: Category[] = [
  {
    id: "cmcategorymusic",
    name: "Music & Entertainment",
    eventsCount: 30,
    iconComponent: Music,
    iconName: "Music",
    iconColor: "#099409",
  },
  {
    id: "cmcategoryarts",
    name: "Arts & Culture",
    eventsCount: 130,
    iconComponent: Palette,
    iconName: "Palette",
    iconColor: "#946809",
  },
  {
    id: "cmcategoryconference",
    name: "Conferences & Networking",
    eventsCount: 210,
    iconComponent: Users,
    iconName: "Users",
    iconColor: "#093c94",
  },
  {
    id: "cmcategoryfood",
    name: "Food & Drink",
    eventsCount: 67,
    iconComponent: Utensils,
    iconName: "Utensils",
    iconColor: "#366b33",
  },
  {
    id: "cmcategorysports",
    name: "Sports & Fitness",
    eventsCount: 400,
    iconComponent: Dumbbell,
    iconName: "Dumbbell",
    iconColor: "#6a701a",
  },
  {
    id: "cmcategorycommunity",
    name: "Community & Lifestyle",
    eventsCount: 20,
    iconComponent: Group,
    iconName: "Group",
    iconColor: "#6e4f1e",
  },
  {
    id: "cmcategoryhealth",
    name: "Health & Wellness",
    eventsCount: 23,
    iconComponent: Heart,
    iconName: "Heart",
    iconColor: "#821515",
  },
  {
    id: "cmcategoryoccasions",
    name: "Special Occasions",
    eventsCount: 110,
    iconComponent: Gift,
    iconName: "Gift",
    iconColor: "#6e1582",
  },
  {
    id: "cmcategorytechnology",
    name: "Technology & Education",
    eventsCount: 89,
    iconComponent: Cpu,
    iconName: "Cpu",
    iconColor: "#153282",
  },
  {
    id: "cmcategoryniche",
    name: "Niche / Emerging",
    eventsCount: 10,
    iconComponent: Sparkles,
    iconName: "Sparkles",
    iconColor: "#158275",
  },
];
