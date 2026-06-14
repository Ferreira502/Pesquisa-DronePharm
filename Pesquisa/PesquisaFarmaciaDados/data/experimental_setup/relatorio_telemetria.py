"""
Relatório Executivo de Telemetria e Viabilidade de Rota
=========================================================

Script modular para:
1. Carregar configurações (settings.json) e a rota (coordenadas.json);
2. Calcular distâncias geodésicas (Haversine), azimutes e impacto do vento
   sobre a velocidade de cruzeiro (ground speed);
3. Estimar tempo de voo, consumo energético, custo financeiro, eficiência
   e margem de bateria (SoC);
4. Gerar um relatório executivo em PDF (reportlab) com dashboard de KPIs,
   tabela detalhada de navegação e rodapé com numeração de páginas.

Autor: Engenharia de Software - Logística Autônoma e Telemetria
"""

from __future__ import annotations

import json
import math
import os
from datetime import datetime
from typing import Any, Dict, List, Tuple

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT

# ---------------------------------------------------------------------------
# Constantes globais
# ---------------------------------------------------------------------------

RAIO_TERRA_KM: float = 6371.0  # Raio médio da Terra utilizado na fórmula de Haversine


# ---------------------------------------------------------------------------
# Carregamento e tratamento de dados
# ---------------------------------------------------------------------------

def carregar_json(caminho: str) -> Dict[str, Any]:
    """Carrega e retorna o conteúdo de um arquivo JSON.

    Args:
        caminho: Caminho absoluto ou relativo para o arquivo JSON.

    Returns:
        Dicionário (ou lista, dependendo da estrutura) com o conteúdo do JSON.

    Raises:
        FileNotFoundError: Se o arquivo não existir no caminho informado.
        ValueError: Se o conteúdo do arquivo não for um JSON válido.
    """
    if not os.path.isfile(caminho):
        raise FileNotFoundError(f"Arquivo não encontrado: '{caminho}'")

    try:
        with open(caminho, "r", encoding="utf-8") as arquivo:
            return json.load(arquivo)
    except json.JSONDecodeError as erro:
        raise ValueError(f"JSON inválido em '{caminho}': {erro}") from erro


def carregar_dados(
    caminho_settings: str, caminho_coordenadas: str
) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    """Carrega e normaliza os dados de configuração e de rota.

    A função aceita tanto o formato "completo" (com chaves financeiras,
    ambientais e elétricas do drone) quanto o formato simplificado já
    presente nos arquivos de exemplo enviados pelo usuário, aplicando
    valores padrão sensatos quando alguma chave não estiver presente.

    Args:
        caminho_settings: Caminho para o arquivo settings.json.
        caminho_coordenadas: Caminho para o arquivo coordenadas.json.

    Returns:
        Uma tupla (configuracoes, pontos_rota), onde:
            - configuracoes é um dicionário já normalizado com todos os
              parâmetros necessários para os cálculos;
            - pontos_rota é uma lista de dicionários no formato
              {"nome": str, "lat": float, "lng": float}.

    Raises:
        FileNotFoundError: Se algum dos arquivos não existir.
        ValueError: Se algum dos arquivos tiver JSON inválido ou a
            estrutura de coordenadas estiver vazia/incompleta.
    """
    settings_bruto = carregar_json(caminho_settings)
    coordenadas_bruto = carregar_json(caminho_coordenadas)

    configuracoes = _normalizar_settings(settings_bruto)
    pontos_rota = _normalizar_coordenadas(coordenadas_bruto)

    if len(pontos_rota) < 2:
        raise ValueError(
            "O arquivo de coordenadas deve conter ao menos 2 pontos para "
            "formar uma rota."
        )

    return configuracoes, pontos_rota


