/* useScrollEscape: let the whole page scroll when the user is
   FORCIBLY trying to scroll past a scrolling list, not in the normal
   case (user order 2026-11-12).

   Normal scrolling over a list scrolls only the list. The escape
   triggers only when the list is already at its scroll boundary in
   the wheel direction (top while scrolling up, bottom while scrolling
   down) AND the user keeps pushing past it. After 5 such boundary
   pushes in the same direction (within 1.5s of each other), the
   wheel event is captured and the page is scrolled by the wheel
   delta instead. The count resets when the user scrolls the list
   normally (not at a boundary), changes direction, pauses, or moves
   the mouse off the list. Lists that do not overflow never count,
   so a short list never hijacks the page scroll. */

import { useEffect, useRef } from 'react';
import { scrollPageBy } from './lenis-instance';

const ESCAPE_COUNT = 5;
const RESET_MS = 1500;

export function useScrollEscape(containerRef, enabled = true) {
  const stateRef = useRef({ count: 0, dir: 0, lastTime: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !enabled) return;

    const onWheel = (e) => {
      const deltaY = e.deltaY;
      if (deltaY === 0) return;
      // A list that does not overflow cannot be scrolled, so there is
      // nothing to escape from; leave the event alone.
      if (el.scrollHeight <= el.clientHeight + 1) return;
      const dir = deltaY > 0 ? 1 : -1;
      const now = Date.now();
      const st = stateRef.current;
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
      const atTop = el.scrollTop <= 0;
      const atBoundary = dir > 0 ? atBottom : atTop;
      if (!atBoundary) {
        // Normal list scrolling; reset, the user is not pushing past.
        st.count = 0;
        st.dir = 0;
        return;
      }
      // At the boundary and pushing past it: count this push.
      if (st.dir !== dir || now - st.lastTime > RESET_MS) {
        st.count = 0;
      }
      st.dir = dir;
      st.lastTime = now;
      st.count += 1;
      if (st.count >= ESCAPE_COUNT) {
        e.preventDefault();
        scrollPageBy(deltaY);
        st.count = 0;
      }
      // Below the threshold the event is left alone: the list is at
      // its boundary so it does not move, and the page stays put
      // until the 5th push, so an accidental overscroll does not
      // jump the page.
    };

    const reset = () => {
      stateRef.current.count = 0;
      stateRef.current.dir = 0;
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('mouseleave', reset);
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('mouseleave', reset);
    };
  }, [containerRef, enabled]);
}
