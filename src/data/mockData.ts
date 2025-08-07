import { Car, User, Booking, Review } from '../types';

export const mockUsers: User[] = [
  {
    id: '1',
    name: 'João Silva',
    email: 'joao@example.com',
    password: 'password123',
    role: 'owner',
    avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=300',
    phone: '(11) 98765-4321',
    joinedAt: new Date('2023-01-15')
  },
  {
    id: '2',
    name: 'Maria Souza',
    email: 'maria@example.com',
    password: 'password123',
    role: 'renter',
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=300',
    joinedAt: new Date('2023-03-22')
  },
  {
    id: '3',
    name: 'Carlos Oliveira',
    email: 'carlos@example.com',
    password: 'password123',
    role: 'owner',
    avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=300',
    phone: '(21) 99876-5432',
    joinedAt: new Date('2023-02-10')
  }
];

export const mockCars: Car[] = [
  {
    id: '1',
    ownerId: '1',
    title: 'Econômico e confortável Honda Fit',
    make: 'Honda',
    model: 'Fit',
    year: 2022,
    price: 120,
    location: 'São Paulo, SP',
    description: 'Carro econômico, ideal para cidade. Possui ar condicionado, direção hidráulica e vidros elétricos.',
    features: ['Ar condicionado', 'Direção hidráulica', 'Vidros elétricos', 'Central multimídia'],
    images: [
      'https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/210019/pexels-photo-210019.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    available: true,
    category: 'economy',
    transmission: 'automatic',
    fuelType: 'gasoline',
    seats: 5,
    rating: 4.8,
    reviewCount: 15
  },
  {
    id: '2',
    ownerId: '3',
    title: 'SUV Toyota RAV4 para aventuras',
    make: 'Toyota',
    model: 'RAV4',
    year: 2021,
    price: 250,
    location: 'Rio de Janeiro, RJ',
    description: 'SUV espaçoso e confortável, perfeito para viagens longas e aventuras. Possui tração 4x4, ar condicionado e sistema de som premium.',
    features: ['Tração 4x4', 'Ar condicionado', 'Sistema de som premium', 'GPS', 'Câmera de ré'],
    images: [
      'https://images.pexels.com/photos/116675/pexels-photo-116675.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/3729464/pexels-photo-3729464.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    available: true,
    category: 'suv',
    transmission: 'automatic',
    fuelType: 'hybrid',
    seats: 5,
    rating: 4.5,
    reviewCount: 12
  },
  {
    id: '3',
    ownerId: '1',
    title: 'Elegante BMW Série 3',
    make: 'BMW',
    model: 'Série 3',
    year: 2023,
    price: 350,
    location: 'São Paulo, SP',
    description: 'Sedã de luxo com acabamento premium e ótimo desempenho. Possui bancos de couro, sistema de som Harman Kardon e painel digital.',
    features: ['Bancos de couro', 'Sistema de som Harman Kardon', 'Painel digital', 'Teto solar', 'Assistente de estacionamento'],
    images: [
      'https://images.pexels.com/photos/892522/pexels-photo-892522.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/358070/pexels-photo-358070.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    available: true,
    category: 'luxury',
    transmission: 'automatic',
    fuelType: 'gasoline',
    seats: 5,
    rating: 4.9,
    reviewCount: 8
  },
  {
    id: '4',
    ownerId: '3',
    title: 'Fiat Mobi compacto para cidade',
    make: 'Fiat',
    model: 'Mobi',
    year: 2021,
    price: 90,
    location: 'Rio de Janeiro, RJ',
    description: 'Carro compacto, ideal para circular na cidade. Econômico e fácil de estacionar.',
    features: ['Direção elétrica', 'Ar condicionado', 'Vidros elétricos', 'Bluetooth'],
    images: [
      'https://images.pexels.com/photos/3729464/pexels-photo-3729464.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/2834653/pexels-photo-2834653.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    available: true,
    category: 'compact',
    transmission: 'manual',
    fuelType: 'gasoline',
    seats: 4,
    rating: 4.2,
    reviewCount: 20
  },
  {
    id: '5',
    ownerId: '1',
    title: 'Chevrolet Camaro Conversível',
    make: 'Chevrolet',
    model: 'Camaro Conversível',
    year: 2020,
    price: 450,
    location: 'Belo Horizonte, MG',
    description: 'Carro esportivo conversível para momentos especiais. Motor potente e design atraente.',
    features: ['Capota retrátil', 'Bancos de couro', 'Painel digital', 'Sistema de som premium', 'Câmeras 360°'],
    images: [
      'https://images.pexels.com/photos/337909/pexels-photo-337909.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1592384/pexels-photo-1592384.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    available: true,
    category: 'convertible',
    transmission: 'automatic',
    fuelType: 'gasoline',
    seats: 4,
    rating: 4.7,
    reviewCount: 6
  },
  {
    id: '6',
    ownerId: '3',
    title: 'Volkswagen Gol econômico',
    make: 'Volkswagen',
    model: 'Gol',
    year: 2022,
    price: 110,
    location: 'Curitiba, PR',
    description: 'Carro confiável e econômico, perfeito para uso diário na cidade ou viagens curtas.',
    features: ['Ar condicionado', 'Direção hidráulica', 'Vidros elétricos', 'Entrada USB'],
    images: [
      'https://images.pexels.com/photos/1638459/pexels-photo-1638459.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    available: true,
    category: 'economy',
    transmission: 'manual',
    fuelType: 'gasoline',
    seats: 5,
    rating: 4.3,
    reviewCount: 18
  }
];

export const mockBookings: Booking[] = [
  {
    id: '1',
    carId: '1',
    renterId: '2',
    startDate: new Date('2023-06-10'),
    endDate: new Date('2023-06-15'),
    totalPrice: 600,
    status: 'completed',
    createdAt: new Date('2023-06-01')
  },
  {
    id: '2',
    carId: '3',
    renterId: '2',
    startDate: new Date('2023-07-20'),
    endDate: new Date('2023-07-25'),
    totalPrice: 1750,
    status: 'confirmed',
    createdAt: new Date('2023-07-10')
  }
];

export const mockReviews: Review[] = [
  {
    id: '1',
    carId: '1',
    userId: '2',
    rating: 5,
    comment: 'Carro muito bom, econômico e confortável. Recomendo!',
    createdAt: new Date('2023-06-16')
  },
  {
    id: '2',
    carId: '2',
    userId: '2',
    rating: 4,
    comment: 'Ótimo SUV para viagens, espaçoso e confortável.',
    createdAt: new Date('2023-05-22')
  }
];