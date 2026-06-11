export type PedidoStatus =
  | "pendente"
  | "calculado"
  | "despachado"
  | "em_voo"
  | "entregue"
  | "cancelado"
  | "falha";

export type PrioridadeEnum = 1 | 2 | 3;
export type StatusDroneEnum =
  | "aguardando"
  | "em_voo"
  | "retornando"
  | "carregando"
  | "manutencao"
  | "emergencia";

export interface ValidationErrorDetail {
  loc: Array<string | number>;
  msg: string;
  type: string;
}

export interface HTTPValidationError {
  detail?: ValidationErrorDetail[];
}

export interface CoordenadaSchema {
  latitude: number;
  longitude: number;
}

export interface PedidoCreate {
  coordenada: CoordenadaSchema;
  peso_kg: number;
  prioridade?: PrioridadeEnum;
  descricao?: string;
  farmacia_id: number;
  janela_fim?: string | null;
}

export interface PedidoUpdate {
  descricao?: string | null;
  janela_fim?: string | null;
}

export interface PedidoResponse {
  id: number;
  latitude: number;
  longitude: number;
  peso_kg: number;
  prioridade: PrioridadeEnum;
  descricao: string | null;
  farmacia_id: number;
  rota_id: number | null;
  status: PedidoStatus;
  janela_fim: string | null;
  criado_em: string;
  entregue_em: string | null;
  despachado_em?: string | null;
  estimativa_entrega_em?: string | null;
  coordenada: CoordenadaSchema;
}

export interface PedidoListResponse {
  total: number;
  pedidos: PedidoResponse[];
  total_count?: number;
  limit?: number;
  offset?: number;
  has_more?: boolean;
}

export interface PosicaoAtualResponse {
  latitude?: number | null;
  longitude?: number | null;
  altitude_m?: number | null;
  atualizado_em?: string | null;
}

export interface DestinoPedidoResponse {
  latitude: number;
  longitude: number;
}

export interface PedidoResumoTrackingResponse {
  prioridade: PrioridadeEnum;
  descricao?: string | null;
  farmacia_id: number;
  janela_fim?: string | null;
}

export interface WaypointResponse {
  seq: number;
  latitude: number;
  longitude: number;
  altitude: number;
  label: string;
}

export interface GeoJsonPointGeometry {
  type: "Point";
  coordinates: [number, number];
}

export interface GeoJsonLineStringGeometry {
  type: "LineString";
  coordinates: [number, number][];
}

export type GeoJsonGeometry = GeoJsonPointGeometry | GeoJsonLineStringGeometry;

export interface MapaSnapshotFeatureProperties {
  id?: number | string;
  tipo?: string;
  nome?: string;
  status?: string;
  drone_id?: string;
  rota_id?: number;
  seq?: number;
  label?: string;
  [key: string]: unknown;
}

export interface MapaSnapshotFeature {
  type: "Feature";
  geometry: GeoJsonGeometry;
  properties: MapaSnapshotFeatureProperties;
}

export interface MapaSnapshotResponse {
  type: "FeatureCollection";
  features: MapaSnapshotFeature[];
}

export interface DroneCreate {
  id: string;
  nome: string;
  capacidade_max_kg?: number;
  autonomia_max_km?: number;
  velocidade_ms?: number;
}

export interface DroneUpdate {
  status?: StatusDroneEnum | null;
  bateria_pct?: number | null;
  latitude_atual?: number | null;
  longitude_atual?: number | null;
}

export interface DroneResponse {
  id: string;
  nome: string;
  capacidade_max_kg: number;
  autonomia_max_km: number;
  velocidade_ms: number;
  status: StatusDroneEnum;
  bateria_pct: number;
  latitude_atual: number | null;
  longitude_atual: number | null;
  missoes_realizadas: number;
  cadastrado_em: string;
}

export interface DroneListResponse {
  total: number;
  drones: DroneResponse[];
}

export interface FarmaciaCreate {
  cnpj: string;
  nome: string;
  latitude: number;
  longitude: number;
  endereco: string;
  cidade: string;
  uf: string;
  deposito: boolean;
}

export interface FarmaciaUpdate {
  cnpj?: string | null;
  nome?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  uf?: string | null;
  ativa?: boolean | null;
  deposito?: boolean | null;
}

export interface FarmaciaResponse {
  id: number;
  cnpj: string;
  nome: string;
  latitude: number;
  longitude: number;
  endereco: string;
  cidade: string;
  uf: string;
  deposito: boolean;
  ativa: boolean;
  criada_em?: string | null;
}

export interface FarmaciaListResponse {
  total: number;
  farmacias: FarmaciaResponse[];
}

export interface HistoricoResponse {
  id: number;
  pedido_id: number;
  rota_id: number;
  drone_id: string;
  farmacia_id: number;
  prioridade: number;
  peso_kg: number;
  distancia_km: number;
  tempo_real_min: number | null;
  entregue_no_prazo: boolean;
  criado_em: string;
}

export interface HistoricoListResponse {
  total: number;
  historico: HistoricoResponse[];
}

