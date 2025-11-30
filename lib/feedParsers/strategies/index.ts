/**
 * Strategy Registry
 *
 * Exports all parser strategies and provides a registry for platform detection.
 * Strategies are ordered by specificity - more specific patterns first.
 */

import type { ParserStrategy } from '../types'
import { substackStrategy } from './substack'
import { mediumStrategy } from './medium'
import { devtoStrategy } from './devto'
import { ghostStrategy } from './ghost'
import { hashnodeStrategy } from './hashnode'
import { genericStrategy } from './generic'

// Export individual strategies
export { substackStrategy } from './substack'
export { mediumStrategy } from './medium'
export { devtoStrategy } from './devto'
export { ghostStrategy } from './ghost'
export { hashnodeStrategy } from './hashnode'
export { genericStrategy } from './generic'

// Ordered list of strategies for detection (more specific first)
// Generic is not included - it's the fallback when no others match
export const strategies: ParserStrategy[] = [
  substackStrategy,
  mediumStrategy,
  devtoStrategy,
  ghostStrategy,
  hashnodeStrategy,
]

// Generic strategy is exported separately as the fallback
export { genericStrategy as fallbackStrategy }
