"""
Requisitos:
    pip install pandas openpyxl geopy folium selenium pillow --break-system-packages
    (selenium + pillow + um chromedriver são necessários apenas para gerar o PDF)

Uso:
    python plotar_mapa.py entrada.xlsx
"""

import sys
import time
import json
import os
import pandas as pd
from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter
import folium


ARQUIVO_ENTRADA = sys.argv[1] if len(sys.argv) > 1 else "entrada.xlsx"
ARQUIVO_CACHE = "geocode_cache.json"
ARQUIVO_MAPA_HTML = "mapa_pontos.html"
ARQUIVO_MAPA_PDF = "mapa_pontos.pdf"

TILE_STYLE = "cartodbpositron"

DEPOSITO_CENTRAL = {
    "Farmácia": "DROGARIA ARAUJO S A",
    "Endereço": "AVENIDA DO CONTORNO, 6714",
    "Bairro": "LOURDES",
    "Cidade": "Belo Horizonte",
    "Estado": "MG",
    "Latitude": -19.9391827,
    "Longitude": -43.9416411,
}


def carregar_dados(caminho):
    if caminho.lower().endswith((".xlsx", ".xls")):
        df = pd.read_excel(caminho)
    else:
        df = pd.read_csv(caminho)

    colunas_necessarias = ["Endereço", "Bairro", "Cidade", "Estado"]
    for col in colunas_necessarias:
        if col not in df.columns:
            raise ValueError(f"Coluna obrigatória '{col}' não encontrada no arquivo.")

    df = df.dropna(subset=["Endereço", "Cidade"]).reset_index(drop=True)
    return df


