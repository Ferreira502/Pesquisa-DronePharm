"""
Gera rotas de farmacias de Belo Horizonte ate pontos aleatorios de entrega.

Fluxo principal:
1. Le um CSV com farmacias.
2. Filtra Belo Horizonte ou Regiao Metropolitana.
3. Geocodifica linhas sem latitude/longitude usando Nominatim, se necessario.
4. Gera pontos aleatorios dentro de um retangulo geografico configuravel.
5. Consulta rotas de carro na API publica do OSRM.
6. Exporta resultados em JSON, GeoJSON e mapa HTML.

Dependencias sugeridas:
    pip install pandas requests geopy folium

Exemplo de uso:
    python gerar_rotas_farmacias.py ^
        --input "dados_com_coordenadas(Sheet1).csv" ^
        --output-dir "saida_rotas" ^
        --num-pontos 10 ^
        --max-farmacias 5

Exemplo de chamada da API do OSRM usada pelo script:
    http://router.project-osrm.org/route/v1/driving/-43.9378,-19.9162;-43.9500,-19.9200?overview=full&geometries=geojson
"""

from __future__ import annotations

import argparse
import json
import random
import time
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import folium
import pandas as pd
import requests
from geopy.extra.rate_limiter import RateLimiter
from geopy.geocoders import Nominatim


OSRM_BASE_URL = "http://router.project-osrm.org/route/v1/driving"
DEFAULT_BH_BOUNDS = {
    "min_lat": -20.05,
    "max_lat": -19.75,
    "min_lon": -44.10,
    "max_lon": -43.85,
}
RMBH_CIDADES = {
    "belo horizonte",
    "contagem",
    "betim",
    "nova lima",
    "ribeirao das neves",
    "santa luzia",
    "ibirite",
    "sabará",
    "sabara",
    "vespasiano",
    "lagoa santa",
    "confins",
    "matozinhos",
    "sao jose da lapa",
    "são josé da lapa",
    "juatuba",
    "mateus leme",
    "sao joaquim de bicas",
    "são joaquim de bicas",
    "itatiaiucu",
    "igarape",
    "igarapé",
    "sarzedo",
    "esmeraldas",
    "brumadinho",
    "florestal",
    "rio manso",
    "taquaracu de minas",
    "taquaraçu de minas",
    "raposos",
    "caete",
    "caeté",
    "capim branco",
    "pedro leopoldo",
    "rio acima",
    "baldim",
    "nova uniao",
    "nova união",
    "ravena",
}


@dataclass
class PharmacyRecord:
    source_index: int
    name: str
    address: str
    bairro: str
    city: str
    state: str
    full_address: str
    latitude: float
    longitude: float


@dataclass
class DeliveryPointRecord:
    point_id: str
    order_id: str
    street_name: str
    latitude: float
    longitude: float


def normalize_text(value: Any) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    if not text:
        return ""
    return "".join(
        ch for ch in unicodedata.normalize("NFKD", text) if not unicodedata.combining(ch)
    ).lower()


def detect_csv_kwargs(csv_path: Path) -> dict[str, Any]:
    sample = csv_path.read_bytes()[:4096]
    for encoding in ("utf-8", "latin1", "cp1252"):
        try:
            decoded = sample.decode(encoding)
            break
        except UnicodeDecodeError:
            decoded = None
    if decoded is None:
        raise UnicodeDecodeError("utf-8", b"", 0, 1, "Nao foi possivel detectar a codificacao")

    delimiter = ";"
    if decoded.count(";") < decoded.count(","):
        delimiter = ","

    return {
        "encoding": encoding,
        "sep": delimiter,
        "dtype": str,
        "keep_default_na": False,
    }


def load_csv(csv_path: Path) -> pd.DataFrame:
    kwargs = detect_csv_kwargs(csv_path)
    return pd.read_csv(csv_path, **kwargs)


def build_column_lookup(df: pd.DataFrame) -> dict[str, str]:
    return {normalize_text(column): column for column in df.columns}


def find_column(df: pd.DataFrame, aliases: list[str], required: bool = True) -> str | None:
    lookup = build_column_lookup(df)
    for alias in aliases:
        if normalize_text(alias) in lookup:
            return lookup[normalize_text(alias)]
    if required:
        raise ValueError(f"Nao encontrei nenhuma das colunas esperadas: {aliases}")
    return None