def _normalizar_settings(dados: Dict[str, Any]) -> Dict[str, Any]:
    """Normaliza o dicionário de configurações para um formato único.

    Suporta dois formatos de entrada:
      1. Formato "exemplo" descrito no prompt (chaves diretas, ex.:
         drone.velocidade_cruzeiro_kmh).
      2. Formato "real" enviado pelo usuário (settings.json com a estrutura
         parametros_fisicos_e_operacionais / limites_operacionais, em que
         cada parâmetro é um objeto {"valor": ..., "unidade": ..., ...}).

    Args:
        dados: Dicionário bruto carregado do settings.json.

    Returns:
        Dicionário normalizado contendo as chaves:
            drone: velocidade_cruzeiro_kmh, consumo_nominal_w,
                   capacidade_bateria_wh, tensao_nominal_v
            ambiente: direcao_vento_graus, velocidade_vento_kmh
            financeiro: custo_kwh, taxa_depreciacao_por_voo
    """

    drone_bruto = dados.get("drone", {})
    ambiente_bruto = dados.get("ambiente", dados.get("vento", {}))
    financeiro_bruto = dados.get("financeiro", {})

    # --- Detecta se está no formato "complexo" (com sub-objetos valor/unidade)
    parametros = drone_bruto.get("parametros_fisicos_e_operacionais")

    if parametros:
        # Formato real do usuário: extrai valores numéricos dos sub-objetos.
        def _valor(chave: str, padrao: float) -> float:
            item = parametros.get(chave)
            if isinstance(item, dict):
                return float(item.get("valor", padrao))
            if item is not None:
                return float(item)
            return padrao

        velocidade_kmh = _valor("velocidade_kmh", 36.0)
        consumo_base_wh_km = _valor("consumo_base_wh_km", 15.0)
        autonomia_max_km = _valor("autonomia_max_km", 10.0)

        # Capacidade de bateria estimada a partir da autonomia e do consumo
        # base (Wh/km), já que o formato real não informa Wh diretamente.
        capacidade_bateria_wh = autonomia_max_km * consumo_base_wh_km

        # Consumo nominal em Watts: consumo (Wh/km) * velocidade (km/h)
        # resulta em Wh/h = W.
        consumo_nominal_w = consumo_base_wh_km * velocidade_kmh

        tensao_nominal_v = 22.2  # Valor padrão (não informado no formato real)

        limites_vento = dados.get("vento", {}).get("limites_operacionais", {})

        def _valor_vento(chave: str, padrao: float) -> float:
            item = limites_vento.get(chave)
            if isinstance(item, dict):
                return float(item.get("valor", padrao))
            if item is not None:
                return float(item)
            return padrao

        # O formato real não traz direção/velocidade de vento por voo;
        # assume-se vento nulo (0 km/h) como padrão conservador.
        direcao_vento_graus = float(
            ambiente_bruto.get("direcao_vento_graus", 0.0)
        )
        velocidade_vento_kmh = float(
            ambiente_bruto.get("velocidade_vento_kmh", 0.0)
        )

        custo_kwh = float(financeiro_bruto.get("custo_kwh", 0.85))
        taxa_depreciacao = float(
            financeiro_bruto.get("taxa_depreciacao_por_voo", 5.00)
        )

    else:
        # Formato "exemplo" simplificado, conforme descrito no prompt.
        velocidade_kmh = float(drone_bruto.get("velocidade_cruzeiro_kmh", 50.0))
        consumo_nominal_w = float(drone_bruto.get("consumo_nominal_w", 400.0))
        capacidade_bateria_wh = float(
            drone_bruto.get("capacidade_bateria_wh", 550.0)
        )
        tensao_nominal_v = float(drone_bruto.get("tensao_nominal_v", 22.2))

        direcao_vento_graus = float(
            ambiente_bruto.get("direcao_vento_graus", 0.0)
        )
        velocidade_vento_kmh = float(
            ambiente_bruto.get("velocidade_vento_kmh", 0.0)
        )

        custo_kwh = float(financeiro_bruto.get("custo_kwh", 0.85))
        taxa_depreciacao = float(
            financeiro_bruto.get("taxa_depreciacao_por_voo", 5.00)
        )

    return {
        "drone": {
            "velocidade_cruzeiro_kmh": velocidade_kmh,
            "consumo_nominal_w": consumo_nominal_w,
            "capacidade_bateria_wh": capacidade_bateria_wh,
            "tensao_nominal_v": tensao_nominal_v,
        },
        "ambiente": {
            "direcao_vento_graus": direcao_vento_graus,
            "velocidade_vento_kmh": velocidade_vento_kmh,
        },
        "financeiro": {
            "custo_kwh": custo_kwh,
            "taxa_depreciacao_por_voo": taxa_depreciacao,
        },
    }


