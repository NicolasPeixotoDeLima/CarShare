import React, { useState } from 'react';
import { Filter, Search, X } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface FiltersState {
  location: string;
  dateRange: {
    start: string;
    end: string;
  };
  price: {
    min: string;
    max: string;
  };
  categories: string[];
  features: string[];
  transmission: string[];
  fuelType: string[];
}

interface CarFiltersProps {
  onFilter: (filters: FiltersState) => void;
}

const carCategories = [
  { id: 'economy', label: 'Econômico' },
  { id: 'compact', label: 'Compacto' },
  { id: 'suv', label: 'SUV' },
  { id: 'luxury', label: 'Luxo' },
  { id: 'sports', label: 'Esportivo' },
  { id: 'minivan', label: 'Minivan' },
  { id: 'convertible', label: 'Conversível' }
];

const carFeatures = [
  { id: 'ac', label: 'Ar condicionado' },
  { id: 'bluetooth', label: 'Bluetooth' },
  { id: 'gps', label: 'GPS' },
  { id: 'usbPort', label: 'Entrada USB' },
  { id: 'leatherSeats', label: 'Bancos de couro' },
  { id: 'sunroof', label: 'Teto solar' },
  { id: 'backupCamera', label: 'Câmera de ré' }
];

const CarFilters: React.FC<CarFiltersProps> = ({ onFilter }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FiltersState>({
    location: '',
    dateRange: {
      start: '',
      end: ''
    },
    price: {
      min: '',
      max: ''
    },
    categories: [],
    features: [],
    transmission: [],
    fuelType: []
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFilters(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof FiltersState],
          [child]: value
        }
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleCheckboxChange = (category: string, id: string) => {
    setFilters(prev => {
      const currentSelection = prev[category as keyof FiltersState] as string[];
      
      if (currentSelection.includes(id)) {
        return {
          ...prev,
          [category]: currentSelection.filter(item => item !== id)
        };
      } else {
        return {
          ...prev,
          [category]: [...currentSelection, id]
        };
      }
    });
  };

  const handleClearFilters = () => {
    setFilters({
      location: '',
      dateRange: { start: '', end: '' },
      price: { min: '', max: '' },
      categories: [],
      features: [],
      transmission: [],
      fuelType: []
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilter(filters);
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  };

  return (
    <div className="mb-8">
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
        <div className="flex-1">
          <div className="relative">
            <Input
              placeholder="Buscar carros por local, marca ou modelo..."
              leftIcon={<Search size={18} className="text-gray-500" />}
              fullWidth
              className="py-3"
            />
          </div>
        </div>
        <Button 
          onClick={() => setIsOpen(!isOpen)}
          variant="outline"
          leftIcon={<Filter size={18} />}
          className="md:w-auto"
        >
          Filtros
        </Button>
      </div>

      {isOpen && (
        <div className="bg-white p-6 rounded-lg shadow-lg mt-4 border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Filtros</h3>
            <button 
              onClick={handleClearFilters}
              className="text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <X size={16} />
              <span>Limpar filtros</span>
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium mb-3">Localização</h4>
                <Input
                  name="location"
                  placeholder="Digite a cidade ou bairro"
                  value={filters.location}
                  onChange={handleChange}
                  fullWidth
                />
              </div>

              <div>
                <h4 className="font-medium mb-3">Datas</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    name="dateRange.start"
                    value={filters.dateRange.start}
                    onChange={handleChange}
                    fullWidth
                  />
                  <Input
                    type="date"
                    name="dateRange.end"
                    value={filters.dateRange.end}
                    onChange={handleChange}
                    fullWidth
                  />
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Preço por dia</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    name="price.min"
                    placeholder="Mínimo"
                    value={filters.price.min}
                    onChange={handleChange}
                    fullWidth
                  />
                  <Input
                    type="number"
                    name="price.max"
                    placeholder="Máximo"
                    value={filters.price.max}
                    onChange={handleChange}
                    fullWidth
                  />
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="font-medium mb-3">Categorias</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {carCategories.map(category => (
                  <label 
                    key={category.id} 
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={filters.categories.includes(category.id)}
                      onChange={() => handleCheckboxChange('categories', category.id)}
                      className="rounded text-red-500 focus:ring-red-500"
                    />
                    <span>{category.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <h4 className="font-medium mb-3">Características</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {carFeatures.map(feature => (
                  <label 
                    key={feature.id} 
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={filters.features.includes(feature.id)}
                      onChange={() => handleCheckboxChange('features', feature.id)}
                      className="rounded text-red-500 focus:ring-red-500"
                    />
                    <span>{feature.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <h4 className="font-medium mb-3">Transmissão</h4>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.transmission.includes('automatic')}
                    onChange={() => handleCheckboxChange('transmission', 'automatic')}
                    className="rounded text-red-500 focus:ring-red-500"
                  />
                  <span>Automático</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.transmission.includes('manual')}
                    onChange={() => handleCheckboxChange('transmission', 'manual')}
                    className="rounded text-red-500 focus:ring-red-500"
                  />
                  <span>Manual</span>
                </label>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="font-medium mb-3">Combustível</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.fuelType.includes('gasoline')}
                    onChange={() => handleCheckboxChange('fuelType', 'gasoline')}
                    className="rounded text-red-500 focus:ring-red-500"
                  />
                  <span>Gasolina</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.fuelType.includes('diesel')}
                    onChange={() => handleCheckboxChange('fuelType', 'diesel')}
                    className="rounded text-red-500 focus:ring-red-500"
                  />
                  <span>Diesel</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.fuelType.includes('electric')}
                    onChange={() => handleCheckboxChange('fuelType', 'electric')}
                    className="rounded text-red-500 focus:ring-red-500"
                  />
                  <span>Elétrico</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.fuelType.includes('hybrid')}
                    onChange={() => handleCheckboxChange('fuelType', 'hybrid')}
                    className="rounded text-red-500 focus:ring-red-500"
                  />
                  <span>Híbrido</span>
                </label>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <Button
                type="submit"
                variant="primary"
              >
                Aplicar Filtros
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default CarFilters;