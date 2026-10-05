export type CategoryKind = "EVENT" | "MARKETPLACE";

export interface CategoryRecord {
  id: string;
  name: string;
  kind: CategoryKind;
  icon: string | null;
  iconColor: string | null;
  eventsCount: number;
}