def _normalizar_coordenadas(dados: Any) -> List[Dict[str, Any]]:
    """Normaliza a estrutura de coordenadas para uma lista de pontos.

    Suporta dois formatos:
      1. Lista de pontos {"nome": str, "lat": float, "lng": float}
         (formato exemplo do prompt).
      2. Dicionário com a chave "waypoints_json" contendo uma lista de
         objetos {"seq", "latitude", "longitude", "altitude", "label"}
         (formato real enviado pelo usuário).

    Args:
        dados: Conteúdo bruto do coordenadas.json (lista ou dicionário).

    Returns:
        Lista de pontos no formato {"nome": str, "lat": float, "lng": float}.
    """
    if isinstance(dados, list):
        pontos = []
        for item in dados:
            pontos.append(
                {
                    "nome": str(item.get("nome", "Ponto")),
                    "lat": float(item["lat"]),
                    "lng": float(item["lng"]),
                }
            )
        return pontos

    if isinstance(dados, dict) and "waypoints_json" in dados:
        waypoints = sorted(dados["waypoints_json"], key=lambda w: w.get("seq", 0))
        pontos = []
        for wp in waypoints:
            pontos.append(
                {
                    "nome": str(wp.get("label", f"Waypoint {wp.get('seq', '')}")),
                    "lat": float(wp["latitude"]),
                    "lng": float(wp["longitude"]),
                }
            )
        return pontos

    raise ValueError(
        "Formato de coordenadas não reconhecido. Esperado uma lista de "
        "pontos ou um dicionário com a chave 'waypoints_json'."
    )


# ---------------------------------------------------------------------------
# Cálculos geográficos
# ---------------------------------------------------------------------------

def calcular_haversine(
    lat1: float, lng1: float, lat2: float, lng2: float
) -> float:
    """Calcula a distância geodésica entre dois pontos usando Haversine.

    Args:
        lat1: Latitude do ponto de origem (graus decimais).
        lng1: Longitude do ponto de origem (graus decimais).
        lat2: Latitude do ponto de destino (graus decimais).
        lng2: Longitude do ponto de destino (graus decimais).

    Returns:
        Distância entre os dois pontos em quilômetros.
    """
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return RAIO_TERRA_KM * c


