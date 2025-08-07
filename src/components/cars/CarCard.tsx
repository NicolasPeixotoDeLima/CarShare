import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, MapPin, Users, Calendar, Tangent as GasTank, Heart } from 'lucide-react';
import { Car } from '../../types';

interface CarCardProps {
  car: Car;
}

const CarCard: React.FC<CarCardProps> = ({ car }) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorite(!isFavorite);
  };

  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prevIndex) => 
      prevIndex === car.images.length - 1 ? 0 : prevIndex + 1
    );
  };

  const prevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prevIndex) => 
      prevIndex === 0 ? car.images.length - 1 : prevIndex - 1
    );
  };

  return (
    <Link
      to={`/cars/${car.id}`}
      className="group bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300"
    >
      <div className="relative">
        {/* Car Image */}
        <div className="relative h-48 overflow-hidden">
          <img
            src={car.images[currentImageIndex]}
            alt={`${car.make} ${car.model}`}
            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
          />
          
          {/* Image Navigation */}
          {car.images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
              <button
                onClick={nextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </>
          )}
          
          {/* Favorite Button */}
          <button
            onClick={toggleFavorite}
            className="absolute top-2 right-2 bg-white rounded-full p-1.5 shadow-md"
          >
            <Heart
              size={18}
              className={`${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-500'}`}
            />
          </button>
        </div>
        
        {/* Car Details */}
        <div className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-semibold text-lg text-gray-900 mb-1">
                {car.make} {car.model}
              </h3>
              <div className="flex items-center text-sm text-gray-600 mb-1">
                <MapPin size={14} className="mr-1" />
                <span>{car.location}</span>
              </div>
            </div>
            <div className="flex items-center">
              <Star size={16} className="text-yellow-500 mr-1" />
              <span className="font-medium">{car.rating.toFixed(1)}</span>
              <span className="text-gray-500 text-sm ml-1">({car.reviewCount})</span>
            </div>
          </div>
          
          {/* Car Features */}
          <div className="grid grid-cols-3 gap-2 my-3">
            <div className="flex items-center text-gray-600 text-sm">
              <Calendar size={14} className="mr-1" />
              <span>{car.year}</span>
            </div>
            <div className="flex items-center text-gray-600 text-sm">
              <Users size={14} className="mr-1" />
              <span>{car.seats} lugares</span>
            </div>
            <div className="flex items-center text-gray-600 text-sm">
              <GasTank size={14} className="mr-1" />
              <span>{car.fuelType === 'gasoline' ? 'Gasolina' : 
                    car.fuelType === 'diesel' ? 'Diesel' : 
                    car.fuelType === 'electric' ? 'Elétrico' : 'Híbrido'}</span>
            </div>
          </div>
          
          {/* Divider */}
          <div className="border-t border-gray-100 my-3"></div>
          
          {/* Price */}
          <div className="flex justify-between items-center">
            <div>
              <span className="font-bold text-xl text-gray-900">R${car.price}</span>
              <span className="text-gray-600 text-sm">/dia</span>
            </div>
            <button className="bg-red-500 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-red-600 transition-colors">
              Ver detalhes
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default CarCard;