def carregar_cache():
    if os.path.exists(ARQUIVO_CACHE):
        with open(ARQUIVO_CACHE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def salvar_cache(cache):
    with open(ARQUIVO_CACHE, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)


def montar_endereco_completo(row):
    partes = [
        str(row["Endereço"]).strip(),
        str(row["Bairro"]).strip() if pd.notna(row["Bairro"]) else "",
        str(row["Cidade"]).strip(),
        str(row["Estado"]).strip(),
        "Brasil",
    ]
    return ", ".join([p for p in partes if p])


def adicionar_deposito(df, cache):
    endereco_completo = montar_endereco_completo(pd.Series(DEPOSITO_CENTRAL))
    cache[endereco_completo] = [DEPOSITO_CENTRAL["Latitude"], DEPOSITO_CENTRAL["Longitude"]]
    salvar_cache(cache)

    coluna_nome = "Farmácia" if "Farmácia" in df.columns else df.columns[1]

    df = df[df[coluna_nome] != DEPOSITO_CENTRAL["Farmácia"]].reset_index(drop=True)

    nova_linha = {col: DEPOSITO_CENTRAL.get(col) for col in df.columns}
    df = pd.concat([df, pd.DataFrame([nova_linha])], ignore_index=True)
    return df


def geocodificar_dados(df):
    cache = carregar_cache()

    geolocator = Nominatim(user_agent="relatorio_pontos_mapa")
    geocode = RateLimiter(geolocator.geocode, min_delay_seconds=1)

    latitudes, longitudes, enderecos_completos = [], [], []

    for idx, row in df.iterrows():
        endereco_completo = montar_endereco_completo(row)
        endereco_busca = f"{row['Bairro']}, {row['Cidade']}, {row['Estado']}, Brasil" \
            if pd.notna(row["Bairro"]) else f"{row['Cidade']}, {row['Estado']}, Brasil"

        if endereco_completo in cache:
            lat, lon = cache[endereco_completo]
        else:
            lat, lon = None, None
            for tentativa in (endereco_completo, endereco_busca):
                try:
                    location = geocode(tentativa, timeout=10)
                except Exception as e:
                    print(f"  [erro] {tentativa}: {e}")
                    location = None

                if location:
                    lat, lon = location.latitude, location.longitude
                    break
                time.sleep(0.5)

            cache[endereco_completo] = [lat, lon]
            salvar_cache(cache)

        status = "OK" if lat is not None else "NÃO ENCONTRADO"
        print(f"[{idx+1}/{len(df)}] {endereco_completo} -> {status}")

        latitudes.append(lat)
        longitudes.append(lon)
        enderecos_completos.append(endereco_completo)

    df = df.copy()
    df["Latitude"] = latitudes
    df["Longitude"] = longitudes
    df["EnderecoCompleto"] = enderecos_completos

    return df


def criar_mapa(df):
    df_validos = df.dropna(subset=["Latitude", "Longitude"])

    if df_validos.empty:
        raise ValueError("Nenhum endereço foi geocodificado com sucesso.")

    centro_lat = df_validos["Latitude"].mean()
    centro_lon = df_validos["Longitude"].mean()

    mapa = folium.Map(
        location=[centro_lat, centro_lon],
        zoom_start=12,
        tiles=TILE_STYLE,
        control_scale=True,
    )

    coluna_nome = "Farmácia" if "Farmácia" in df_validos.columns else df_validos.columns[1]

    nome_deposito = DEPOSITO_CENTRAL["Farmácia"]

    linha_deposito = df_validos[df_validos[coluna_nome] == nome_deposito]
    coords_deposito = None
    if not linha_deposito.empty:
        r = linha_deposito.iloc[0]
        coords_deposito = (r["Latitude"], r["Longitude"])

    for _, row in df_validos.iterrows():
        nome = row.get(coluna_nome, "")
        is_deposito = nome == nome_deposito

        popup_html = f"""
        <div style="font-family: Arial, sans-serif; font-size: 13px; max-width: 220px;">
            <b>{nome}</b>{' (Depósito Central)' if is_deposito else ''}<br>
            {row['Endereço']}<br>
            {row['Bairro']} - {row['Cidade']}/{row['Estado']}
        </div>
        """

        if is_deposito:
            folium.Marker(
                location=[row["Latitude"], row["Longitude"]],
                popup=folium.Popup(popup_html, max_width=250),
                tooltip=nome,
                icon=folium.Icon(color="red", icon="warehouse", prefix="fa"),
            ).add_to(mapa)
        else:
            folium.CircleMarker(
                location=[row["Latitude"], row["Longitude"]],
                radius=6,
                color="#2c3e50",
                weight=1,
                fill=True,
                fill_color="#3498db",
                fill_opacity=0.85,
                popup=folium.Popup(popup_html, max_width=250),
                tooltip=nome,
            ).add_to(mapa)

            if coords_deposito is not None:
                folium.PolyLine(
                    locations=[coords_deposito, (row["Latitude"], row["Longitude"])],
                    color="#7f8c8d",
                    weight=1.5,
                    opacity=0.6,
                    dash_array="4,6",
                ).add_to(mapa)

    sw = df_validos[["Latitude", "Longitude"]].min().values.tolist()
    ne = df_validos[["Latitude", "Longitude"]].max().values.tolist()
    mapa.fit_bounds([sw, ne], padding=(30, 30))

    mapa.save(ARQUIVO_MAPA_HTML)
    print(f"\nMapa interativo salvo em: {ARQUIVO_MAPA_HTML}")

    n_invalidos = len(df) - len(df_validos)
    if n_invalidos:
        print(f"Atenção: {n_invalidos} endereço(s) não foram geocodificados e ficaram de fora do mapa.")

    return mapa, df_validos


def exportar_pdf(html_path, pdf_path):
    try:
        from selenium import webdriver
        from selenium.webdriver.chrome.options import Options
    except ImportError:
        print("\n[Aviso] Selenium não instalado. Pulei a exportação para PDF.")
        print("Instale com: pip install selenium pillow --break-system-packages")
        print("e tenha o Chromium/Chromedriver disponível no sistema.")
        return

    try:
        from PIL import Image
    except ImportError:
        print("\n[Aviso] Pillow não instalado. Pulei a exportação para PDF.")
        print("Instale com: pip install pillow --break-system-packages")
        return

    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--window-size=1400,1000")
    options.add_argument("--no-sandbox")

    try:
        driver = webdriver.Chrome(options=options)
    except Exception as e:
        print(f"\n[Aviso] Não foi possível iniciar o Chrome/Chromedriver: {e}")
        print("Pulei a exportação para PDF.")
        return

    abs_path = "file://" + os.path.abspath(html_path)
    driver.get(abs_path)
    time.sleep(2)  # aguarda carregar os tiles do mapa

    png_temp = "_mapa_temp.png"
    driver.save_screenshot(png_temp)
    driver.quit()

    imagem = Image.open(png_temp).convert("RGB")
    imagem.save(pdf_path, "PDF", resolution=150.0)
    os.remove(png_temp)

    print(f"Mapa em PDF salvo em: {pdf_path}")


if __name__ == "__main__":
    print(f"Carregando dados de '{ARQUIVO_ENTRADA}'...")
    df = carregar_dados(ARQUIVO_ENTRADA)

    print(f"\nGeocodificando {len(df)} endereços (pode demorar alguns minutos)...")
    cache = carregar_cache()
    df = adicionar_deposito(df, cache)
    df_geo = geocodificar_dados(df)

    # Salva tabela com coordenadas para conferência/uso posterior
    df_geo.to_excel("dados_com_coordenadas.xlsx", index=False)
    print("\nTabela com coordenadas salva em: dados_com_coordenadas.xlsx")

    print("\nCriando mapa...")
    criar_mapa(df_geo)

    print("\nGerando PDF do mapa...")
    exportar_pdf(ARQUIVO_MAPA_HTML, ARQUIVO_MAPA_PDF)

    print("\nConcluído!")