import { useSyncExternalStore } from 'react';

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', cb);
      return () => mql.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
  );
}

/** 手機版面（< 900px） */
export const useIsMobile = () => useMediaQuery('(max-width: 899px)');
/** 觸控為主的裝置：Enter 換行、用長按代替滑鼠移上去 */
export const useIsTouch = () => useMediaQuery('(pointer: coarse)');
