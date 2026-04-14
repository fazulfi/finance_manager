export interface IdxStockDefinition {
  ticker: string;
  name: string;
  sector: string;
  basePrice: number;
}

export const IDX_STOCKS: IdxStockDefinition[] = [
  { ticker: "BBCA", name: "Bank Central Asia Tbk", sector: "Financials", basePrice: 9800 },
  { ticker: "BBRI", name: "Bank Rakyat Indonesia Tbk", sector: "Financials", basePrice: 5600 },
  { ticker: "BMRI", name: "Bank Mandiri Tbk", sector: "Financials", basePrice: 7200 },
  { ticker: "BBNI", name: "Bank Negara Indonesia Tbk", sector: "Financials", basePrice: 5200 },
  { ticker: "BRIS", name: "Bank Syariah Indonesia Tbk", sector: "Financials", basePrice: 2900 },
  { ticker: "TLKM", name: "Telkom Indonesia (Persero) Tbk", sector: "Telecommunication", basePrice: 3800 },
  { ticker: "ISAT", name: "Indosat Tbk", sector: "Telecommunication", basePrice: 10800 },
  { ticker: "EXCL", name: "XL Axiata Tbk", sector: "Telecommunication", basePrice: 2350 },
  { ticker: "ASII", name: "Astra International Tbk", sector: "Industrials", basePrice: 5700 },
  { ticker: "UNVR", name: "Unilever Indonesia Tbk", sector: "Consumer Staples", basePrice: 2600 },
  { ticker: "ICBP", name: "Indofood CBP Sukses Makmur Tbk", sector: "Consumer Staples", basePrice: 11100 },
  { ticker: "INDF", name: "Indofood Sukses Makmur Tbk", sector: "Consumer Staples", basePrice: 6900 },
  { ticker: "CPIN", name: "Charoen Pokphand Indonesia Tbk", sector: "Consumer Staples", basePrice: 5200 },
  { ticker: "JPFA", name: "Japfa Comfeed Indonesia Tbk", sector: "Consumer Staples", basePrice: 1580 },
  { ticker: "KLBF", name: "Kalbe Farma Tbk", sector: "Healthcare", basePrice: 1620 },
  { ticker: "MIKA", name: "Mitra Keluarga Karyasehat Tbk", sector: "Healthcare", basePrice: 2950 },
  { ticker: "HMSP", name: "Hanjaya Mandala Sampoerna Tbk", sector: "Consumer Staples", basePrice: 940 },
  { ticker: "GOTO", name: "GoTo Gojek Tokopedia Tbk", sector: "Technology", basePrice: 86 },
  { ticker: "BUKA", name: "Bukalapak.com Tbk", sector: "Technology", basePrice: 156 },
  { ticker: "EMTK", name: "Elang Mahkota Teknologi Tbk", sector: "Technology", basePrice: 470 },
  { ticker: "MDKA", name: "Merdeka Copper Gold Tbk", sector: "Basic Materials", basePrice: 2450 },
  { ticker: "ANTM", name: "Aneka Tambang Tbk", sector: "Basic Materials", basePrice: 1980 },
  { ticker: "INCO", name: "Vale Indonesia Tbk", sector: "Basic Materials", basePrice: 4200 },
  { ticker: "TPIA", name: "Chandra Asri Pacific Tbk", sector: "Basic Materials", basePrice: 9100 },
  { ticker: "ADRO", name: "Alamtri Resources Indonesia Tbk", sector: "Energy", basePrice: 2750 },
  { ticker: "PTBA", name: "Bukit Asam Tbk", sector: "Energy", basePrice: 2680 },
  { ticker: "PGAS", name: "Perusahaan Gas Negara Tbk", sector: "Energy", basePrice: 1500 },
  { ticker: "SMGR", name: "Semen Indonesia (Persero) Tbk", sector: "Industrials", basePrice: 3720 },
  { ticker: "INTP", name: "Indocement Tunggal Prakarsa Tbk", sector: "Industrials", basePrice: 7850 },
  { ticker: "JSMR", name: "Jasa Marga (Persero) Tbk", sector: "Infrastructure", basePrice: 4860 },
  { ticker: "TBIG", name: "Tower Bersama Infrastructure Tbk", sector: "Infrastructure", basePrice: 1900 },
  { ticker: "SIDO", name: "Industri Jamu Dan Farmasi Sido Muncul Tbk", sector: "Healthcare", basePrice: 620 },
  { ticker: "MAPI", name: "Mitra Adiperkasa Tbk", sector: "Consumer Discretionary", basePrice: 1750 },
  { ticker: "ACES", name: "Aspirasi Hidup Indonesia Tbk", sector: "Consumer Discretionary", basePrice: 920 },
];

