export type BrandType = "native" | "test" | "partner";

export type ProjectBrand = {
  label: string;
  value: string;
  type: BrandType;
  enabledInUserMint: boolean;
  enabledInStoreAdmin: boolean;
  enabledInCafeAdmin: boolean;
};

export const PROJECT_BRANDS = [
  {
    label: "Realife",
    value: "realife",
    type: "native",
    enabledInUserMint: true,
    enabledInStoreAdmin: true,
    enabledInCafeAdmin: true,
  },
  {
    label: "Billions",
    value: "billions",
    type: "test",
    enabledInUserMint: true,
    enabledInStoreAdmin: true,
    enabledInCafeAdmin: false,
  },
  {
    label: "Sentient",
    value: "sentient",
    type: "test",
    enabledInUserMint: true,
    enabledInStoreAdmin: true,
    enabledInCafeAdmin: false,
  },
  {
    label: "Neura",
    value: "neura",
    type: "test",
    enabledInUserMint: true,
    enabledInStoreAdmin: true,
    enabledInCafeAdmin: false,
  },
  {
    label: "Espresso",
    value: "espresso",
    type: "test",
    enabledInUserMint: true,
    enabledInStoreAdmin: true,
    enabledInCafeAdmin: false,
  },
  {
    label: "Rialo",
    value: "rialo",
    type: "test",
    enabledInUserMint: true,
    enabledInStoreAdmin: true,
    enabledInCafeAdmin: false,
  },
  {
    label: "Other",
    value: "other",
    type: "test",
    enabledInUserMint: true,
    enabledInStoreAdmin: true,
    enabledInCafeAdmin: false,
  },
] as const satisfies readonly ProjectBrand[];

export function getBrandByValue(value?: string | null) {
  const v = String(value || "").trim().toLowerCase();
  return PROJECT_BRANDS.find((x) => x.value === v) || null;
}

export function getBrandLabel(value?: string | null) {
  return getBrandByValue(value)?.label || "Other";
}

export function getBrandType(value?: string | null): BrandType {
  return getBrandByValue(value)?.type || "test";
}

export function getUserMintBrands() {
  return PROJECT_BRANDS.filter((x) => x.enabledInUserMint);
}

export function getStoreAdminBrands() {
  return PROJECT_BRANDS.filter((x) => x.enabledInStoreAdmin);
}

export function getCafeAdminBrands() {
  return PROJECT_BRANDS.filter((x) => x.enabledInCafeAdmin);
}
