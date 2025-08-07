export type UserRole = 'renter' | 'owner';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  avatar: string;
  phone?: string;
  joinedAt: Date;
}

export interface Car {
  id: string;
  ownerId: string;
  title: string;
  make: string;
  model: string;
  year: number;
  price: number;
  location: string;
  description: string;
  features: string[];
  images: string[];
  available: boolean;
  category: CarCategory;
  transmission: 'automatic' | 'manual';
  fuelType: 'gasoline' | 'diesel' | 'electric' | 'hybrid';
  seats: number;
  rating: number;
  reviewCount: number;
}

export type CarCategory = 'economy' | 'compact' | 'suv' | 'luxury' | 'sports' | 'minivan' | 'convertible';

export interface Booking {
  id: string;
  carId: string;
  renterId: string;
  startDate: Date;
  endDate: Date;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: Date;
}

export interface Review {
  id: string;
  carId: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: Date;
}