def parse_decimal(value: Any) -> float | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    text = text.replace(".", "").replace(",", ".") if "," in text and "." in text else text.replace(",", ".")
    try:
        return float(text)
    except ValueError:
        return None


def build_full_address(
    row: pd.Series,
    address_col: str | None,
    bairro_col: str | None,
    city_col: str | None,
    state_col: str | None,
    full_address_col: str | None,
) -> str:
    if full_address_col:
        candidate = str(row.get(full_address_col, "")).strip()
        if candidate:
            return candidate

    parts = []
    for column in (address_col, bairro_col, city_col, state_col):
        if column:
            value = str(row.get(column, "")).strip()
            if value:
                parts.append(value)
    parts.append("Brasil")
    return ", ".join(parts)


def filter_region(
    df: pd.DataFrame,
    city_col: str,
    region_mode: str,
) -> pd.DataFrame:
    normalized_city = df[city_col].map(normalize_text)
    if region_mode == "bh":
        mask = normalized_city.eq("belo horizonte")
    elif region_mode == "rmbh":
        mask = normalized_city.isin({normalize_text(city) for city in RMBH_CIDADES})
    else:
        raise ValueError(f"Modo de regiao invalido: {region_mode}")
    return df[mask].copy()


def geocode_missing_coordinates(
    df: pd.DataFrame,
    *,
    lat_col: str,
    lon_col: str,
    full_address_col: str,
    geocode_delay_seconds: float,
    user_agent: str,
) -> tuple[pd.DataFrame, list[dict[str, Any]]]:
    geolocator = Nominatim(user_agent=user_agent)
    geocode = RateLimiter(geolocator.geocode, min_delay_seconds=geocode_delay_seconds)

    geocode_logs: list[dict[str, Any]] = []
    updated = df.copy()

    for index, row in updated.iterrows():
        lat = parse_decimal(row.get(lat_col))
        lon = parse_decimal(row.get(lon_col))
        if lat is not None and lon is not None:
            updated.at[index, lat_col] = str(lat)
            updated.at[index, lon_col] = str(lon)
            continue

        full_address = str(row[full_address_col]).strip()
        try:
            # Nominatim e usado apenas quando o CSV nao traz coordenadas validas.
            location = geocode(full_address, timeout=15)
            if location:
                updated.at[index, lat_col] = str(location.latitude)
                updated.at[index, lon_col] = str(location.longitude)
                geocode_logs.append(
                    {
                        "row_index": int(index),
                        "full_address": full_address,
                        "status": "ok",
                        "latitude": location.latitude,
                        "longitude": location.longitude,
                    }
                )
            else:
                geocode_logs.append(
                    {
                        "row_index": int(index),
                        "full_address": full_address,
                        "status": "not_found",
                    }
                )
        except Exception as exc:
            geocode_logs.append(
                {
                    "row_index": int(index),
                    "full_address": full_address,
                    "status": "error",
                    "error": str(exc),
                }
            )
            time.sleep(max(geocode_delay_seconds, 1.0))

    return updated, geocode_logs


def build_pharmacy_records(df: pd.DataFrame) -> list[PharmacyRecord]:
    records: list[PharmacyRecord] = []

    name_col = find_column(df, ["Farmácia", "Farmacia", "nome", "name"])
    address_col = find_column(df, ["Endereço", "Endereco", "logradouro", "address"], required=False)
    bairro_col = find_column(df, ["Bairro", "district", "bairro"], required=False)
    city_col = find_column(df, ["Cidade", "city", "municipio"])
    state_col = find_column(df, ["Estado", "uf", "state"], required=False)
    lat_col = find_column(df, ["Latitude", "lat", "latitude"])
    lon_col = find_column(df, ["Longitude", "lon", "lng", "longitude"])
    full_address_col = find_column(df, ["EnderecoCompleto", "Endereço Completo", "full_address"], required=False)

    for idx, row in df.iterrows():
        lat = parse_decimal(row.get(lat_col))
        lon = parse_decimal(row.get(lon_col))
        if lat is None or lon is None:
            continue

        full_address = build_full_address(
            row,
            address_col=address_col,
            bairro_col=bairro_col,
            city_col=city_col,
            state_col=state_col,
            full_address_col=full_address_col,
        )
        records.append(
            PharmacyRecord(
                source_index=int(idx),
                name=str(row.get(name_col, "")).strip(),
                address=str(row.get(address_col, "")).strip() if address_col else "",
                bairro=str(row.get(bairro_col, "")).strip() if bairro_col else "",
                city=str(row.get(city_col, "")).strip() if city_col else "",
                state=str(row.get(state_col, "")).strip() if state_col else "",
                full_address=full_address,
                latitude=lat,
                longitude=lon,
            )
        )

    return records


