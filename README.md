# Pesquisa-DronePharm

Repositorio principal do projeto DronePharm, reunindo o sistema de entrega de medicamentos por drones e a pesquisa de dados usada para apoiar o estudo de localizacao, geocodificacao e visualizacao de farmacias.

O projeto esta organizado como um monorepo simples: backend, frontend e materiais de pesquisa ficam no mesmo repositorio para facilitar versionamento, apresentacao e reproducao dos experimentos.

## Estrutura geral

```text
Pesquisa-DronePharm/
|-- Back-End/
|   `-- DronePharm/
|-- Front-End/
|   `-- DronePharmFrontEnd/
|-- Pesquisa/
|   `-- PesquisaFarmaciaDados/
|-- .gitignore
`-- README.md
```

## Back-End/DronePharm

Contem o backend do DronePharm. E a parte responsavel por regras de negocio, roteirizacao, simulacao, persistencia e exposicao da API.

Principais responsabilidades:

- Receber e gerenciar pedidos de entrega de medicamentos.
- Calcular rotas para drones usando algoritmos de otimizacao.
- Validar restricoes como capacidade, autonomia, vento e prioridade.
- Registrar dados em banco e consultar historico operacional.
- Expor endpoints REST com FastAPI.
- Enviar dados de telemetria e status em tempo real via WebSocket.
- Simular voos para testar o fluxo sem depender de hardware fisico.

Pastas importantes dentro do backend:

- `algorithms/`: algoritmos de roteirizacao e otimizacao, como Clarke-Wright, algoritmo genetico, 2-opt, custo e distancia.
- `apis/`: integracoes externas, como clima e elevacao.
- `bd/`: configuracao de banco, modelos ORM e repositorios de acesso a dados.
- `communication/`: comunicacao com sistemas externos/embarcados, incluindo MAVLink.
- `config/`: configuracoes centrais do backend.
- `constraints/`: verificadores de restricoes da rota e do drone.
- `domain/`: definicoes de dominio, como estados de pedido.
- `models/`: modelos de dominio usados pela logica e pelos algoritmos.
- `replanning/`: monitoramento e replanejamento de rotas.
- `server/`: aplicacao FastAPI, rotas, schemas, middlewares, seguranca, servicos e WebSockets.
- `simulation/`: simulador de voo.
- `tests/`: testes automatizados do backend.
- `view/`: scripts de visualizacao local.
- `docker/` e `docker-compose.yml`: suporte para execucao em container.

Consulte tambem `Back-End/DronePharm/Readme.md` para detalhes de configuracao, endpoints e execucao.

## Front-End/DronePharmFrontEnd

Contem a interface web do DronePharm. E um projeto React + TypeScript + Vite voltado para operacao, acompanhamento e visualizacao dos dados expostos pelo backend.

Principais responsabilidades:

- Exibir o dashboard da operacao.
- Gerenciar pedidos, drones e farmacias.
- Consultar rotas, historico e indicadores.
- Acompanhar monitoramento e telemetria.
- Consumir a API REST e os fluxos de dados do backend.

Pastas importantes dentro do frontend:

- `src/api/`: clientes e funcoes de integracao com a API.
- `src/components/`: componentes reutilizaveis de layout e interface.
- `src/features/`: telas e funcionalidades principais, separadas por dominio.
- `src/features/drones/`: cadastro, listagem e componentes ligados aos drones.
- `src/features/farmacias/`: cadastro e listagem de farmacias.
- `src/features/management/`: gestao de pedidos e paginas administrativas.
- `src/features/monitoring/`: dashboard de monitoramento, mapa, telemetria e replay.
- `src/features/kpis/`: indicadores e cards de desempenho.
- `src/styles/`: tokens, design system e estilos globais.
- `src/types/`: tipos TypeScript compartilhados.
- `public/`: arquivos publicos estaticos.
- `src/docs/`: documentacao auxiliar, especificacoes e arquivos de referencia.

Consulte tambem `Front-End/DronePharmFrontEnd/README.md` para detalhes do projeto Vite/React.

## Pesquisa/PesquisaFarmaciaDados

Contem os arquivos de pesquisa usados para levantar, conferir e visualizar dados de farmacias. Essa parte apoia a construcao do cenario do DronePharm, principalmente na etapa de localizacao geografica dos pontos de entrega e analise espacial.

O foco da pesquisa e:

- Trabalhar com uma base de farmacias e enderecos.
- Geocodificar enderecos para obter latitude e longitude.
- Conferir coordenadas usando OpenStreetMap/Nominatim.
- Gerar planilhas com coordenadas e resultados de conferencia.
- Criar mapa interativo dos pontos.
- Incluir um deposito central de referencia para analise das conexoes entre origem e farmacias.

Arquivos principais:

- `plotar_mapa.py`: le uma planilha de entrada, geocodifica enderecos, adiciona o deposito central, salva `dados_com_coordenadas.xlsx` e gera um mapa interativo em HTML. Tambem tenta exportar o mapa para PDF quando Selenium, Pillow e Chromedriver estao disponiveis.
- `conferencia.py`: abre `dados_com_coordenadas.xlsx`, consulta novamente os enderecos no OpenStreetMap e cria `resultado_conferencia.xlsx` com coordenadas encontradas e diferencas em relacao as coordenadas originais.
- `verificar_colunas.py`: imprime os nomes exatos das colunas da planilha para ajudar a ajustar os scripts.
- `dados_com_coordenadas.xlsx`: planilha com os dados geocodificados.
- `resultado_conferencia.xlsx`: planilha gerada pela conferencia das coordenadas.

Observacao: a pasta `venv/` da pesquisa e ignorada pelo Git. Ambientes virtuais devem ser recriados localmente quando necessario.

## Como executar

### Backend

```bash
cd Back-End/DronePharm
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn server.app:app --reload --host 0.0.0.0 --port 8000
```

Tambem ha suporte a Docker via `docker-compose.yml` dentro da pasta do backend.

### Frontend

```bash
cd Front-End/DronePharmFrontEnd
npm install
npm run dev
```

### Pesquisa

```bash
cd Pesquisa/PesquisaFarmaciaDados
python -m venv venv
source venv/bin/activate
pip install pandas openpyxl geopy folium selenium pillow
python plotar_mapa.py entrada.xlsx
```

Para conferir as coordenadas geradas:

```bash
python conferencia.py
```

## Observacoes de versionamento

- O repositorio principal controla backend, frontend e pesquisa juntos.
- As pastas internas de backend e frontend nao devem ter `.git` proprio dentro deste monorepo.
- Dependencias instaladas localmente, ambientes virtuais e caches nao devem ser commitados.
- O arquivo `.gitignore` da raiz ignora `venv/`, `.venv/`, `__pycache__/`, arquivos `.pyc`, `node_modules/`, `.env` e arquivos temporarios comuns.