export interface KpiGeralResponse {
  total_entregas: number;
  entregas_no_prazo: number;
  taxa_pontualidade_pct: number;
  tempo_medio_min: number;
  distancia_media_km: number;
  peso_total_entregue_kg: number;
}

export interface KpiFarmaciaResponse {
  farmacia_id: number;
  farmacia: string;
  cidade: string;
  uf: string;
  total_entregas: number;
  entregas_no_prazo: number;
  tempo_medio_min: number | null;
  distancia_media_km: number | null;
  peso_total_kg: number | null;
}

export interface KpiFarmaciaListResponse {
  total: number;
  farmacias: KpiFarmaciaResponse[];
}

export interface KpiTempoRealResponse {
  total_ativos: number;
  pedidos_em_voo: number;
  concluidos: number;
  pontualidade_pct: number;
  eta_medio_seg: number;
}

export interface RotaResponse {
  id: number;
  drone_id: string;
  pedido_ids: number[];
  waypoints: WaypointResponse[];
  distancia_km: number;
  tempo_min: number;
  energia_wh: number;
  carga_kg: number;
  custo: number;
  viavel: boolean;
  geracoes_ga: number;
  status: string;
  criada_em: string;
  concluida_em?: string | null;
}

export interface RoteirizarRequest {
  drone_id: string;
  pedido_ids?: number[] | null;
  forcar_recalc?: boolean;
  vento_ms?: number | null;
}

export interface RoteirizarResponse {
  sucesso: boolean;
  rotas: RotaResponse[];
  total_voos: number;
  distancia_total_km: number;
  tempo_total_min: number;
  energia_total_wh: number;
  mensagem: string;
  calculado_em: string;
}

export type SimulacaoVisualStatus =
  | "aguardando"
  | "executando"
  | "pausado"
  | "concluido"
  | "erro";

export interface SimulacaoStatusResponse {
  rawTelemetry?: RawTelemetryPayload;
  status_simulacao: SimulacaoVisualStatus | string;
  timestamp_servidor: string;
  drone_id: string;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  velocidade_m_s: number | null;
  distancia_percorrida_m: number | null;
  distancia_restante_m: number | null;
  progresso_percentual: number | null;
  etapa_atual?: number | null;
  total_etapas?: number | null;
  tempo_decorrido: number | null;
  eta_segundos: number | null;
  velocidade_simulacao: number | null;
  horario_estimado_chegada: string;
  tempo_decorrido_segundos: number | null;
  tempo_total_estimado_segundos: number | null;
  tempo_restante_segundos: number | null;
  mensagem: string;
}

export interface PedidoAtivoResponse {
  pedido_id: number;
  rota_id?: number | null;
  drone_id?: string | null;
  status: PedidoStatus;
  rota?: RotaResponse | null;
  drone?: DroneResponse | null;
  posicao_atual: PosicaoAtualResponse | null;
  pedido: PedidoResumoTrackingResponse;
  criado_em?: string;
  despachado_em?: string | null;
  eta_segundos?: number | null;
  tempo_decorrido_s?: number | null;
  estimativa_entrega_em?: string | null;
  tempo_decorrido_seg?: number | null;
  tempo_restante_seg?: number | null;
  destino?: DestinoPedidoResponse;
}

export interface TelemetriaResponse {
  id: number;
  drone_id: string;
  latitude: number;
  longitude: number;
  altitude_m: number;
  velocidade_ms: number;
  bateria_pct: number;
  vento_ms: number;
  direcao_vento: number;
  status: string;
  criado_em: string;
}

export type RawTelemetryPayload = Record<string, unknown>;

export interface DisplayTelemetry {
  statusSimulacao: string;
  velocidadeAtual: string;
  distanciaPercorrida: string;
  distanciaRestante: string;
  progresso: string;
  eta: string;
  tempoRestante: string;
  tempoDecorrido: string;
  tempoTotal: string;
  horarioEstimadoChegada: string;
  altitude: string;
  latitude: string;
  longitude: string;
  velocidadeSimulacao: string;
}

export interface WSTelemetriaPayload extends TelemetriaResponse {
  rawTelemetry: RawTelemetryPayload;
  pedido_id?: number | null;
  status_missao?: PedidoStatus | StatusDroneEnum | string | null;
  eta_segundos?: number | null;
  timestamp_servidor?: string;
  status_simulacao?: SimulacaoVisualStatus | string;
  velocidade_m_s?: number | null;
  distancia_percorrida_m?: number | null;
  distancia_restante_m?: number | null;
  progresso_percentual?: number | null;
  horario_estimado_chegada?: string | null;
  tempo_decorrido_segundos?: number | null;
  tempo_total_estimado_segundos?: number | null;
  tempo_restante_segundos?: number | null;
  direcao?: number | null;
  _ts?: string;
}

export interface WSPedidoPayload {
  tipo: "pedido";
  evento: string;
  pedido_id: number;
  status_de?: PedidoStatus | null;
  status_para?: PedidoStatus | null;
  drone_id?: string | null;
  rota_id?: number | null;
  timestamp?: string;
}