def build_delivery_point_records(df: pd.DataFrame) -> list[DeliveryPointRecord]:
    records: list[DeliveryPointRecord] = []

    order_id_col = find_column(df, ["id_pedido", "pedido_id", "order_id", "id"])
    street_name_col = find_column(df, ["nome_rua", "rua", "logradouro", "street", "endereco"])
    lat_col = find_column(df, ["Latitude", "lat", "latitude"])
    lon_col = find_column(df, ["Longitude", "lon", "lng", "longitude"])

    for idx, row in df.iterrows():
        lat = parse_decimal(row.get(lat_col))
        lon = parse_decimal(row.get(lon_col))
        if lat is None or lon is None:
            continue

        order_id = str(row.get(order_id_col, "")).strip()
        street_name = str(row.get(street_name_col, "")).strip()
        records.append(
            DeliveryPointRecord(
                point_id=f"pedido_{order_id or idx}",
                order_id=order_id,
                street_name=street_name,
                latitude=lat,
                longitude=lon,
            )
        )

    if not records:
        raise ValueError("Nenhum pedido valido com latitude/longitude foi encontrado no CSV de pedidos.")
    return records


def generate_random_delivery_points(
    count: int,
    bounds: dict[str, float],
    seed: int | None = None,
) -> list[DeliveryPointRecord]:
    rng = random.Random(seed)
    points: list[DeliveryPointRecord] = []
    for i in range(1, count + 1):
        lat = rng.uniform(bounds["min_lat"], bounds["max_lat"])
        lon = rng.uniform(bounds["min_lon"], bounds["max_lon"])
        points.append(
            DeliveryPointRecord(
                point_id=f"entrega_{i:02d}",
                order_id=f"entrega_{i:02d}",
                street_name="Ponto aleatorio",
                latitude=round(lat, 6),
                longitude=round(lon, 6),
            )
        )
    return points


def request_osrm_route(
    session: requests.Session,
    origin_lat: float,
    origin_lon: float,
    destination_lat: float,
    destination_lon: float,
    timeout_seconds: float,
) -> dict[str, Any]:
    # OSRM espera coordenadas na ordem lon,lat.
    url = (
        f"{OSRM_BASE_URL}/"
        f"{origin_lon:.6f},{origin_lat:.6f};{destination_lon:.6f},{destination_lat:.6f}"
    )
    params = {
        "overview": "full",
        "geometries": "geojson",
        "steps": "false",
    }
    response = session.get(url, params=params, timeout=timeout_seconds)
    response.raise_for_status()
    payload = response.json()

    if payload.get("code") != "Ok":
        raise ValueError(f"Resposta OSRM invalida: {payload.get('code')} - {payload.get('message')}")

    routes = payload.get("routes", [])
    if not routes:
        raise ValueError("OSRM nao retornou nenhuma rota")

    route = routes[0]
    return {
        "distance_meters": route["distance"],
        "duration_seconds": route["duration"],
        "geometry": route.get("geometry"),
        "raw_response_code": payload.get("code"),
    }


