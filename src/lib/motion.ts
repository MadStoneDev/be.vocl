import type { Variants, Transition } from "framer-motion";

/**
 * Shared motion primitives (FND-3). Use with framer-motion components.
 * Wrap consumers in <MotionConfig reducedMotion="user"> so these respect
 * prefers-reduced-motion automatically.
 */

export const spring: Transition = { type: "spring", stiffness: 400, damping: 30 };
export const softSpring: Transition = { type: "spring", stiffness: 260, damping: 26 };

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.25, ease: "easeOut" } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: "easeOut" } },
};

/** Container that staggers its children's `show` transition. */
export const staggerContainer = (stagger = 0.05): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger } },
});

/** Press feedback for buttons: <motion.button whileTap={tapScale}>. */
export const tapScale = { scale: 0.94 };
export const hoverLift = { y: -2 };
