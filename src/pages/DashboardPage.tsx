import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Car, Calendar, CreditCard, Bell, Plus, User } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { mockCars, mockBookings } from '../data/mockData';
import { Car as CarType, Booking } from '../types';
import { format } from 'date-fns';

const DashboardPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [userCars, setUserCars] = useState<CarType[]>([]);
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (currentUser) {
      setLoading(true);
      
      // Simulate API call
      setTimeout(() => {
        if (currentUser.role === 'owner') {
          // Get cars owned by this user
          const cars = mockCars.filter(car => car.ownerId === currentUser.id);
          setUserCars(cars);
        }
        
        // Get bookings for this user (as renter or owner)
        if (currentUser.role === 'renter') {
          const bookings = mockBookings.filter(booking => booking.renterId === currentUser.id);
          setUserBookings(bookings);
        } else {
          // For owners, get bookings for their cars
          const ownerCarIds = mockCars
            .filter(car => car.ownerId === currentUser.id)
            .map(car => car.id);
          
          const bookings = mockBookings.filter(booking => 
            ownerCarIds.includes(booking.carId)
          );
          setUserBookings(bookings);
        }
        
        setLoading(false);
      }, 1000);
    }
  }, [currentUser]);
  
  if (!currentUser) {
    return null;
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow pt-24 pb-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
            <p className="text-gray-600">
              Bem-vindo(a), {currentUser.name}. Gerencie suas {currentUser.role === 'owner' ? 'listagens e reservas' : 'reservas'}.
            </p>
          </div>
          
          {/* Dashboard Tabs */}
          <div className="bg-white rounded-lg shadow-md mb-8 overflow-hidden">
            <div className="flex border-b border-gray-200">
              <button className="px-6 py-4 text-red-600 border-b-2 border-red-600 font-medium">
                Dashboard
              </button>
              <button className="px-6 py-4 text-gray-600 hover:text-gray-900">
                Perfil
              </button>
              {currentUser.role === 'owner' && (
                <button className="px-6 py-4 text-gray-600 hover:text-gray-900">
                  Meus Carros
                </button>
              )}
              <button className="px-6 py-4 text-gray-600 hover:text-gray-900">
                Reservas
              </button>
            </div>
            
            <div className="p-6">
              {/* User Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-blue-50 p-6 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">
                        {currentUser.role === 'owner' ? 'Carros Cadastrados' : 'Carros Alugados'}
                      </p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {currentUser.role === 'owner' ? userCars.length : userBookings.length}
                      </p>
                    </div>
                    <div className="bg-blue-100 p-3 rounded-full">
                      <Car className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-green-50 p-6 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600 font-medium">Reservas Ativas</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {userBookings.filter(b => b.status === 'confirmed').length}
                      </p>
                    </div>
                    <div className="bg-green-100 p-3 rounded-full">
                      <Calendar className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-purple-50 p-6 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-600 font-medium">
                        {currentUser.role === 'owner' ? 'Ganhos Totais' : 'Gastos Totais'}
                      </p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        R${userBookings.reduce((sum, booking) => sum + booking.totalPrice, 0)}
                      </p>
                    </div>
                    <div className="bg-purple-100 p-3 rounded-full">
                      <CreditCard className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-yellow-50 p-6 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-yellow-600 font-medium">Notificações</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">3</p>
                    </div>
                    <div className="bg-yellow-100 p-3 rounded-full">
                      <Bell className="h-6 w-6 text-yellow-600" />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Owner Section */}
              {currentUser.role === 'owner' && (
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Meus Carros</h2>
                    <Link to="/owner/add-car">
                      <Button
                        variant="outline"
                        leftIcon={<Plus size={16} />}
                      >
                        Adicionar Carro
                      </Button>
                    </Link>
                  </div>
                  
                  {userCars.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {userCars.map(car => (
                        <div key={car.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                          <div className="relative h-40">
                            <img
                              src={car.images[0]}
                              alt={car.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                            <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
                              <h3 className="text-white font-medium">{car.make} {car.model}</h3>
                              <span className="bg-white text-gray-900 text-sm font-bold px-2 py-1 rounded">
                                R${car.price}/dia
                              </span>
                            </div>
                          </div>
                          <div className="p-4">
                            <div className="flex justify-between items-center mb-2">
                              <div className="flex items-center text-sm text-gray-600">
                                <Calendar size={14} className="mr-1" />
                                <span>{car.year}</span>
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <User size={14} className="mr-1" />
                                <span>{car.seats} lugares</span>
                              </div>
                            </div>
                            <div className="flex mt-4">
                              <Link to={`/owner/edit-car/${car.id}`} className="text-blue-600 text-sm mr-4 hover:text-blue-800">
                                Editar
                              </Link>
                              <Link to={`/cars/${car.id}`} className="text-gray-600 text-sm hover:text-gray-800">
                                Ver anúncio
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-6 rounded-lg text-center">
                      <Car className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum carro cadastrado</h3>
                      <p className="text-gray-600 mb-4">
                        Comece a ganhar dinheiro alugando seu carro quando não estiver usando.
                      </p>
                      <Link to="/owner/add-car">
                        <Button
                          variant="primary"
                          leftIcon={<Plus size={16} />}
                        >
                          Adicionar Carro
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )}
              
              {/* Recent Bookings */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  {currentUser.role === 'owner' ? 'Reservas Recentes' : 'Minhas Reservas'}
                </h2>
                
                {userBookings.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Carro
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Período
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Valor
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {userBookings.map(booking => {
                          const bookedCar = mockCars.find(c => c.id === booking.carId);
                          
                          return (
                            <tr key={booking.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="h-10 w-10 flex-shrink-0">
                                    <img 
                                      className="h-10 w-10 rounded-full object-cover" 
                                      src={bookedCar?.images[0]} 
                                      alt={bookedCar?.make} 
                                    />
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">
                                      {bookedCar?.make} {bookedCar?.model}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {bookedCar?.year}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {format(new Date(booking.startDate), 'dd/MM/yyyy')}
                                </div>
                                <div className="text-sm text-gray-500">
                                  até {format(new Date(booking.endDate), 'dd/MM/yyyy')}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  R${booking.totalPrice}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  booking.status === 'confirmed' ? 'bg-green-100 text-green-800' : 
                                  booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  booking.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {booking.status === 'confirmed' ? 'Confirmada' : 
                                   booking.status === 'pending' ? 'Pendente' :
                                   booking.status === 'completed' ? 'Concluída' : 'Cancelada'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <Link to={`/bookings/${booking.id}`} className="text-blue-600 hover:text-blue-900">
                                  Detalhes
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-6 rounded-lg text-center">
                    <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma reserva encontrada</h3>
                    <p className="text-gray-600 mb-4">
                      {currentUser.role === 'owner' 
                        ? 'Ainda não há reservas para seus carros.'
                        : 'Você ainda não fez nenhuma reserva.'}
                    </p>
                    {currentUser.role === 'renter' && (
                      <Link to="/cars">
                        <Button
                          variant="primary"
                        >
                          Explorar carros disponíveis
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default DashboardPage;