def calculate_routes(
    pharmacies: list[PharmacyRecord],
    delivery_points: list[DeliveryPointRecord],
    *,
    route_delay_seconds: float,
    timeout_seconds: float,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    session = requests.Session()
    session.headers.update({"User-Agent": "dronepharm-route-generator/1.0"})

    pharmacy_results: list[dict[str, Any]] = []
    geojson_features: list[dict[str, Any]] = []

    total_requests = len(pharmacies) * len(delivery_points)
    completed = 0

    for pharmacy in pharmacies:
        pharmacy_entry = {
            "source_index": pharmacy.source_index,
            "name": pharmacy.name,
            "address": pharmacy.address,
            "bairro": pharmacy.bairro,
            "city": pharmacy.city,
            "state": pharmacy.state,
            "full_address": pharmacy.full_address,
            "origin": {
                "latitude": pharmacy.latitude,
                "longitude": pharmacy.longitude,
            },
            "routes": [],
        }

        for delivery_point in delivery_points:
            completed += 1
            route_record = {
                "point_id": delivery_point.point_id,
                "order_id": delivery_point.order_id,
                "street_name": delivery_point.street_name,
                "delivery_point": {
                    "latitude": delivery_point.latitude,
                    "longitude": delivery_point.longitude,
                },
            }

            try:
                route_data = request_osrm_route(
                    session,
                    origin_lat=pharmacy.latitude,
                    origin_lon=pharmacy.longitude,
                    destination_lat=delivery_point.latitude,
                    destination_lon=delivery_point.longitude,
                    timeout_seconds=timeout_seconds,
                )
                route_record.update(
                    {
                        "status": "ok",
                        "distance_meters": route_data["distance_meters"],
                        "distance_km": round(route_data["distance_meters"] / 1000, 3),
                        "duration_seconds": route_data["duration_seconds"],
                        "duration_minutes": round(route_data["duration_seconds"] / 60, 2),
                        "polyline_geojson": route_data["geometry"],
                    }
                )

                if route_data["geometry"]:
                    geojson_features.append(
                        {
                            "type": "Feature",
                            "geometry": route_data["geometry"],
                            "properties": {
                                "pharmacy_name": pharmacy.name,
                                "pharmacy_address": pharmacy.full_address,
                                "point_id": delivery_point.point_id,
                                "order_id": delivery_point.order_id,
                                "street_name": delivery_point.street_name,
                                "distance_km": round(route_data["distance_meters"] / 1000, 3),
                                "duration_minutes": round(route_data["duration_seconds"] / 60, 2),
                            },
                        }
                    )
            except Exception as exc:
                route_record.update(
                    {
                        "status": "error",
                        "error": str(exc),
                    }
                )

            pharmacy_entry["routes"].append(route_record)
            print(f"[rotas] {completed}/{total_requests} -> {pharmacy.name} / {delivery_point.point_id}")
            # Mantem um ritmo conservador para nao sobrecarregar a API publica.
            time.sleep(route_delay_seconds)

        pharmacy_results.append(pharmacy_entry)

    return pharmacy_results, geojson_features


def export_json(data: dict[str, Any], output_path: Path) -> None:
    output_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def export_geojson(features: list[dict[str, Any]], output_path: Path) -> None:
    feature_collection = {
        "type": "FeatureCollection",
        "features": features,
    }
    output_path.write_text(json.dumps(feature_collection, ensure_ascii=False, indent=2), encoding="utf-8")


def build_map(
    pharmacies: list[PharmacyRecord],
    delivery_points: list[DeliveryPointRecord],
    route_features: list[dict[str, Any]],
    output_path: Path,
) -> None:
    all_lats = [ph.latitude for ph in pharmacies] + [pt.latitude for pt in delivery_points]
    all_lons = [ph.longitude for ph in pharmacies] + [pt.longitude for pt in delivery_points]
    center = [sum(all_lats) / len(all_lats), sum(all_lons) / len(all_lons)]

    route_map = folium.Map(location=center, zoom_start=11, tiles="cartodbpositron", control_scale=True)

    for pharmacy in pharmacies:
        popup = (
            f"<b>{pharmacy.name}</b><br>"
            f"{pharmacy.full_address}<br>"
            f"Lat: {pharmacy.latitude:.6f}, Lon: {pharmacy.longitude:.6f}"
        )
        folium.Marker(
            location=[pharmacy.latitude, pharmacy.longitude],
            popup=popup,
            tooltip=pharmacy.name,
            icon=folium.Icon(color="green", icon="plus-sign"),
        ).add_to(route_map)

    for point in delivery_points:
        folium.CircleMarker(
            location=[point.latitude, point.longitude],
            radius=5,
            color="#c0392b",
            fill=True,
            fill_color="#e74c3c",
            fill_opacity=0.9,
            tooltip=f"{point.point_id} - {point.street_name}",
            popup=(
                f"<b>{point.point_id}</b><br>"
                f"Pedido: {point.order_id}<br>"
                f"Rua: {point.street_name}<br>"
                f"Lat: {point.latitude:.6f}<br>"
                f"Lon: {point.longitude:.6f}"
            ),
        ).add_to(route_map)

    for feature in route_features:
        geometry = feature.get("geometry", {})
        coordinates = geometry.get("coordinates", [])
        if not coordinates:
            continue
        latlon_coordinates = [[coord[1], coord[0]] for coord in coordinates]
        props = feature.get("properties", {})
        folium.PolyLine(
            locations=latlon_coordinates,
            weight=2,
            color="#1f78b4",
            opacity=0.55,
            popup=(
                f"{props.get('pharmacy_name', '')} -> {props.get('point_id', '')}<br>"
                f"Rua: {props.get('street_name', '')}<br>"
                f"Distancia: {props.get('distance_km', '')} km<br>"
                f"Tempo: {props.get('duration_minutes', '')} min"
            ),
        ).add_to(route_map)

    route_map.fit_bounds([[min(all_lats), min(all_lons)], [max(all_lats), max(all_lons)]])
    route_map.save(str(output_path))


def prepare_dataframe(df: pd.DataFrame, region_mode: str, geocode_delay_seconds: float) -> tuple[pd.DataFrame, list[dict[str, Any]]]:
    city_col = find_column(df, ["Cidade", "city", "municipio"])
    lat_col = find_column(df, ["Latitude", "lat", "latitude"], required=False)
    lon_col = find_column(df, ["Longitude", "lon", "lng", "longitude"], required=False)
    address_col = find_column(df, ["Endereço", "Endereco", "logradouro", "address"], required=False)
    bairro_col = find_column(df, ["Bairro", "district", "bairro"], required=False)
    state_col = find_column(df, ["Estado", "uf", "state"], required=False)
    full_address_col = find_column(df, ["EnderecoCompleto", "Endereço Completo", "full_address"], required=False)

    filtered = filter_region(df, city_col=city_col, region_mode=region_mode).reset_index(drop=True)
    if filtered.empty:
        raise ValueError("Nenhuma farmacia encontrada para a regiao selecionada.")

    if lat_col is None:
        filtered["Latitude"] = ""
        lat_col = "Latitude"
    if lon_col is None:
        filtered["Longitude"] = ""
        lon_col = "Longitude"

    if full_address_col is None:
        full_address_col = "EnderecoCompleto"
        # Gera um endereco completo reutilizavel tanto para log quanto para geocodificacao.
        filtered[full_address_col] = filtered.apply(
            build_full_address,
            axis=1,
            address_col=address_col,
            bairro_col=bairro_col,
            city_col=city_col,
            state_col=state_col,
            full_address_col=None,
        )

    missing_mask = filtered.apply(
        lambda row: parse_decimal(row.get(lat_col)) is None or parse_decimal(row.get(lon_col)) is None,
        axis=1,
    )
    needs_geocoding = missing_mask.any()

    geocode_logs: list[dict[str, Any]] = []
    if needs_geocoding:
        skipped_rows = filtered[missing_mask].copy()
        for index, row in skipped_rows.iterrows():
            geocode_logs.append(
                {
                    "row_index": int(index),
                    "full_address": str(row.get(full_address_col, "")).strip(),
                    "status": "skipped_missing_coordinates",
                }
            )
        filtered = filtered[~missing_mask].copy()

    return filtered, geocode_logs


def select_pharmacies(
    pharmacies: list[PharmacyRecord],
    pharmacy_base: str | None,
    max_pharmacies: int | None,
) -> list[PharmacyRecord]:
    selected = pharmacies
    if pharmacy_base:
        normalized_target = normalize_text(pharmacy_base)
        selected = [pharmacy for pharmacy in pharmacies if normalize_text(pharmacy.name) == normalized_target]
        if not selected:
            raise ValueError(f"Farmacia base '{pharmacy_base}' nao encontrada no arquivo filtrado.")

    if max_pharmacies is not None:
        selected = selected[:max_pharmacies]

    if not selected:
        raise ValueError("Nenhuma farmacia valida disponivel para calcular rotas.")
    return selected


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Calcula rotas OSRM entre farmacias e pontos aleatorios em BH.")
    parser.add_argument("--input", required=True, help="Caminho do arquivo CSV de entrada.")
    parser.add_argument("--pedidos-csv", help="CSV com pedidos contendo id_pedido, nome_rua, latitude e longitude.")
    parser.add_argument("--output-dir", default="saida_rotas", help="Diretorio onde os arquivos serao gerados.")
    parser.add_argument("--region-mode", choices=["bh", "rmbh"], default="bh", help="Filtra apenas BH ou toda a RMBH.")
    parser.add_argument("--num-pontos", type=int, default=10, help="Quantidade de pontos aleatorios de entrega.")
    parser.add_argument("--farmacia-base", help="Nome exato da farmacia para usar como base. Se omitido, usa todas.")
    parser.add_argument("--max-farmacias", type=int, help="Limita o numero de farmacias processadas.")
    parser.add_argument("--seed", type=int, default=42, help="Semente aleatoria para reproducibilidade.")
    parser.add_argument("--route-delay-seconds", type=float, default=1.0, help="Atraso entre chamadas ao OSRM.")
    parser.add_argument("--geocode-delay-seconds", type=float, default=1.0, help="Atraso entre chamadas ao Nominatim.")
    parser.add_argument("--timeout-seconds", type=float, default=30.0, help="Timeout de requisicao HTTP.")
    parser.add_argument("--min-lat", type=float, default=DEFAULT_BH_BOUNDS["min_lat"])
    parser.add_argument("--max-lat", type=float, default=DEFAULT_BH_BOUNDS["max_lat"])
    parser.add_argument("--min-lon", type=float, default=DEFAULT_BH_BOUNDS["min_lon"])
    parser.add_argument("--max-lon", type=float, default=DEFAULT_BH_BOUNDS["max_lon"])
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    input_path = Path(args.input)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"[1/6] Lendo arquivo: {input_path}")
    raw_df = load_csv(input_path)

    print(f"[2/6] Filtrando regiao e geocodificando enderecos faltantes...")
    prepared_df, geocode_logs = prepare_dataframe(
        raw_df,
        region_mode=args.region_mode,
        geocode_delay_seconds=args.geocode_delay_seconds,
    )

    print(f"[3/6] Construindo registros de farmacias...")
    pharmacies = build_pharmacy_records(prepared_df)
    pharmacies = select_pharmacies(
        pharmacies,
        pharmacy_base=args.farmacia_base,
        max_pharmacies=args.max_farmacias,
    )

    bounds = {
        "min_lat": args.min_lat,
        "max_lat": args.max_lat,
        "min_lon": args.min_lon,
        "max_lon": args.max_lon,
    }
    if args.pedidos_csv:
        pedidos_path = Path(args.pedidos_csv)
        print(f"[4/6] Lendo pedidos reais de: {pedidos_path}")
        pedidos_df = load_csv(pedidos_path)
        delivery_points = build_delivery_point_records(pedidos_df)
    else:
        print(f"[4/6] Gerando {args.num_pontos} pontos aleatorios em {bounds}...")
        delivery_points = generate_random_delivery_points(args.num_pontos, bounds=bounds, seed=args.seed)

    print(f"[5/6] Calculando rotas de {len(pharmacies)} farmacia(s) para {len(delivery_points)} ponto(s)...")
    pharmacy_results, geojson_features = calculate_routes(
        pharmacies,
        delivery_points,
        route_delay_seconds=args.route_delay_seconds,
        timeout_seconds=args.timeout_seconds,
    )

    results_payload = {
        "metadata": {
            "input_file": str(input_path),
            "region_mode": args.region_mode,
            "num_pharmacies": len(pharmacies),
            "num_delivery_points": len(delivery_points),
            "seed": args.seed,
            "bounds": bounds,
            "pedidos_csv": args.pedidos_csv,
            "osrm_base_url": OSRM_BASE_URL,
            "generated_at_unix": time.time(),
        },
        "delivery_points": [
            {
                "point_id": point.point_id,
                "order_id": point.order_id,
                "street_name": point.street_name,
                "latitude": point.latitude,
                "longitude": point.longitude,
            }
            for point in delivery_points
        ],
        "geocoding_logs": geocode_logs,
        "pharmacies": pharmacy_results,
    }

    json_path = output_dir / "rotas_farmacias.json"
    geojson_path = output_dir / "rotas_farmacias.geojson"
    html_map_path = output_dir / "rotas_farmacias_mapa.html"
    csv_preview_path = output_dir / "farmacias_processadas.csv"

    print(f"[6/6] Exportando resultados...")
    export_json(results_payload, json_path)
    export_geojson(geojson_features, geojson_path)
    build_map(pharmacies, delivery_points, geojson_features, html_map_path)
    prepared_df.to_csv(csv_preview_path, index=False, encoding="utf-8-sig")

    print("\nArquivos gerados:")
    print(f"  - JSON: {json_path}")
    print(f"  - GeoJSON: {geojson_path}")
    print(f"  - HTML: {html_map_path}")
    print(f"  - CSV processado: {csv_preview_path}")


if __name__ == "__main__":
    main()
