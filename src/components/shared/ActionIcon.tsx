import React from 'react';
import {
  Activity, AlarmClock, Apple, Award, Baby, Bath, BatteryCharging, Bed,
  Bike, BookOpen, Brain, Briefcase, Bus, Calendar, Camera, Car,
  Cat, CheckCircle2, Clock, CloudRain, Code, Coffee, Compass, Dog,
  Droplets, Dumbbell, Eye, Film, Flame, Flower2, Footprints, Gamepad2,
  Gift, GlassWater, GraduationCap, Guitar, Headphones, Heart, Home, Languages,
  Laptop, Leaf, LucideIcon, Mail, MapPin, Moon, Mountain, Music,
  Palette, PenTool, PhoneCall, PiggyBank, Pill, Plane, Scale, Scissors,
  ShieldCheck, ShoppingBag, Shirt, ShowerHead, Smile, Smartphone, Soup, Sparkles,
  Stethoscope, Sun, Sunrise, Sunset, Target, Tent, Thermometer, Trash2,
  Tv, Umbrella, Users, Utensils, Wallet, Waves, Wine, Wrench, Zap,
} from 'lucide-react';
import {
  ACTION_PRESET_HEX_MAP,
  ActionPresetColor,
  resolveActionColorHex,
} from '../../types';

export const ACTION_ICON_MAP: Record<string, LucideIcon> = {
  Activity, Sunrise, Sun, Sunset, Moon, AlarmClock, Bed, Clock,
  Coffee, Utensils, Droplets, GlassWater, Apple, Soup, Wine,
  Dumbbell, Footprints, Bike, Waves, Mountain, Flame, Heart, Pill,
  Stethoscope, Thermometer, Scale, Eye, ShowerHead, Bath, Scissors, BatteryCharging,
  Briefcase, Laptop, Code, BookOpen, GraduationCap, Languages, Brain, Target,
  PenTool, CheckCircle2, Calendar, Mail, PhoneCall, Smartphone, Zap,
  Wallet, PiggyBank, ShoppingBag,
  Home, Sparkles, Shirt, Trash2, Wrench, Flower2, Leaf,
  Users, Baby, Dog, Cat, Smile, Gift, Award, ShieldCheck,
  Music, Guitar, Headphones, Tv, Film, Gamepad2, Camera, Palette,
  Car, Bus, Plane, MapPin, Compass, Tent, CloudRain, Umbrella,
};

export const ACTION_ICON_NAMES = Object.keys(ACTION_ICON_MAP);

export interface ActionIconProps {
  name: string;
  size?: number;
  className?: string;
}

export const ActionIcon: React.FC<ActionIconProps> = ({
  name,
  size = 18,
  className,
}) => {
  const IconComponent = ACTION_ICON_MAP[name.trim()] ?? Activity;
  return <IconComponent size={size} className={className} aria-hidden="true" />;
};

/**
 * Resolves an Action color key or Event color snapshot into a semantic token CSS modifier class.
 * Returns `'accent-custom'` for valid non-preset `#RRGGBB` hex colors.
 */
export function getAccentClassName(color: string): string {
  const normalized = color.trim().toLowerCase();

  if (
    normalized === 'terracotta' ||
    normalized === ACTION_PRESET_HEX_MAP.terracotta.toLowerCase()
  ) {
    return 'accent-terracotta';
  }
  if (
    normalized === 'lavender' ||
    normalized === ACTION_PRESET_HEX_MAP.lavender.toLowerCase()
  ) {
    return 'accent-lavender';
  }
  if (
    normalized === 'mint' ||
    normalized === ACTION_PRESET_HEX_MAP.mint.toLowerCase()
  ) {
    return 'accent-mint';
  }
  if (
    normalized === 'chartreuse' ||
    normalized === ACTION_PRESET_HEX_MAP.chartreuse.toLowerCase()
  ) {
    return 'accent-chartreuse';
  }
  if (/^#[0-9a-f]{6}$/i.test(normalized)) {
    return 'accent-custom';
  }

  return 'accent-chartreuse';
}

/**
 * Returns inline border-left accent style when the color is a custom `#RRGGBB` hex value.
 * Returns `undefined` for preset colors so token CSS classes remain authoritative.
 */
export function getAccentStyle(color: string): React.CSSProperties | undefined {
  if (getAccentClassName(color) !== 'accent-custom') {
    return undefined;
  }
  const resolvedHex = resolveActionColorHex(color);
  return {
    borderLeftColor: resolvedHex,
    '--color-accent-custom': resolvedHex,
  } as React.CSSProperties;
}

/**
 * Returns inline border-left and foreground color styles for badges using a custom `#RRGGBB` hex value.
 * Returns `undefined` for preset colors so token CSS classes remain authoritative.
 */
export function getAccentBadgeStyle(color: string): React.CSSProperties | undefined {
  if (getAccentClassName(color) !== 'accent-custom') {
    return undefined;
  }
  const resolvedHex = resolveActionColorHex(color);
  return {
    borderLeftColor: resolvedHex,
    color: resolvedHex,
    '--color-accent-custom': resolvedHex,
  } as React.CSSProperties;
}

export function resolvePresetLabel(color: string): ActionPresetColor | null {
  const cls = getAccentClassName(color);
  if (cls === 'accent-terracotta') return 'terracotta';
  if (cls === 'accent-lavender') return 'lavender';
  if (cls === 'accent-mint') return 'mint';
  if (cls === 'accent-chartreuse') return 'chartreuse';
  return null;
}
