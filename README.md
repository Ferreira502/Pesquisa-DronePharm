# Pesquisa DronePharm

Repositorio de pesquisa do projeto DronePharm, preparado para acompanhar um artigo sobre roteirizacao de entregas de medicamentos por drone e por transporte urbano em Belo Horizonte, MG.

O repositorio inclui dados de farmacias cadastradas a partir do site do Governo Federal, geocodificacao com OpenStreetMap/Nominatim, rotas terrestres tracadas com dados do OpenStreetMap via OSRM, rota de drone por waypoints geograficos, mapas HTML, GeoJSON, relatorios JSON e relatorios PDF.

## Resultado principal

| Modo | Distancia | Tempo de deslocamento | Tempo total | Observacoes |
| --- | ---: | ---: | ---: | --- |
| Transporte urbano | 65,603 km | 108,82 min | 168,81 min | inclui 60 min de servico |
| Drone | 34,6513 km | 67,75 min | 67,75 min | rota viavel, carga de 4,82 kg |

Resumo comparativo:

- reducao de distancia: 30,9517 km;
- reducao percentual: 47,18%;
- energia estimada do drone: 895,56 Wh;
- combustivel urbano estimado: 6,56 L;
- custo urbano estimado com combustivel: R$ 40,67;
- emissao urbana estimada: 15,154 kg CO2.

Fonte do resumo: [resumo_comparativo.json](Pesquisa/PesquisaFarmaciaDados/mapa_rotas_comparadas/saida/resumo_comparativo.json)

## Fontes de dados

As farmacias foram cadastradas a partir de dados obtidos no site do Governo Federal. As planilhas baixadas por municipio estao em: [downloads_farmacias/](Pesquisa/PesquisaFarmaciaDados/data/pharms/downloads_farmacias/)

Arquivos derivados das farmacias:

| Arquivo | Conteudo |
| --- | --- |
| [consolidado_farmacias.xlsx](Pesquisa/PesquisaFarmaciaDados/data/pharms/consolidado_farmacias.xlsx) | planilha consolidada das farmacias por municipio |
| [farmacias_com_coordenadas.xlsx](Pesquisa/PesquisaFarmaciaDados/data/pharms/farmacias_com_coordenadas.xlsx) | farmacias com latitude e longitude |
| [dados_com_coordenadas(Sheet1).csv](Pesquisa/PesquisaFarmaciaDados/dados_com_coordenadas%28Sheet1%29.csv) | base CSV usada nos scripts de rota |
| [farmacias_processadas.csv](Pesquisa/PesquisaFarmaciaDados/saida_rotas_pedidos/farmacias_processadas.csv) | farmacias filtradas para o experimento |

Os pedidos usados no cenario estao em: [pedidos_belo_horizonte.csv](Pesquisa/PesquisaFarmaciaDados/pedidos_belo_horizonte.csv)

O OpenStreetMap foi usado para geocodificar enderecos, exibir mapas de base e tracar rotas terrestres sobre a malha viaria. A consulta de rota terrestre foi feita pelo OSRM.

## Codigos das rotas

| Arquivo | Funcao |
| --- | --- |
| [pharms.py](Pesquisa/PesquisaFarmaciaDados/data/pharms/pharms.py) | consolida as planilhas de farmacias baixadas por municipio |
| [cords.py](Pesquisa/PesquisaFarmaciaDados/data/pharms/cords.py) | geocodifica farmacias usando Nominatim/OpenStreetMap |
| [gerar_rotas_farmacias.py](Pesquisa/PesquisaFarmaciaDados/gerar_rotas_farmacias.py) | gera rotas entre farmacias e pedidos, exportando JSON, GeoJSON e HTML |
| [gerar_transporte_urbano.py](Pesquisa/PesquisaFarmaciaDados/gerar_transporte_urbano.py) | calcula rota urbana com OSRM Trip API e gera mapas/relatorios |
| [plot_rota.py](Pesquisa/PesquisaFarmaciaDados/data/plot_rota.py) | gera mapas da rota de drone em diferentes camadas |
| [relatorio_telemetria.py](Pesquisa/PesquisaFarmaciaDados/data/experimental_setup/relatorio_telemetria.py) | gera relatorio PDF de telemetria da rota de drone |
| [gerar_mapa_comparativo.py](Pesquisa/PesquisaFarmaciaDados/mapa_rotas_comparadas/gerar_mapa_comparativo.py) | gera mapa e GeoJSON comparando rota urbana e rota de drone |
| [codigos_reaproveitados/](Pesquisa/PesquisaFarmaciaDados/mapa_rotas_comparadas/codigos_reaproveitados/) | scripts reaproveitados como referencia da comparacao |

