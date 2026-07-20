import type { SpiceLevel } from '@/types/enums'

export const SPICE_LEVEL: Record<SpiceLevel, string> = {
  mild: 'Mild',
  medium: 'Medium',
  hot: 'Hot',
  extra_hot: 'Extra Hot',
}

export const SPICE_LEVEL_LIST: SpiceLevel[] = [
  'mild',
  'medium',
  'hot',
  'extra_hot',
]
