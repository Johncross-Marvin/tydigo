/**
 * Shared icon resolver for the site config's string-based icon keys.
 * Maps string names to lucide-react components.
 */

import {
  Home,
  Building2,
  BarChart3,
  Truck,
  Recycle,
  Leaf,
  Globe,
  Shield,
  Handshake,
  MapPin,
  Award,
  Users,
  Calendar,
  FileText,
  CreditCard,
  Package,
  Droplets,
  DollarSign,
  Clock,
  Bell,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Home,
  Building2,
  BarChart3,
  Truck,
  Recycle,
  Leaf,
  Globe,
  Shield,
  Handshake,
  MapPin,
  Award,
  Users,
  Calendar,
  FileText,
  CreditCard,
  Package,
  Droplets,
  DollarSign,
  Clock,
  Bell,
};

export function resolveIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Home;
}