## Arquivos gerados

### Rotas farmacia-pedidos

Pasta: [saida_rotas_pedidos/](Pesquisa/PesquisaFarmaciaDados/saida_rotas_pedidos/)

| Arquivo | Conteudo |
| --- | --- |
| [rotas_farmacias.json](Pesquisa/PesquisaFarmaciaDados/saida_rotas_pedidos/rotas_farmacias.json) | dados completos das rotas entre farmacias e pedidos |
| [rotas_farmacias.geojson](Pesquisa/PesquisaFarmaciaDados/saida_rotas_pedidos/rotas_farmacias.geojson) | geometrias em formato GIS |
| [rotas_farmacias_mapa.html](Pesquisa/PesquisaFarmaciaDados/saida_rotas_pedidos/rotas_farmacias_mapa.html) | mapa interativo |
| [farmacias_processadas.csv](Pesquisa/PesquisaFarmaciaDados/saida_rotas_pedidos/farmacias_processadas.csv) | farmacias usadas na geracao |

Resumo das 5 farmacias selecionadas:

| Farmacia | Latitude | Longitude | Rotas | Distancia total | Tempo total |
| --- | ---: | ---: | ---: | ---: | ---: |
| AG FARMA LTDA - ME | -19,9162884 | -43,9378304 | 20 | 65,602 km | 108,83 min |
| ALFENAS E OLIVEIRA DROGARIA E PERFUMARIA LTDA | -19,8861502 | -43,9002370 | 20 | 181,952 km | 278,06 min |
| AMC DROGARIA LTDA - ME | -19,9186817 | -43,8785493 | 20 | 195,353 km | 291,45 min |
| APOLITANA FERNANDA GONCALVES | -19,9569769 | -43,9541110 | 20 | 118,094 km | 190,40 min |
| AVANTE FORMULA LTDA - ME | -19,8736074 | -43,9197268 | 20 | 178,513 km | 264,69 min |

### Transporte urbano

Pasta: [saida_transporte_urbano/](Pesquisa/PesquisaFarmaciaDados/saida_transporte_urbano/)

| Arquivo | Conteudo |
| --- | --- |
| [relatorio_rota_urbana.json](Pesquisa/PesquisaFarmaciaDados/saida_transporte_urbano/relatorio_rota_urbana.json) | metricas, paradas, pernas e geometria da rota urbana |
| [rota_urbana.geojson](Pesquisa/PesquisaFarmaciaDados/saida_transporte_urbano/rota_urbana.geojson) | geometria da rota urbana |
| [relatorio_transporte_urbano.pdf](Pesquisa/PesquisaFarmaciaDados/saida_transporte_urbano/relatorio_transporte_urbano.pdf) | relatorio executivo |
| [mapa_terrestre_osm.html](Pesquisa/PesquisaFarmaciaDados/saida_transporte_urbano/mapa_terrestre_osm.html) | mapa com camada OpenStreetMap |
| [mapa_terrestre_claro.html](Pesquisa/PesquisaFarmaciaDados/saida_transporte_urbano/mapa_terrestre_claro.html) | mapa com camada clara |
| [mapa_terrestre_ruas.html](Pesquisa/PesquisaFarmaciaDados/saida_transporte_urbano/mapa_terrestre_ruas.html) | mapa com camada de ruas |
| [mapa_terrestre_satelite.html](Pesquisa/PesquisaFarmaciaDados/saida_transporte_urbano/mapa_terrestre_satelite.html) | mapa com camada de satelite |

Base urbana:

| Campo | Valor |
| --- | --- |
| Farmacia | AG FARMA LTDA - ME |
| Logradouro | RIO DE JANEIRO |
| Latitude | -19,9162884 |
| Longitude | -43,9378304 |

Metricas urbanas:

| Metrica | Valor |
| --- | ---: |
| Entregas | 20 |
| Distancia | 65,603 km |
| Tempo dirigindo | 108,82 min |
| Tempo de servico | 60,00 min |
| Tempo total | 168,81 min |
| Velocidade media | 36,17 km/h |
| Combustivel estimado | 6,56 L |
| Custo estimado | R$ 40,67 |
| CO2 estimado | 15,154 kg |

Pernas registradas no relatorio urbano:

| Seq. | Destino | Rua | Distancia | Tempo |
| ---: | --- | --- | ---: | ---: |
| 1 | pedido_1 | Avenida Afonso Pena | 1,448 km | 2,61 min |
| 2 | pedido_2 | Rua da Bahia | 1,278 km | 2,19 min |
| 3 | pedido_3 | Avenida do Contorno | 3,038 km | 5,71 min |
| 4 | pedido_4 | Rua Rio de Janeiro | 1,060 km | 1,93 min |
| 5 | pedido_5 | Avenida Amazonas | 2,529 km | 4,78 min |
| 6 | pedido_6 | Rua dos Tupis | 1,298 km | 2,18 min |
| 7 | pedido_7 | Rua Curitiba | 1,000 km | 1,69 min |
| 8 | pedido_8 | Avenida Cristovao Colombo | 2,730 km | 4,40 min |
| 9 | pedido_9 | Rua dos Goitacazes | 2,051 km | 3,49 min |
| 10 | pedido_10 | Avenida Prudente de Morais | 3,775 km | 6,46 min |
| 11 | pedido_11 | Rua Padre Eustaquio | 5,216 km | 8,16 min |
| 12 | pedido_12 | Avenida Silva Lobo | 5,934 km | 9,84 min |
| 13 | pedido_13 | Rua Platina | 4,676 km | 6,74 min |
| 14 | pedido_14 | Avenida Nossa Senhora do Carmo | 4,582 km | 7,04 min |
| 15 | pedido_15 | Rua Itajuba | 3,062 km | 5,25 min |
| 16 | pedido_16 | Avenida Antonio Carlos | 8,031 km | 12,78 min |
| 17 | pedido_17 | Rua Jacui | 4,630 km | 6,67 min |
| 18 | pedido_18 | Avenida Raja Gabaglia | 6,811 km | 11,94 min |
| 19 | pedido_19 | Rua Carijos | 0,962 km | 2,26 min |
| 20 | pedido_20 | Avenida Bias Fortes | 1,491 km | 2,71 min |

### Rota de drone

Arquivos principais:

| Arquivo | Conteudo |
| --- | --- |
| [coordenadas.json](Pesquisa/PesquisaFarmaciaDados/data/experimental_setup/coordenadas.json) | waypoints, carga, energia, custo e viabilidade |
| [relatorio_telemetria_rota.pdf](Pesquisa/PesquisaFarmaciaDados/data/experimental_setup/relatorio_telemetria_rota.pdf) | relatorio de telemetria |
| [rota_drone_openstreetmap.html](Pesquisa/PesquisaFarmaciaDados/data/rota_drone_openstreetmap.html) | mapa com OpenStreetMap |
| [rota_drone_satelite_esri.html](Pesquisa/PesquisaFarmaciaDados/data/rota_drone_satelite_esri.html) | mapa com satelite |
| [rota_drone_cartodb_positron.html](Pesquisa/PesquisaFarmaciaDados/data/rota_drone_cartodb_positron.html) | mapa com CartoDB Positron |
| [rota_drone_cartodb_voyager.html](Pesquisa/PesquisaFarmaciaDados/data/rota_drone_cartodb_voyager.html) | mapa com CartoDB Voyager |
| [rota_drone_mapas.pdf](Pesquisa/PesquisaFarmaciaDados/data/rota_drone_mapas.pdf) | mapas da rota em PDF |
| [rotasDrone/](Pesquisa/PesquisaFarmaciaDados/rotasDrone/) | copias dos relatorios e mapas PDF |

Metricas da rota de drone:

| Metrica | Valor |
| --- | ---: |
| Drone | DP-067 |
| Pedidos | 20 |
| Distancia | 34,6513 km |
| Tempo | 67,75 min |
| Energia | 895,56 Wh |
| Carga | 4,82 kg |
| Custo calculado | 7,4373488303617235 |
| Viavel | true |
| Status | calculada |

Waypoints da rota de drone:

| Seq. | Ponto | Latitude | Longitude |
| ---: | --- | ---: | ---: |
| 0 | Farmacia Popular Central - BH | -19,927800000000000 | -43,941600000000000 |
| 1 | Pedido #40 | -19,919483726154883 | -43,938615270418350 |
| 2 | Pedido #57 | -19,917620483165702 | -43,939528170462815 |
| 3 | Pedido #42 | -19,918264538170295 | -43,940782614835920 |
| 4 | Pedido #45 | -19,920578416382906 | -43,941286374158210 |
| 5 | Pedido #43 | -19,916835274609184 | -43,947361825190450 |
| 6 | Pedido #47 | -19,914862507361940 | -43,944905172638140 |
| 7 | Pedido #44 | -19,913427681540828 | -43,942713508214695 |
| 8 | Pedido #55 | -19,886731540286174 | -43,928164730518420 |
| 9 | Pedido #54 | -19,869284615730482 | -43,963817250481940 |
| 10 | Pedido #49 | -19,907451836204714 | -43,970618452930180 |
| 11 | Pedido #51 | -19,922738154607280 | -43,967140285719640 |
| 12 | Pedido #37 | -19,924546633388367 | -43,991457695771370 |
| 13 | Pedido #50 | -19,936170452819365 | -43,977283615024860 |
| 14 | Pedido #56 | -19,957183604715830 | -43,965372840615930 |
| 15 | Pedido #52 | -19,952641380274915 | -43,938174620583716 |
| 16 | Pedido #48 | -19,941386205718462 | -43,951274608315730 |
| 17 | Pedido #41 | -19,932874165308743 | -43,944128536709215 |
| 18 | Pedido #46 | -19,935682174509317 | -43,927514836205470 |
| 19 | Pedido #53 | -19,930482715603947 | -43,921735184620570 |
| 20 | Pedido #39 | -19,924057381245670 | -43,935237184562915 |
| 21 | Farmacia Popular Central - BH | -19,927800000000000 | -43,941600000000000 |