def calcular_azimute(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calcula o azimute (rumo) inicial entre dois pontos geográficos.

    O azimute é o ângulo, medido a partir do norte verdadeiro (0°), em
    sentido horário, que indica a direção do ponto de origem para o ponto
    de destino.

    Args:
        lat1: Latitude do ponto de origem (graus decimais).
        lng1: Longitude do ponto de origem (graus decimais).
        lat2: Latitude do ponto de destino (graus decimais).
        lng2: Longitude do ponto de destino (graus decimais).

    Returns:
        Azimute em graus, no intervalo [0, 360).
    """
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_lambda = math.radians(lng2 - lng1)

    x = math.sin(delta_lambda) * math.cos(phi2)
    y = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(
        delta_lambda
    )

    azimute_rad = math.atan2(x, y)
    azimute_graus = (math.degrees(azimute_rad) + 360.0) % 360.0

    return azimute_graus


# ---------------------------------------------------------------------------
# Ajuste de velocidade pelo vento (decomposição vetorial)
# ---------------------------------------------------------------------------

def ajustar_velocidade_vento(
    velocidade_cruzeiro_kmh: float,
    azimute_trecho_graus: float,
    direcao_vento_graus: float,
    velocidade_vento_kmh: float,
) -> float:
    """Calcula a velocidade real em relação ao solo (ground speed).

    Utiliza decomposição vetorial simples: projeta o vetor de vento sobre
    a direção de deslocamento do drone, somando (vento de cauda) ou
    subtraindo (vento de proa) o componente longitudinal da velocidade de
    cruzeiro.

    A direção do vento (direcao_vento_graus) é informada como a direção de
    onde o vento "vem" (convenção meteorológica), portanto seu vetor de
    deslocamento apontará para (direcao_vento_graus + 180°).

    Args:
        velocidade_cruzeiro_kmh: Velocidade de cruzeiro do drone (km/h).
        azimute_trecho_graus: Azimute (rumo) do trecho de voo (graus).
        direcao_vento_graus: Direção de origem do vento (graus, 0 = Norte).
        velocidade_vento_kmh: Velocidade do vento (km/h).

    Returns:
        Velocidade real em relação ao solo (ground speed) em km/h. O valor
        é limitado a um mínimo de 0.1 km/h para evitar tempos de voo
        infinitos em casos extremos de vento de proa muito forte.
    """
    # Vetor de deslocamento do vento (para onde o vento sopra)
    direcao_deslocamento_vento = (direcao_vento_graus + 180.0) % 360.0

    # Ângulo entre a direção de deslocamento do vento e o rumo do drone
    angulo_relativo = math.radians(
        direcao_deslocamento_vento - azimute_trecho_graus
    )

    # Componente do vento na direção de deslocamento do drone
    componente_vento_longitudinal = velocidade_vento_kmh * math.cos(angulo_relativo)

    ground_speed = velocidade_cruzeiro_kmh + componente_vento_longitudinal

    return max(ground_speed, 0.1)


# ---------------------------------------------------------------------------
# Cálculos de telemetria da rota completa
# ---------------------------------------------------------------------------

def calcular_telemetria_rota(
    configuracoes: Dict[str, Any], pontos_rota: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Calcula todas as métricas de telemetria para a rota completa.

    Args:
        configuracoes: Dicionário normalizado de configurações (ver
            `carregar_dados`).
        pontos_rota: Lista de pontos da rota (ver `carregar_dados`).

    Returns:
        Dicionário contendo:
            - "trechos": lista de dicionários com os detalhes de cada
              trecho (origem, destino, distância, azimute, ground speed,
              tempo);
            - "resumo": dicionário com os totais e KPIs da missão
              (distância total, tempo total, consumo, custo, eficiência,
              SoC final, velocidade média efetiva, aviso de segurança).
    """
    drone = configuracoes["drone"]
    ambiente = configuracoes["ambiente"]
    financeiro = configuracoes["financeiro"]

    velocidade_cruzeiro_kmh = drone["velocidade_cruzeiro_kmh"]
    consumo_nominal_w = drone["consumo_nominal_w"]
    capacidade_bateria_wh = drone["capacidade_bateria_wh"]

    direcao_vento_graus = ambiente["direcao_vento_graus"]
    velocidade_vento_kmh = ambiente["velocidade_vento_kmh"]

    custo_kwh = financeiro["custo_kwh"]
    taxa_depreciacao_por_voo = financeiro["taxa_depreciacao_por_voo"]

    trechos: List[Dict[str, Any]] = []
    distancia_total_km = 0.0
    tempo_total_h = 0.0

    for indice in range(len(pontos_rota) - 1):
        origem = pontos_rota[indice]
        destino = pontos_rota[indice + 1]

        distancia_km = calcular_haversine(
            origem["lat"], origem["lng"], destino["lat"], destino["lng"]
        )
        azimute_graus = calcular_azimute(
            origem["lat"], origem["lng"], destino["lat"], destino["lng"]
        )
        ground_speed_kmh = ajustar_velocidade_vento(
            velocidade_cruzeiro_kmh,
            azimute_graus,
            direcao_vento_graus,
            velocidade_vento_kmh,
        )

        tempo_h = distancia_km / ground_speed_kmh

        trechos.append(
            {
                "origem": origem["nome"],
                "destino": destino["nome"],
                "distancia_km": distancia_km,
                "azimute_graus": azimute_graus,
                "ground_speed_kmh": ground_speed_kmh,
                "tempo_h": tempo_h,
                "tempo_min": tempo_h * 60.0,
            }
        )

        distancia_total_km += distancia_km
        tempo_total_h += tempo_h

    # --- Consumo energético total ---
    consumo_total_wh = consumo_nominal_w * tempo_total_h

    # --- Análise financeira ---
    consumo_total_kwh = consumo_total_wh / 1000.0
    custo_energia = consumo_total_kwh * custo_kwh
    custo_total = custo_energia + taxa_depreciacao_por_voo

    # --- Eficiência energética (Wh/km) ---
    eficiencia_wh_km = (
        consumo_total_wh / distancia_total_km if distancia_total_km > 0 else 0.0
    )

    # --- Margem de segurança da bateria (SoC final) ---
    if capacidade_bateria_wh > 0:
        soc_final_percentual = max(
            0.0,
            (1.0 - (consumo_total_wh / capacidade_bateria_wh)) * 100.0,
        )
    else:
        soc_final_percentual = 0.0

    aviso_bateria_baixa = soc_final_percentual < 20.0

    # --- Velocidade média efetiva da missão ---
    velocidade_media_efetiva_kmh = (
        distancia_total_km / tempo_total_h if tempo_total_h > 0 else 0.0
    )

    # --- Status geral de segurança da rota ---
    if aviso_bateria_baixa:
        status_seguranca = "ATENÇÃO: Bateria insuficiente para a rota completa"
    elif soc_final_percentual < 30.0:
        status_seguranca = "ALERTA: Margem de bateria reduzida"
    else:
        status_seguranca = "Rota viável dentro dos parâmetros de segurança"

    resumo = {
        "distancia_total_km": distancia_total_km,
        "tempo_total_h": tempo_total_h,
        "tempo_total_min": tempo_total_h * 60.0,
        "consumo_total_wh": consumo_total_wh,
        "consumo_total_kwh": consumo_total_kwh,
        "custo_energia": custo_energia,
        "taxa_depreciacao_por_voo": taxa_depreciacao_por_voo,
        "custo_total": custo_total,
        "eficiencia_wh_km": eficiencia_wh_km,
        "soc_final_percentual": soc_final_percentual,
        "velocidade_media_efetiva_kmh": velocidade_media_efetiva_kmh,
        "aviso_bateria_baixa": aviso_bateria_baixa,
        "status_seguranca": status_seguranca,
        "capacidade_bateria_wh": capacidade_bateria_wh,
    }

    return {"trechos": trechos, "resumo": resumo}


# ---------------------------------------------------------------------------
# Geração do relatório PDF
# ---------------------------------------------------------------------------

# Paleta de cores corporativa (sóbria: azul-escuro + cinza-claro)
COR_AZUL_ESCURO = colors.HexColor("#1F3A5F")
COR_AZUL_MEDIO = colors.HexColor("#3F6E91")
COR_CINZA_CLARO = colors.HexColor("#F2F4F7")
COR_CINZA_MEDIO = colors.HexColor("#D9DEE4")
COR_TEXTO = colors.HexColor("#2B2B2B")
COR_ALERTA = colors.HexColor("#B3261E")
COR_OK = colors.HexColor("#1E7B45")


def _construir_estilos() -> Dict[str, ParagraphStyle]:
    """Cria e retorna os estilos de parágrafo utilizados no relatório.

    Returns:
        Dicionário {nome_do_estilo: ParagraphStyle}.
    """
    base = getSampleStyleSheet()

    estilos: Dict[str, ParagraphStyle] = {}

    estilos["titulo"] = ParagraphStyle(
        "TituloRelatorio",
        parent=base["Title"],
        fontName="Helvetica-Bold",
        fontSize=18,
        textColor=COR_AZUL_ESCURO,
        alignment=TA_LEFT,
        spaceAfter=4,
    )

    estilos["subtitulo"] = ParagraphStyle(
        "Subtitulo",
        parent=base["Normal"],
        fontName="Helvetica",
        fontSize=9,
        textColor=COR_TEXTO,
        alignment=TA_LEFT,
        spaceAfter=2,
    )

    estilos["secao"] = ParagraphStyle(
        "Secao",
        parent=base["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=13,
        textColor=COR_AZUL_ESCURO,
        spaceBefore=14,
        spaceAfter=8,
    )

    estilos["corpo"] = ParagraphStyle(
        "Corpo",
        parent=base["Normal"],
        fontName="Helvetica",
        fontSize=10,
        textColor=COR_TEXTO,
        leading=14,
    )

    estilos["kpi_label"] = ParagraphStyle(
        "KpiLabel",
        parent=base["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        textColor=colors.white,
        alignment=TA_CENTER,
    )

    estilos["kpi_valor"] = ParagraphStyle(
        "KpiValor",
        parent=base["Normal"],
        fontName="Helvetica-Bold",
        fontSize=14,
        textColor=colors.white,
        alignment=TA_CENTER,
        spaceBefore=2,
    )

    estilos["status_ok"] = ParagraphStyle(
        "StatusOk",
        parent=base["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10.5,
        textColor=COR_OK,
    )

    estilos["status_alerta"] = ParagraphStyle(
        "StatusAlerta",
        parent=base["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10.5,
        textColor=COR_ALERTA,
    )

    return estilos


def _rodape(canvas_obj, doc) -> None:
    """Desenha o rodapé com numeração automática de páginas.

    Args:
        canvas_obj: Objeto canvas do reportlab, fornecido automaticamente
            pelo SimpleDocTemplate.
        doc: Documento sendo renderizado, fornecido automaticamente.
    """
    canvas_obj.saveState()
    canvas_obj.setFont("Helvetica", 8)
    canvas_obj.setFillColor(COR_AZUL_MEDIO)

    largura_pagina, _ = A4
    canvas_obj.drawCentredString(
        largura_pagina / 2.0, 1.2 * cm, f"Página {doc.page}"
    )

    canvas_obj.setStrokeColor(COR_CINZA_MEDIO)
    canvas_obj.line(1.5 * cm, 1.5 * cm, largura_pagina - 1.5 * cm, 1.5 * cm)
    canvas_obj.restoreState()


def _montar_dashboard_kpis(
    resumo: Dict[str, Any], estilos: Dict[str, ParagraphStyle]
) -> Table:
    """Monta a tabela visual do dashboard de KPIs (resumo executivo).

    Args:
        resumo: Dicionário "resumo" retornado por `calcular_telemetria_rota`.
        estilos: Dicionário de estilos de parágrafo.

    Returns:
        Objeto Table do reportlab pronto para ser inserido no documento.
    """
    if resumo["aviso_bateria_baixa"]:
        cor_status = COR_ALERTA
    else:
        cor_status = COR_OK

    kpis = [
        ("Distância Total", f"{resumo['distancia_total_km']:.2f} km"),
        (
            "Tempo Total de Voo",
            f"{resumo['tempo_total_min']:.1f} min",
        ),
        ("Custo Total da Missão", f"R$ {resumo['custo_total']:.2f}"),
        (
            "Bateria Restante (SoC)",
            f"{resumo['soc_final_percentual']:.1f} %",
        ),
    ]

    linha_labels = []
    linha_valores = []

    for label, valor in kpis:
        linha_labels.append(Paragraph(label.upper(), estilos["kpi_label"]))
        linha_valores.append(Paragraph(valor, estilos["kpi_valor"]))

    largura_coluna = (A4[0] - 3 * cm) / 4.0

    tabela_kpis = Table(
        [linha_labels, linha_valores],
        colWidths=[largura_coluna] * 4,
        rowHeights=[0.6 * cm, 0.9 * cm],
    )

    tabela_kpis.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), COR_AZUL_ESCURO),
                ("BACKGROUND", (3, 1), (3, 1), cor_status),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LINEAFTER", (0, 0), (-2, -1), 1, colors.white),
            ]
        )
    )

    return tabela_kpis


