import pandas as pd
from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter
import time

# 1. Carregar o arquivo Excel
# Substitua pelo nome correto do seu arquivo
df = pd.read_excel('dados_com_coordenadas.xlsx')

# 2. Inicializar o geocodificador do OpenStreetMap
# O parâmetro user_agent é obrigatório (identifica sua aplicação)
geolocator = Nominatim(user_agent="conferencia_farmacias_app")

# Adicionar um limitador de taxa (1 segundo de intervalo) para respeitar os limites do servidor OSM
geocode = RateLimiter(geolocator.geocode, min_delay_seconds=1.0)

# Criar colunas para armazenar o resultado da conferência
df['OSM_Latitude'] = None
df['OSM_Longitude'] = None
df['Diferenca_Lat'] = None
df['Diferenca_Lon'] = None

# 3. Iterar sobre as linhas da planilha (verificando as 300+ farmácias)
print("Iniciando verificação no OpenStreetMap...")
for index, row in df.iterrows():
    endereco_completo = row['EnderecoCompleto'] # Usa a coluna de endereço completo
    
    try:
        # Consulta o endereço no OpenStreetMap
        location = geocode(endereco_completo)
        
        if location:
            # Salva a coordenada encontrada pelo site
            df.at[index, 'OSM_Latitude'] = location.latitude
            df.at[index, 'OSM_Longitude'] = location.longitude
            
            # Calcula a diferença em relação à coordenada original
            # Assumindo que suas colunas originais se chamam 'Latitude' e 'Longitude'
            df.at[index, 'Diferenca_Lat'] = abs(row['Latitude'] - location.latitude)
            df.at[index, 'Diferenca_Lon'] = abs(row['Longitude'] - location.longitude)
        else:
            print(f"Endereço não encontrado: {endereco_completo}")
            
    except Exception as e:
        print(f"Erro ao consultar linha {index}: {e}")
        time.sleep(2) # Pausa extra em caso de falha de conexão

# 4. Salvar o resultado com as novas colunas de conferência
df.to_excel('resultado_conferencia.xlsx', index=False)
print("Conferência finalizada! Arquivo 'resultado_conferencia.xlsx' salvo com sucesso.")