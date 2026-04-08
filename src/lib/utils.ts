import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function hashPassword(password: string) {
  // In a real app, use a proper hashing library.
  // For this demo, we'll use a simple btoa for simulation.
  return btoa(password);
}
