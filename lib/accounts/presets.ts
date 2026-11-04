export const BANK_PRESETS = [
  "BCA",
  "BRI",
  "BNI",
  "Mandiri",
  "SeaBank",
  "Jago",
  "BSI",
  "CIMB Niaga",
  "Permata",
  "Blu",
  "Lainnya",
];

export const EWALLET_PRESETS = [
  "GoPay",
  "OVO",
  "DANA",
  "ShopeePay",
  "LinkAja",
  "Lainnya",
];

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  bank: "Bank",
  ewallet: "E-wallet",
  cash: "Tunai",
  investment: "Investasi",
  receivable: "Piutang",
  paylater: "Paylater",
  loan: "Pinjaman",
  payable: "Utang ke orang",
};

export function getAccountKind(type: string) {
  return ["paylater", "loan", "payable"].includes(type) ? "liability" : "asset";
}
