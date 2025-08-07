import React, { useState } from 'react';
import { Car, CarCategory } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Plus, X } from 'lucide-react';

interface CarFormProps {
  initialValues?: Partial<Car>;
  onSubmit: (carData: Partial<Car>) => void;
  isLoading?: boolean;
}

const CarForm: React.FC<CarFormProps> = ({ 
  initialValues,
  onSubmit,
  isLoading = false
}) => {
  const [carData, setCarData] = useState<Partial<Car>>(initialValues || {
    title: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    price: 0,
    location: '',
    description: '',
    features: [],
    images: [],
    category: 'economy',
    transmission: 'automatic',
    fuelType: 'gasoline',
    seats: 5
  });
  
  const [featureInput, setFeatureInput] = useState('');
  const [imageInput, setImageInput] = useState('');
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Handle number inputs
    if (type === 'number') {
      setCarData({
        ...carData,
        [name]: parseFloat(value)
      });
      return;
    }
    
    setCarData({
      ...carData,
      [name]: value
    });
  };
  
  const addFeature = (e: React.FormEvent) => {
    e.preventDefault();
    if (featureInput.trim() !== '' && carData.features) {
      setCarData({
        ...carData,
        features: [...carData.features, featureInput.trim()]
      });
      setFeatureInput('');
    }
  };
  
  const removeFeature = (index: number) => {
    if (carData.features) {
      const updatedFeatures = [...carData.features];
      updatedFeatures.splice(index, 1);
      setCarData({
        ...carData,
        features: updatedFeatures
      });
    }
  };
  
  const addImage = (e: React.FormEvent) => {
    e.preventDefault();
    if (imageInput.trim() !== '' && carData.images) {
      setCarData({
        ...carData,
        images: [...carData.images, imageInput.trim()]
      });
      setImageInput('');
    }
  };
  
  const removeImage = (index: number) => {
    if (carData.images) {
      const updatedImages = [...carData.images];
      updatedImages.splice(index, 1);
      setCarData({
        ...carData,
        images: updatedImages
      });
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(carData);
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <Input
            label="Título do anúncio"
            name="title"
            value={carData.title}
            onChange={handleChange}
            placeholder="Ex: Honda Civic 2022 em excelente estado"
            required
            fullWidth
          />
        </div>
        
        <div>
          <Input
            label="Marca"
            name="make"
            value={carData.make}
            onChange={handleChange}
            placeholder="Ex: Honda, Toyota, Volkswagen..."
            required
            fullWidth
          />
        </div>
        
        <div>
          <Input
            label="Modelo"
            name="model"
            value={carData.model}
            onChange={handleChange}
            placeholder="Ex: Civic, Corolla, Golf..."
            required
            fullWidth
          />
        </div>
        
        <div>
          <Input
            label="Ano"
            type="number"
            name="year"
            value={carData.year}
            onChange={handleChange}
            min={1990}
            max={new Date().getFullYear() + 1}
            required
            fullWidth
          />
        </div>
        
        <div>
          <Input
            label="Preço por dia (R$)"
            type="number"
            name="price"
            value={carData.price}
            onChange={handleChange}
            min={1}
            required
            fullWidth
          />
        </div>
        
        <div className="md:col-span-2">
          <Input
            label="Localização"
            name="location"
            value={carData.location}
            onChange={handleChange}
            placeholder="Ex: São Paulo, SP"
            required
            fullWidth
          />
        </div>
        
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descrição
          </label>
          <textarea
            name="description"
            value={carData.description}
            onChange={handleChange}
            rows={4}
            className="w-full rounded-md shadow-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500 px-4 py-2 border"
            placeholder="Descreva seu veículo, condições, regras de uso, etc."
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Categoria
          </label>
          <select
            name="category"
            value={carData.category}
            onChange={handleChange}
            className="w-full rounded-md shadow-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500 px-4 py-2 border"
            required
          >
            <option value="economy">Econômico</option>
            <option value="compact">Compacto</option>
            <option value="suv">SUV</option>
            <option value="luxury">Luxo</option>
            <option value="sports">Esportivo</option>
            <option value="minivan">Minivan</option>
            <option value="convertible">Conversível</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Número de lugares
          </label>
          <select
            name="seats"
            value={carData.seats}
            onChange={handleChange}
            className="w-full rounded-md shadow-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500 px-4 py-2 border"
            required
          >
            {[2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Transmissão
          </label>
          <select
            name="transmission"
            value={carData.transmission}
            onChange={handleChange}
            className="w-full rounded-md shadow-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500 px-4 py-2 border"
            required
          >
            <option value="automatic">Automático</option>
            <option value="manual">Manual</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de combustível
          </label>
          <select
            name="fuelType"
            value={carData.fuelType}
            onChange={handleChange}
            className="w-full rounded-md shadow-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500 px-4 py-2 border"
            required
          >
            <option value="gasoline">Gasolina</option>
            <option value="diesel">Diesel</option>
            <option value="electric">Elétrico</option>
            <option value="hybrid">Híbrido</option>
          </select>
        </div>
        
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Características e equipamentos
          </label>
          <div className="flex mb-2">
            <Input
              value={featureInput}
              onChange={(e) => setFeatureInput(e.target.value)}
              placeholder="Ex: Ar condicionado, GPS, etc."
              fullWidth
            />
            <Button
              type="button"
              onClick={addFeature}
              variant="outline"
              className="ml-2"
            >
              <Plus size={18} />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {carData.features?.map((feature, index) => (
              <div 
                key={index} 
                className="bg-gray-100 px-3 py-1 rounded-full flex items-center"
              >
                <span className="text-sm">{feature}</span>
                <button
                  type="button"
                  onClick={() => removeFeature(index)}
                  className="ml-1 text-gray-500 hover:text-gray-700"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
        
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Imagens do veículo (URLs)
          </label>
          <div className="flex mb-2">
            <Input
              value={imageInput}
              onChange={(e) => setImageInput(e.target.value)}
              placeholder="Cole a URL da imagem"
              fullWidth
            />
            <Button
              type="button"
              onClick={addImage}
              variant="outline"
              className="ml-2"
            >
              <Plus size={18} />
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-2">
            {carData.images?.map((image, index) => (
              <div key={index} className="relative group">
                <img
                  src={image}
                  alt={`Car image ${index + 1}`}
                  className="w-full h-24 object-cover rounded-md"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={14} className="text-gray-700" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="flex justify-end">
        <Button
          type="submit"
          isLoading={isLoading}
          disabled={isLoading}
          fullWidth
        >
          {initialValues ? 'Atualizar Veículo' : 'Cadastrar Veículo'}
        </Button>
      </div>
    </form>
  );
};

export default CarForm;