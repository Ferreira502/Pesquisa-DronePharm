import pandas as pd
from geopy.geocoders import Nominatim
import time


def geocodificar_farmacias(arquivo_entrada, arquivo_saida):
    print(f"Lendo o arquivo: {arquivo_entrada}")

    try:
        # Lemos o arquivo garantindo que o CNPJ continue como texto
        df = pd.read_excel(arquivo_entrada, dtype={'CNPJ': str})
    except FileNotFoundError:
        print(f"Erro: O arquivo '{arquivo_entrada}' não foi encontrado.")
        return

    # Cria uma coluna com o endereço completo para melhorar a precisão da busca
    # Formato ideal: "Rua X, Bairro, Municipio - UF, Brasil"
    df['Endereco_Busca'] = (
            df['Endereço'].astype(str) + ", " +
            df['Bairro'].astype(str) + ", " +
            df['Município'].astype(str) + " - " +
            df['UF'].astype(str) + ", Brasil"
    )

    # Inicializa o geolocalizador do OpenStreetMap (Nominatim)
    # A API exige um 'user_agent' descritivo da aplicação que está fazendo as requisições
    geolocator = Nominatim(user_agent="drone_routing_logistics_app")

    latitudes = []
    longitudes = []

    total = len(df)
    print(f"Iniciando geocodificação de {total} endereços. Isso pode levar alguns minutos...\n")

    for index, row in df.iterrows():
        endereco = row['Endereco_Busca']
        print(f"[{index + 1}/{total}] Buscando: {endereco}")

        try:
            # REGRA DE OURO DO NOMINATIM: Máximo de 1 requisição por segundo.
            # O time.sleep(1.2) garante que seu IP não seja banido temporariamente pelo servidor deles.
            time.sleep(1.2)

            # Realiza a busca com um timeout razoável para evitar travamentos
            location = geolocator.geocode(endereco, timeout=10)

            if location:
                latitudes.append(location.latitude)
                longitudes.append(location.longitude)
                print(f"    -> Encontrado: {location.latitude}, {location.longitude}")
            else:
                latitudes.append(None)
                longitudes.append(None)
                print("    -> Coordenada não encontrada. (O endereço pode estar incompleto)")

        except Exception as e:
            print(f"    -> Erro na requisição (Timeout ou Falha de Rede): {e}")
            latitudes.append(None)
            longitudes.append(None)

    # Adiciona as novas colunas espaciais ao DataFrame original
    df['Latitude'] = latitudes
    df['Longitude'] = longitudes

    # Remove a coluna temporária de busca para deixar a tabela de saída limpa
    df = df.drop(columns=['Endereco_Busca'])

    # Salva o resultado no formato Excel
    with pd.ExcelWriter(arquivo_saida, engine='openpyxl') as writer:
        df.to_excel(writer, index=False)

    print(f"\nFinalizado com sucesso! Planilha gerada: {arquivo_saida}")


if __name__ == "__main__":
    # Nome da planilha que geramos no passo anterior
    ARQUIVO_INPUT = "consolidado_farmacias.xlsx"

    # Nome da nova planilha que conterá as coordenadas
    ARQUIVO_OUTPUT = "farmacias_com_coordenadas.xlsx"

    geocodificar_farmacias(ARQUIVO_INPUT, ARQUIVO_OUTPUT)