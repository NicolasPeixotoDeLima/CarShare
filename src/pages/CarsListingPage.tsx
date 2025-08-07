import React, { useState, useEffect } from 'react';
import { Grid, List } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import CarCard from '../components/cars/CarCard';
import CarFilters from '../components/cars/CarFilters';
import { Car } from '../types';
import { mockCars } from '../data/mockData';

const CarsListingPage: React.FC = () => {
  const [cars, setCars] = useState<Car[]>(mockCars);
  const [filteredCars, setFilteredCars] = useState<Car[]>(mockCars);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(false);
  
  const handleFilter = (filters: any) => {
    setLoading(true);
    
    // Simulate API call delay
    setTimeout(() => {
      // Apply filters (this is a simplified example)
      let results = [...cars];
      
      // Filter by location
      if (filters.location) {
        results = results.filter(car => 
          car.location.toLowerCase().includes(filters.location.toLowerCase())
        );
      }
      
      // Filter by price range
      if (filters.price.min) {
        results = results.filter(car => car.price >= parseInt(filters.price.min));
      }
      
      if (filters.price.max) {
        results = results.filter(car => car.price <= parseInt(filters.price.max));
      }
      
      // Filter by categories
      if (filters.categories.length > 0) {
        results = results.filter(car => filters.categories.includes(car.category));
      }
      
      // Filter by transmission
      if (filters.transmission.length > 0) {
        results = results.filter(car => filters.transmission.includes(car.transmission));
      }
      
      // Filter by fuel type
      if (filters.fuelType.length > 0) {
        results = results.filter(car => filters.fuelType.includes(car.fuelType));
      }
      
      setFilteredCars(results);
      setLoading(false);
    }, 500);
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Encontre seu carro ideal</h1>
            <p className="text-gray-600">
              Explore nossa seleção de carros disponíveis para aluguel. Use os filtros para refinar sua busca.
            </p>
          </div>
          
          <CarFilters onFilter={handleFilter} />
          
          <div className="flex justify-between items-center mb-6">
            <p className="text-gray-600">
              {filteredCars.length} {filteredCars.length === 1 ? 'carro encontrado' : 'carros encontrados'}
            </p>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${
                  viewMode === 'grid' ? 'bg-gray-200' : 'hover:bg-gray-100'
                }`}
                aria-label="View as grid"
              >
                <Grid size={20} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${
                  viewMode === 'list' ? 'bg-gray-200' : 'hover:bg-gray-100'
                }`}
                aria-label="View as list"
              >
                <List size={20} />
              </button>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
            </div>
          ) : filteredCars.length > 0 ? (
            <div className={`
              ${viewMode === 'grid' 
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
                : 'space-y-4'
              }
            `}>
              {filteredCars.map(car => (
                <CarCard key={car.id} car={car} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <h3 className="text-xl font-medium text-gray-900 mb-2">Nenhum carro encontrado</h3>
              <p className="text-gray-600">
                Tente ajustar seus filtros ou buscar em outra localidade.
              </p>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default CarsListingPage;