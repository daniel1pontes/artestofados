import { useState } from "react";

export default function UsersTest() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
          <p className="text-gray-600">Gerencie os usuários do sistema</p>
        </div>
        <button className="flex items-center space-x-2 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
          Novo Usuário
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-8 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Página de Teste
          </h3>
          <p className="text-gray-600">
            Se você consegue ver esta mensagem, a rota está funcionando.
          </p>
          <p className="text-sm text-gray-500 mt-2">Search: {search}</p>
          <p className="text-sm text-gray-500">Page: {page}</p>
        </div>
      </div>
    </div>
  );
}
