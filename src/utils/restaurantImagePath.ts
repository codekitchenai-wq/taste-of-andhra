/** Object key prefix inside the shared `restaurant-images` bucket. */
export function restaurantImageObjectPath(
  organizationId: string,
  folder: 'dishes' | 'categories',
  entityId: string,
  filename: string,
): string {
  const org = organizationId.trim()
  const id = entityId.trim()
  const name = filename.replace(/^\/+/, '')
  return `orgs/${org}/${folder}/${id}/${name}`
}
