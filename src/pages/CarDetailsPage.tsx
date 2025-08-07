import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Calendar, Users, Gauge, ShieldCheck, Star, Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import Button from '../components/ui/Button';
import { Car, Review } from '../types';
import { mockCars, mockReviews } from '../data/mockData';
import { useAuth } from '../contexts/AuthContext';

const CarDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [car, setCar] = useState<Car | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [totalDays, setTotalDays] = useState(1);
  const [totalPrice, setTotalPrice] = useState(0);
  const { isAuthenticated } = useAuth();
  
  useEffect(() => {
    // Simulate API call
    setLoading(true);
    setTimeout(() => {
      const foundCar = mockCars.find(c => c.id === id);
      if (foundCar) {
        setCar(foundCar);
        setTotalPrice(foundCar.price);
        
        // Get car reviews
        const carReviews = mockReviews.filter(r => r.carId === foundCar.id);
        setReviews(carReviews);
      }
      setLoading(false);
    }, 500);
  }, [id]);
  
  useEffect(() => {
    if (car && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      setTotalDays(diffDays);
      setTotalPrice(car.price * diffDays);
    }
  }, [car, startDate, endDate]);
  
  const nextImage = () => {
    if (car) {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === car.images.length - 1 ? 0 : prevIndex + 1
      );
    }
  };
  
  const prevImage = () => {
    if (car) {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === 0 ? car.images.length - 1 : prevIndex - 1
      );
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-grow flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
        </div>
        <Footer />
      </div>
    );
  }
  
  if (!car) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-grow flex justify-center items-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Carro não encontrado</h2>
            <p className="text-gray-600 mb-6">O veículo que você está procurando não existe ou foi removido.</p>
            <Link to="/cars">
              <Button>Voltar para a lista de carros</Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <Link to="/cars" className="text-gray-600 hover:text-gray-900 flex items-center">
              <ChevronLeft size={20} />
              <span>Voltar para resultados</span>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Car Details */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg overflow-hidden shadow-md">
                {/* Image Gallery */}
                <div className="relative h-64 md:h-96 bg-gray-200">
                  <img
                    src={car.images[currentImageIndex]}
                    alt={`${car.make} ${car.model}`}
                    className="w-full h-full object-cover"
                  />
                  
                  {car.images.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 rounded-full p-2 shadow-md transition-colors"
                        aria-label="Previous image"
                      >
                        <ChevronLeft size={24} />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 rounded-full p-2 shadow-md transition-colors"
                        aria-label="Next image"
                      >
                        <ChevronRight size={24} />
                      </button>
                    </>
                  )}
                  
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                    {car.images.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`w-2 h-2 rounded-full ${
                          currentImageIndex === index ? 'bg-white' : 'bg-white/50'
                        }`}
                        aria-label={`Go to image ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">{car.title}</h1>
                      <div className="flex items-center mt-1">
                        <MapPin size={18} className="text-gray-500 mr-1" />
                        <span className="text-gray-600">{car.location}</span>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="flex items-center bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
                        <Star size={16} className="mr-1 fill-blue-500 text-blue-500" />
                        <span className="font-medium">{car.rating.toFixed(1)}</span>
                        <span className="ml-1">({car.reviewCount})</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-gray-500 text-sm mb-1">Ano</div>
                      <div className="font-semibold flex items-center">
                        <Calendar size={16} className="mr-2 text-gray-700" />
                        {car.year}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-gray-500 text-sm mb-1">Transmissão</div>
                      <div className="font-semibold flex items-center">
                        <Gauge size={16} className="mr-2 text-gray-700" />
                        {car.transmission === 'automatic' ? 'Automático' : 'Manual'}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-gray-500 text-sm mb-1">Combustível</div>
                      <div className="font-semibold flex items-center">
                        <Gauge size={16} className="mr-2 text-gray-700" />
                        {car.fuelType === 'gasoline' ? 'Gasolina' : 
                         car.fuelType === 'diesel' ? 'Diesel' : 
                         car.fuelType === 'electric' ? 'Elétrico' : 'Híbrido'}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-gray-500 text-sm mb-1">Assentos</div>
                      <div className="font-semibold flex items-center">
                        <Users size={16} className="mr-2 text-gray-700" />
                        {car.seats}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold mb-3">Descrição</h2>
                    <p className="text-gray-700 leading-relaxed">{car.description}</p>
                  </div>
                  
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold mb-3">Características</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4">
                      {car.features.map((feature, index) => (
                        <div key={index} className="flex items-center text-gray-700">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold mb-3">Localização</h2>
                    <div className="bg-gray-100 h-64 rounded-lg flex items-center justify-center">
                      <div className="text-gray-500">Mapa indisponível</div>
                    </div>
                  </div>
                  
                  <div>
                    <h2 className="text-xl font-semibold mb-3">Avaliações</h2>
                    {reviews.length > 0 ? (
                      <div className="space-y-4">
                        {reviews.map(review => (
                          <div key={review.id} className="border-b border-gray-100 pb-4">
                            <div className="flex justify-between">
                              <div className="flex items-center">
                                <div className="flex">
                                  {[1, 2, 3, 4, 5].map(star => (
                                    <Star 
                                      key={star} 
                                      size={16} 
                                      className={`${star <= review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} 
                                    />
                                  ))}
                                </div>
                                <span className="ml-2 text-gray-600">
                                  {format(new Date(review.createdAt), 'dd/MM/yyyy')}
                                </span>
                              </div>
                            </div>
                            <p className="mt-2 text-gray-700">{review.comment}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-500">Este carro ainda não possui avaliações.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right Column - Booking Form */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
                <div className="flex items-baseline justify-between mb-4">
                  <div>
                    <span className="text-2xl font-bold text-gray-900">R${car.price}</span>
                    <span className="text-gray-600 ml-1">/dia</span>
                  </div>
                  <div className="flex items-center">
                    <button className="text-gray-500 hover:text-red-500">
                      <Heart size={24} />
                    </button>
                  </div>
                </div>
                
                <form className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data de retirada
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data de devolução
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">R${car.price} x {totalDays} {totalDays === 1 ? 'dia' : 'dias'}</span>
                      <span className="text-gray-900">R${car.price * totalDays}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Taxa de serviço</span>
                      <span className="text-gray-900">R$50</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="font-bold text-gray-900">Total</span>
                        <span className="font-bold text-gray-900">R${totalPrice + 50}</span>
                      </div>
                    </div>
                  </div>
                  
                  {isAuthenticated ? (
                    <Button
                      type="submit"
                      fullWidth
                    >
                      Reservar
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <Link to="/login">
                        <Button
                          fullWidth
                        >
                          Entrar para reservar
                        </Button>
                      </Link>
                      <p className="text-sm text-gray-500 text-center">
                        Faça login ou crie uma conta para alugar este carro
                      </p>
                    </div>
                  )}
                </form>
                
                <div className="mt-6">
                  <div className="flex items-center justify-center text-gray-600 text-sm">
                    <ShieldCheck size={16} className="mr-2 text-green-600" />
                    <span>Reserva segura e protegida</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default CarDetailsPage;