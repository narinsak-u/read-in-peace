export function useSearch() {
  const query = ref<string>('');
  return { query };
}
