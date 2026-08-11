import type { PopularDishReport } from '@/services/reportService'
import { formatPrice } from '@/utils/format'

interface PopularDishesTableProps {
  dishes: PopularDishReport[]
  /** Hide the built-in section heading when the parent already titles it. */
  hideHeader?: boolean
}

export function PopularDishesTable({
  dishes,
  hideHeader = false,
}: PopularDishesTableProps) {
  return (
    <section className="overflow-x-auto rounded-[var(--radius-card)] bg-surface shadow-md">
      {!hideHeader && (
        <div className="border-b border-black/5 px-4 py-4 md:px-6">
          <h3 className="text-lg font-semibold text-text-primary">
            Popular Dishes
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            Top-selling dishes by quantity and revenue.
          </p>
        </div>
      )}
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-black/5 bg-background/60">
          <tr>
            <th className="px-4 py-3 font-semibold md:px-6">#</th>
            <th className="px-4 py-3 font-semibold md:px-6">Dish</th>
            <th className="px-4 py-3 font-semibold md:px-6">Qty Sold</th>
            <th className="px-4 py-3 font-semibold md:px-6">Revenue</th>
          </tr>
        </thead>
        <tbody>
          {dishes.length === 0 ? (
            <tr>
              <td
                colSpan={4}
                className="px-4 py-10 text-center text-text-secondary md:px-6"
              >
                No dish sales yet.
              </td>
            </tr>
          ) : (
            dishes.map((dish, index) => (
              <tr
                key={dish.dishId}
                className="border-b border-black/5 last:border-b-0"
              >
                <td className="px-4 py-4 text-text-secondary md:px-6">
                  {index + 1}
                </td>
                <td className="px-4 py-4 font-medium text-text-primary md:px-6">
                  {dish.dishName}
                </td>
                <td className="px-4 py-4 text-text-secondary md:px-6">
                  {dish.orderCount}
                </td>
                <td className="px-4 py-4 font-medium text-primary md:px-6">
                  {formatPrice(dish.revenue)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  )
}
