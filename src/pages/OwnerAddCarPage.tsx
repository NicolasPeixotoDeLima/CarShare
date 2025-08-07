import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car } from '../types';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import CarForm from '../components/cars/CarForm';
import { useAuth } from '../contexts/AuthContext';
import { mockCars } from '../data/mockData';

const OwnerAddCarPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const handleSubmit = async (carData: Partial<Car>) => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    setLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Create new car object
      const newCar: Car = {
        id: (mockCars.length + 1).toString(),
        ownerId: currentUser.id,
        title: carData.title || '',
        make: carData.make || '',
        model: carData.model || '',
        year: carData.year || new Date().getFullYear(),
        price: carData.price || 0,
        location: carData.location || '',
        description: carData.description || '',
        features: carData.features || [],
        images: carData.images || [],
        available: true,
        category: carData.category as any || 'economy',
        transmission: carData.transmission as any || 'automatic',
        fuelType: carData.fuelType as any || 'gasoline',
        seats: carData.seats || 5,
        rating: 0,
        reviewCount: 0
      };
      
      // In a real app, this would be an API call
      mockCars.push(newCar);
      
      // Navigate to owner dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating car listing:', error);
      // Handle error
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Anunciar Meu Carro</h1>
              <p className="text-gray-600">
                Preencha os detalhes do seu veículo para criar um anúncio atrativo.
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <CarForm 
                onSubmit={handleSubmit}
                isLoading={loading}
              />
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">Dicas para um bom anúncio:</h3>
              <ul className="list-disc list-inside text-blue-700 space-y-1">
                <li>Tire fotos do seu carro em boa iluminação, mostrando interior e exterior</li>
                <li>Descreva detalhadamente o estado do veículo e suas funcionalidades</li>
                <li>Seja claro sobre as regras e restrições de uso</li>
                <li>Defina um preço competitivo baseado no modelo, ano e condições do carro</li>
                <li>Responda rapidamente às solicitações de reserva para aumentar suas chances de aluguel</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default OwnerAddCarPage;