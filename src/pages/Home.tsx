import React from 'react';
import { Link } from 'react-router-dom';
import { Car, Users, Calendar, Shield, Star } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import Button from '../components/ui/Button';
import CarCard from '../components/cars/CarCard';
import { mockCars } from '../data/mockData';

const Home: React.FC = () => {
  const featuredCars = mockCars.slice(0, 3);
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-24 bg-gradient-to-r from-blue-900 to-indigo-900 text-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                Alugue o carro perfeito de pessoas reais
              </h1>
              <p className="text-lg text-blue-100">
                Conectamos proprietários de carros com pessoas que precisam de um veículo. 
                Descubra uma nova maneira de alugar, mais pessoal e econômica.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link to="/cars">
                  <Button size="lg" className="w-full sm:w-auto">
                    Encontrar um carro
                  </Button>
                </Link>
                <Link to="/owner/register">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto border-white text-white hover:bg-white hover:text-blue-900">
                    Anunciar meu carro
                  </Button>
                </Link>
              </div>
            </div>
            <div className="hidden md:block">
              <img 
                src="https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1" 
                alt="Carro para aluguel" 
                className="rounded-lg shadow-2xl object-cover h-96 w-full transform hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>
        </div>
      </section>
      
      {/* Search Section */}
      <section className="py-8 bg-white">
        <div className="container mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-6 -mt-16 relative z-10 mx-auto max-w-4xl">
            <form className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Onde
                </label>
                <input
                  type="text"
                  placeholder="Cidade, estado ou endereço"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    De
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Até
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  &nbsp;
                </label>
                <Button type="submit" fullWidth>
                  Buscar carros
                </Button>
              </div>
            </form>
          </div>
        </div>
      </section>
      
      {/* Featured Cars Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Carros em Destaque</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Descubra alguns dos melhores veículos disponíveis para aluguel em nossa plataforma.
              Escolha entre diversas categorias e preços.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredCars.map(car => (
              <CarCard key={car.id} car={car} />
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Link to="/cars">
              <Button variant="outline">
                Ver todos os carros
              </Button>
            </Link>
          </div>
        </div>
      </section>
      
      {/* How It Works Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Como Funciona</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Alugar ou anunciar um carro é simples e seguro com nossa plataforma.
              Siga os passos abaixo para começar.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-blue-50 p-8 rounded-lg">
              <h3 className="text-xl font-semibold mb-6 text-blue-900 flex items-center">
                <Users className="mr-2 text-blue-700" />
                Para quem quer alugar
              </h3>
              
              <div className="space-y-6">
                <div className="flex">
                  <div className="bg-blue-700 text-white rounded-full w-8 h-8 flex items-center justify-center shrink-0 mt-1">1</div>
                  <div className="ml-4">
                    <h4 className="font-medium text-gray-900">Busque o carro ideal</h4>
                    <p className="text-gray-600 mt-1">Pesquise por localização, datas e filtros específicos para encontrar o veículo perfeito para você.</p>
                  </div>
                </div>
                
                <div className="flex">
                  <div className="bg-blue-700 text-white rounded-full w-8 h-8 flex items-center justify-center shrink-0 mt-1">2</div>
                  <div className="ml-4">
                    <h4 className="font-medium text-gray-900">Faça sua reserva</h4>
                    <p className="text-gray-600 mt-1">Escolha as datas e envie sua solicitação de reserva ao proprietário do veículo.</p>
                  </div>
                </div>
                
                <div className="flex">
                  <div className="bg-blue-700 text-white rounded-full w-8 h-8 flex items-center justify-center shrink-0 mt-1">3</div>
                  <div className="ml-4">
                    <h4 className="font-medium text-gray-900">Retire o veículo</h4>
                    <p className="text-gray-600 mt-1">Encontre o proprietário, verifique o carro e saia dirigindo com tranquilidade.</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-8">
                <Link to="/register">
                  <Button variant="primary" fullWidth>
                    Quero alugar um carro
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="bg-red-50 p-8 rounded-lg">
              <h3 className="text-xl font-semibold mb-6 text-red-900 flex items-center">
                <Car className="mr-2 text-red-600" />
                Para proprietários
              </h3>
              
              <div className="space-y-6">
                <div className="flex">
                  <div className="bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center shrink-0 mt-1">1</div>
                  <div className="ml-4">
                    <h4 className="font-medium text-gray-900">Cadastre seu veículo</h4>
                    <p className="text-gray-600 mt-1">Crie um anúncio detalhado com fotos e informações sobre seu carro.</p>
                  </div>
                </div>
                
                <div className="flex">
                  <div className="bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center shrink-0 mt-1">2</div>
                  <div className="ml-4">
                    <h4 className="font-medium text-gray-900">Receba solicitações</h4>
                    <p className="text-gray-600 mt-1">Aprove ou recuse pedidos de reserva de acordo com sua disponibilidade.</p>
                  </div>
                </div>
                
                <div className="flex">
                  <div className="bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center shrink-0 mt-1">3</div>
                  <div className="ml-4">
                    <h4 className="font-medium text-gray-900">Entregue e receba seu carro</h4>
                    <p className="text-gray-600 mt-1">Encontre o locatário, entregue as chaves e receba seu pagamento.</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-8">
                <Link to="/owner/register">
                  <Button variant="danger" fullWidth>
                    Quero anunciar meu carro
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Benefits Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Por que escolher nossa plataforma?</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Oferecemos uma experiência de aluguel de carros diferenciada, com benefícios tanto para locatários quanto para proprietários.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="text-blue-700" size={28} />
              </div>
              <h3 className="font-semibold text-lg mb-2">Segurança Garantida</h3>
              <p className="text-gray-600">
                Verificamos todos os usuários e oferecemos proteção completa durante o aluguel.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="text-green-700" size={28} />
              </div>
              <h3 className="font-semibold text-lg mb-2">Flexibilidade</h3>
              <p className="text-gray-600">
                Escolha a duração exata do aluguel, de algumas horas a vários meses.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow text-center">
              <div className="bg-yellow-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="text-yellow-700" size={28} />
              </div>
              <h3 className="font-semibold text-lg mb-2">Avaliações Verificadas</h3>
              <p className="text-gray-600">
                Confie nas avaliações reais de outros usuários antes de alugar ou aprovar uma reserva.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Car className="text-purple-700" size={28} />
              </div>
              <h3 className="font-semibold text-lg mb-2">Variedade de Carros</h3>
              <p className="text-gray-600">
                Encontre desde carros econômicos até veículos de luxo para qualquer ocasião.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Testimonials Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">O que nossos usuários dizem</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Veja as experiências de pessoas que já utilizaram nossa plataforma para alugar ou disponibilizar seus carros.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="flex items-center mb-4">
                <img 
                  src="https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=300" 
                  alt="Usuário" 
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="ml-4">
                  <h4 className="font-medium">João Silva</h4>
                  <div className="flex items-center mt-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star key={star} size={14} className="text-yellow-500 fill-yellow-500" />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-gray-600 italic">
                "Como proprietário, estou muito satisfeito com o serviço. Consigo uma renda extra com meu carro que ficava parado na garagem durante a semana."
              </p>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="flex items-center mb-4">
                <img 
                  src="https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=300" 
                  alt="Usuário" 
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="ml-4">
                  <h4 className="font-medium">Maria Souza</h4>
                  <div className="flex items-center mt-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star key={star} size={14} className={`${star <= 4 ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-gray-600 italic">
                "Aluguei um carro para uma viagem de fim de semana e foi perfeito! Processo simples e preço muito mais acessível que as locadoras tradicionais."
              </p>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="flex items-center mb-4">
                <img 
                  src="https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=300" 
                  alt="Usuário" 
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="ml-4">
                  <h4 className="font-medium">Carlos Oliveira</h4>
                  <div className="flex items-center mt-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star key={star} size={14} className={`${star <= 5 ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-gray-600 italic">
                "Excelente experiência! O proprietário foi muito atencioso e o carro estava em perfeitas condições. Com certeza voltarei a utilizar o serviço."
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-900 to-indigo-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Pronto para começar?</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Junte-se a milhares de usuários que já estão aproveitando uma nova forma de alugar carros.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="lg" className="w-full sm:w-auto">
                Criar uma conta
              </Button>
            </Link>
            <Link to="/cars">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-white text-white hover:bg-white hover:text-blue-900">
                Explorar carros
              </Button>
            </Link>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default Home;