def _montar_tabela_navegacao(
    trechos: List[Dict[str, Any]], estilos: Dict[str, ParagraphStyle]
) -> Table:
    """Monta a tabela detalhada de navegação trecho a trecho.

    Args:
        trechos: Lista de trechos retornada por `calcular_telemetria_rota`.
        estilos: Dicionário de estilos de parágrafo.

    Returns:
        Objeto Table do reportlab pronto para ser inserido no documento.
    """
    cabecalho = [
        "Origem ➔ Destino",
        "Dist. (km)",
        "Azimute (°)",
        "Vel. c/ Vento (km/h)",
        "Tempo (min)",
    ]

    dados_tabela: List[List[Any]] = [cabecalho]

    for trecho in trechos:
        rota_texto = f"{trecho['origem']}\n➔ {trecho['destino']}"
        dados_tabela.append(
            [
                Paragraph(rota_texto.replace("\n", "<br/>"), estilos["corpo"]),
                f"{trecho['distancia_km']:.3f}",
                f"{trecho['azimute_graus']:.1f}",
                f"{trecho['ground_speed_kmh']:.2f}",
                f"{trecho['tempo_min']:.2f}",
            ]
        )

    largura_total = A4[0] - 3 * cm
    larguras_colunas = [
        largura_total * 0.40,
        largura_total * 0.15,
        largura_total * 0.15,
        largura_total * 0.15,
        largura_total * 0.15,
    ]

    tabela = Table(dados_tabela, colWidths=larguras_colunas, repeatRows=1)

    estilo_tabela = [
        ("BACKGROUND", (0, 0), (-1, 0), COR_AZUL_ESCURO),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("GRID", (0, 0), (-1, -1), 0.5, COR_CINZA_MEDIO),
    ]

    for indice_linha in range(1, len(dados_tabela)):
        cor_fundo = COR_CINZA_CLARO if indice_linha % 2 == 0 else colors.white
        estilo_tabela.append(
            ("BACKGROUND", (0, indice_linha), (-1, indice_linha), cor_fundo)
        )

    tabela.setStyle(TableStyle(estilo_tabela))
    return tabela


