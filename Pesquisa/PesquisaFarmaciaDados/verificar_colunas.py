
import pandas as pd

df = pd.read_excel('dados_com_coordenadas.xlsx')
print("Nomes exatos das colunas na sua planilha:")
print(list(df.columns))