### Mapa comparativo

Pasta: [mapa_rotas_comparadas/](Pesquisa/PesquisaFarmaciaDados/mapa_rotas_comparadas/)

| Arquivo | Conteudo |
| --- | --- |
| [mapa_drone_urbano.html](Pesquisa/PesquisaFarmaciaDados/mapa_rotas_comparadas/saida/mapa_drone_urbano.html) | mapa unico comparando rota urbana e rota de drone |
| [rotas_drone_urbano.geojson](Pesquisa/PesquisaFarmaciaDados/mapa_rotas_comparadas/saida/rotas_drone_urbano.geojson) | geometrias das duas rotas e dos pontos |
| [resumo_comparativo.json](Pesquisa/PesquisaFarmaciaDados/mapa_rotas_comparadas/saida/resumo_comparativo.json) | metricas finais da comparacao |
| [relatorio_rota_urbana.json](Pesquisa/PesquisaFarmaciaDados/mapa_rotas_comparadas/dados_entrada/relatorio_rota_urbana.json) | entrada urbana usada na comparacao |
| [rota_urbana.geojson](Pesquisa/PesquisaFarmaciaDados/mapa_rotas_comparadas/dados_entrada/rota_urbana.geojson) | geometria urbana usada na comparacao |
| [coordenadas_drone.json](Pesquisa/PesquisaFarmaciaDados/mapa_rotas_comparadas/dados_entrada/coordenadas_drone.json) | entrada da rota de drone usada na comparacao |

## Pontos de entrega

| Pedido | Rua | Latitude | Longitude |
| --- | --- | ---: | ---: |
| pedido_1 | Avenida Afonso Pena | -19,924057381245670 | -43,935237184562915 |
| pedido_2 | Rua da Bahia | -19,919483726154883 | -43,938615270418350 |
| pedido_3 | Avenida do Contorno | -19,932874165308743 | -43,944128536709215 |
| pedido_4 | Rua Rio de Janeiro | -19,918264538170295 | -43,940782614835920 |
| pedido_5 | Avenida Amazonas | -19,916835274609184 | -43,947361825190450 |
| pedido_6 | Rua dos Tupis | -19,913427681540828 | -43,942713508214695 |
| pedido_7 | Rua Curitiba | -19,920578416382906 | -43,941286374158210 |
| pedido_8 | Avenida Cristovao Colombo | -19,935682174509317 | -43,927514836205470 |
| pedido_9 | Rua dos Goitacazes | -19,914862507361940 | -43,944905172638140 |
| pedido_10 | Avenida Prudente de Morais | -19,941386205718462 | -43,951274608315730 |
| pedido_11 | Rua Padre Eustaquio | -19,907451836204714 | -43,970618452930180 |
| pedido_12 | Avenida Silva Lobo | -19,936170452819365 | -43,977283615024860 |
| pedido_13 | Rua Platina | -19,922738154607280 | -43,967140285719640 |
| pedido_14 | Avenida Nossa Senhora do Carmo | -19,952641380274915 | -43,938174620583716 |
| pedido_15 | Rua Itajuba | -19,930482715603947 | -43,921735184620570 |
| pedido_16 | Avenida Antonio Carlos | -19,869284615730482 | -43,963817250481940 |
| pedido_17 | Rua Jacui | -19,886731540286174 | -43,928164730518420 |
| pedido_18 | Avenida Raja Gabaglia | -19,957183604715830 | -43,965372840615930 |
| pedido_19 | Rua Carijos | -19,917620483165702 | -43,939528170462815 |
| pedido_20 | Avenida Bias Fortes | -19,926174350284620 | -43,937184205731945 |