def gerar_pdf(
    caminho_saida: str,
    configuracoes: Dict[str, Any],
    pontos_rota: List[Dict[str, Any]],
    telemetria: Dict[str, Any],
    arquivo_settings: str,
    arquivo_coordenadas: str,
) -> None:
    """Gera o relatório executivo de telemetria em formato PDF.

    Args:
        caminho_saida: Caminho do arquivo PDF a ser gerado.
        configuracoes: Dicionário normalizado de configurações.
        pontos_rota: Lista de pontos da rota.
        telemetria: Dicionário retornado por `calcular_telemetria_rota`
            (contém "trechos" e "resumo").
        arquivo_settings: Nome/caminho do arquivo de configurações utilizado
            (apenas para exibição no cabeçalho do relatório).
        arquivo_coordenadas: Nome/caminho do arquivo de coordenadas
            utilizado (apenas para exibição no cabeçalho do relatório).
    """
    estilos = _construir_estilos()
    resumo = telemetria["resumo"]
    trechos = telemetria["trechos"]

    documento = SimpleDocTemplate(
        caminho_saida,
        pagesize=A4,
        leftMargin=1.5 * cm,
        rightMargin=1.5 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.8 * cm,
        title="Relatório Executivo de Telemetria e Viabilidade de Rota",
    )

    elementos: List[Any] = []

    # --- Cabeçalho ---
    elementos.append(
        Paragraph(
            "Relatório Executivo de Telemetria e Viabilidade de Rota",
            estilos["titulo"],
        )
    )

    data_geracao = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    elementos.append(
        Paragraph(f"Data e hora de geração: {data_geracao}", estilos["subtitulo"])
    )
    elementos.append(
        Paragraph(
            f"Arquivo de configurações: <b>{os.path.basename(arquivo_settings)}</b> "
            f"&nbsp;|&nbsp; Arquivo de rota: "
            f"<b>{os.path.basename(arquivo_coordenadas)}</b>",
            estilos["subtitulo"],
        )
    )
    elementos.append(Spacer(1, 6))
    elementos.append(
        HRFlowable(width="100%", thickness=1.2, color=COR_AZUL_ESCURO)
    )
    elementos.append(Spacer(1, 12))

    # --- Dashboard de KPIs ---
    elementos.append(Paragraph("Resumo Executivo (KPIs)", estilos["secao"]))
    elementos.append(_montar_dashboard_kpis(resumo, estilos))
    elementos.append(Spacer(1, 4))

    estilo_status = (
        estilos["status_alerta"]
        if resumo["aviso_bateria_baixa"]
        else estilos["status_ok"]
    )
    elementos.append(Spacer(1, 6))
    elementos.append(
        Paragraph(f"Status de Segurança: {resumo['status_seguranca']}", estilo_status)
    )

    if resumo["aviso_bateria_baixa"]:
        elementos.append(
            Paragraph(
                "AVISO DE SEGURANÇA: a bateria estimada ao final da missão "
                "está abaixo do limiar mínimo recomendado de 20%. "
                "Recomenda-se revisar a rota, reduzir o número de paradas "
                "ou planejar pontos de recarga intermediários.",
                estilos["corpo"],
            )
        )

    elementos.append(Spacer(1, 10))

    # --- Métricas adicionais ---
    elementos.append(Paragraph("Métricas Operacionais Adicionais", estilos["secao"]))

    dados_metricas = [
        ["Indicador", "Valor"],
        [
            "Eficiência Energética",
            f"{resumo['eficiencia_wh_km']:.2f} Wh/km",
        ],
        [
            "Velocidade Média Efetiva da Missão",
            f"{resumo['velocidade_media_efetiva_kmh']:.2f} km/h",
        ],
        [
            "Consumo Total de Energia",
            f"{resumo['consumo_total_wh']:.2f} Wh "
            f"({resumo['consumo_total_kwh']:.4f} kWh)",
        ],
        [
            "Custo de Energia",
            f"R$ {resumo['custo_energia']:.2f}",
        ],
        [
            "Taxa de Depreciação por Voo",
            f"R$ {resumo['taxa_depreciacao_por_voo']:.2f}",
        ],
        [
            "Capacidade Total da Bateria",
            f"{resumo['capacidade_bateria_wh']:.2f} Wh",
        ],
    ]

    largura_total = A4[0] - 3 * cm
    tabela_metricas = Table(
        dados_metricas,
        colWidths=[largura_total * 0.6, largura_total * 0.4],
    )
    tabela_metricas.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), COR_AZUL_ESCURO),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9.5),
                ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("GRID", (0, 0), (-1, -1), 0.5, COR_CINZA_MEDIO),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, COR_CINZA_CLARO]),
            ]
        )
    )
    elementos.append(tabela_metricas)
    elementos.append(Spacer(1, 10))

    # --- Tabela detalhada de navegação ---
    elementos.append(
        Paragraph("Detalhamento da Rota de Navegação", estilos["secao"])
    )
    elementos.append(_montar_tabela_navegacao(trechos, estilos))

    documento.build(elementos, onFirstPage=_rodape, onLaterPages=_rodape)


