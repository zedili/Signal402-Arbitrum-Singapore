import type {
  MarketListRequest,
  MarketListResponse,
  MarketDetailResponse,
} from '../types';

export const marketApi = {
  // 获取市场列表
  getMarketList: async (params?: MarketListRequest): Promise<MarketListResponse> => {
    const query = new URLSearchParams();
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value !== undefined && value !== '') query.set(key, String(value));
    });
    const response = await fetch(`/api/markets?${query}`);
    if (!response.ok) throw new Error(`Failed to load markets (${response.status})`);
    return response.json();
  },

  // 获取市场详情
  getMarketDetail: async (id: number): Promise<MarketDetailResponse> => {
    const response = await fetch(`/api/markets/${id}`);
    if (!response.ok) throw new Error(`Failed to load market (${response.status})`);
    return response.json();
  },
};


