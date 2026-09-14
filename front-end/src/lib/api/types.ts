export interface MarketListRequest {
  page?: number;
  page_size?: number;
  category?: string;
  sort?: string;
  order?: string;
  search?: string;
  is_hot?: boolean;
}

export interface MarketMetadata extends Record<string, unknown> {
  source_url?: string;
  resolution_source?: string;
  context?: string;
  fetched_at?: string;
  outcome_labels?: string[];
}

export interface MarketListItem {
  id: number;
  question: string;
  description?: string;
  category: string;
  creator_address: string;
  contract_address?: string;
  yes_price: number;
  no_price: number;
  total_volume: number;
  total_liquidity: number;
  participant_count: number;
  ai_prediction?: number;
  confidence?: number;
  suggests?: string;
  start_time: string;
  end_time: string;
  status: number;
  is_hot: boolean;
  is_featured: boolean;
  created_at: string;
  metadata?: MarketMetadata;
}

export interface MarketListResponse {
  total: number;
  page: number;
  page_size: number;
  markets: MarketListItem[];
}

export interface MarketDetailResponse extends MarketListItem {
  yes_shares: number;
  no_shares: number;
  settlement_time?: string;
  result?: number;
  audit_status: number;
  tags?: string[];
  updated_at: string;
  is_favorited?: boolean;
}

export interface AIInsightReport {
  market_id: number;
  market_probability: number;
  independent_probability: number;
  confidence: number;
  summary: string;
  evidence: string[];
  counterarguments: string[];
  risks: string[];
  assumptions: string[];
  generated_at: string;
  model: string;
  disclaimer: string;
}
