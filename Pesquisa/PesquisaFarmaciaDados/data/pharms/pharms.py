import os
import pandas as pd
from pathlib import Path

def consolidar_planilhas(pasta_input, arquivo_output="consolidado_farmacias.xlsx"):
    """
    Consolida todas as tabelas .xlsx de uma pasta em um único arquivo,
    adicionando as colunas 'Município' (extraído do nome do arquivo) e 'UF' (fixo como 'MG').
    """
    caminho_pasta = Path(pasta_input)

    # Lista para armazenar os DataFrames de cada arquivo
    lista_dataframes = []

    # Buscar todos os arquivos .xlsx na pasta
    arquivos_xlsx = list(caminho_pasta.glob("*.xlsx"))

    if not arquivos_xlsx:
        print(f"Nenhum arquivo .xlsx encontrado na pasta: {caminho_pasta.absolute()}")
        return

    print(f"Encontrados {len(arquivos_xlsx)} arquivos para processar.")

    for arquivo in arquivos_xlsx:
        # Ignorar o arquivo de saída caso ele já exista na mesma pasta
        if arquivo.name == arquivo_output:
            continue

        try:
            # Ler a planilha Excel
            df = pd.read_excel(arquivo)

            # Verificar se a planilha não está vazia
            if df.empty:
                print(f"Aviso: O arquivo '{arquivo.name}' está vazio e será ignorado.")
                continue

            # Extrair o nome do município (remove a extensão .xlsx)
            municipio = arquivo.stem

            # Adicionar as novas colunas
            df['Município'] = municipio
            df['UF'] = 'MG'

            # Garantir a presença e ordem das colunas principais (opcional)
            colunas_obrigatorias = ['CNPJ', 'Farmácia', 'Endereço', 'Bairro', 'Município', 'UF']
            for col in colunas_obrigatorias:
                if col not in df.columns:
                    df[col] = None  # Cria a coluna vazia se a original não existir

            # Mantém apenas as colunas relevantes na ordem certa
            df = df[colunas_obrigatorias]

            lista_dataframes.append(df)
            print(f"Processado com sucesso: {arquivo.name} -> Município: {municipio}")

        except Exception as e:
            print(f"Erro ao processar o arquivo {arquivo.name}: {e}")

    if lista_dataframes:
        # Concatenar todos os DataFrames da lista
        df_consolidado = pd.concat(lista_dataframes, ignore_index=True)

        # Salvar o resultado final em um novo arquivo Excel
        caminho_saida = caminho_pasta / arquivo_output
        df_consolidado.to_excel(caminho_saida, index=False)
        print(f"\nSucesso! Arquivo consolidado salvo em: {caminho_saida.absolute()}")
    else:
        print("\nNenhum dado válido foi extraído para consolidação.")

if __name__ == "__main__":
    # O ponto "." significa que o script vai procurar as planilhas na mesma pasta onde ele está salvo
    PASTA_DAS_PLANILHAS = "./downloads_farmacias"
    ARQUIVO_FINAL = "consolidado_farmacias.xlsx"

    consolidar_planilhas(PASTA_DAS_PLANILHAS, ARQUIVO_FINAL)