# ---------------------------------------------------------------------------
# Execução principal
# ---------------------------------------------------------------------------

def main() -> None:
    """Função principal: orquestra carregamento, cálculo e geração do PDF."""

    # 1. Descobre o diretório onde este script .py está salvo
    diretorio_atual = os.path.dirname(os.path.abspath(__file__))

    # 2. Monta os caminhos dinamicamente na mesma pasta do script
    caminho_settings = os.path.join(diretorio_atual, "settings.json")
    caminho_coordenadas = os.path.join(diretorio_atual, "coordenadas.json")
    caminho_saida_pdf = os.path.join(diretorio_atual, "relatorio_telemetria_rota.pdf")

    try:
        configuracoes, pontos_rota = carregar_dados(
            caminho_settings, caminho_coordenadas
        )
    except (FileNotFoundError, ValueError) as erro:
        print(f"Erro ao carregar dados: {erro}")
        return

    telemetria = calcular_telemetria_rota(configuracoes, pontos_rota)

    # Cria a pasta de saída caso ela não exista (não será estritamente necessário
    # se o PDF for salvo na mesma pasta do script, mas é uma boa prática manter)
    os.makedirs(os.path.dirname(caminho_saida_pdf), exist_ok=True)

    try:
        gerar_pdf(
            caminho_saida_pdf,
            configuracoes,
            pontos_rota,
            telemetria,
            caminho_settings,
            caminho_coordenadas,
        )
    except Exception as erro:  # noqa: BLE001 - relatório de erro amigável
        print(f"Erro ao gerar o PDF: {erro}")
        return

    resumo = telemetria["resumo"]
    print("Relatório gerado com sucesso em:", caminho_saida_pdf)
    print(f"Distância total: {resumo['distancia_total_km']:.2f} km")
    print(f"Tempo total: {resumo['tempo_total_min']:.1f} min")
    print(f"Custo total: R$ {resumo['custo_total']:.2f}")
    print(f"SoC final estimado: {resumo['soc_final_percentual']:.1f} %")
    if resumo["aviso_bateria_baixa"]:
        print("AVISO: SoC final abaixo de 20% - revisar viabilidade da rota.")


if __name__ == "__main__":
    main()
