import type { CategoryRevenueReport, PopularDishReport } from '@/services/reportService'

interface ReportTableProps {
  popularDishes: PopularDishReport[]
  categoryRevenue: CategoryRevenueReport[]
}

const priceFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export function ReportTables({
  popularDishes,
  categoryRevenue,
}: ReportTableProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="overflow-x-auto rounded-[var(--radius-card)] bg-surface shadow-md">
        <div className="border-b border-black/5 px-4 py-3">
          <h3 className="font-semibold text-text-primary">Popular Dishes</h3>
        </div>
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="border-b border-black/5 bg-background/60">
            <tr>
              <th className="px-4 py-3 font-semibold">Dish</th>
              <th className="px-4 py-3 font-semibold">Qty Sold</th>
              <th className="px-4 py-3 font-semibold">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {popularDishes.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-text-secondary">
                  No dish sales yet.
                </td>
              </tr>
            ) : (
              popularDishes.map((dish) => (
                <tr key={dish.dishId} className="border-b border-black/5 last:border-b-0">
                  <td className="px-4 py-4 font-medium text-text-primary">
                    {dish.dishName}
                  </td>
                  <td className="px-4 py-4 text-text-secondary">
                    {dish.orderCount}
                  </td>
                  <td className="px-4 py-4 font-medium text-text-primary">
                    {priceFormatter.format(dish.revenue)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="overflow-x-auto rounded-[var(--radius-card)] bg-surface shadow-md">
        <div className="border-b border-black/5 px-4 py-3">
          <h3 className="font-semibold text-text-primary">Category Sales</h3>
        </div>
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="border-b border-black/5 bg-background/60">
            <tr>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {categoryRevenue.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-text-secondary">
                  No category sales yet.
                </td>
              </tr>
            ) : (
              categoryRevenue.map((category) => (
                <tr
                  key={category.categoryId}
                  className="border-b border-black/5 last:border-b-0"
                >
                  <td className="px-4 py-4 font-medium text-text-primary">
                    {category.categoryName}
                  </td>
                  <td className="px-4 py-4 font-medium text-text-primary">
                    {priceFormatter.format(category.revenue)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}
