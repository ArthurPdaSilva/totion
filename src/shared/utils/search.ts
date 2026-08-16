export function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

export function includesSearchTerm(
  values: Array<string | null>,
  normalizedSearchTerm: string,
) {
  return values.some((value) =>
    value ? normalizeSearchText(value).includes(normalizedSearchTerm) : false,
  );
}
