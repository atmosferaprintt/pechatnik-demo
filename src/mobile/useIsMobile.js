import { useState, useEffect } from 'react';

// Брейкпоинт мобилки. Полноценное отдельное дерево src/mobile/ сделаем позже,
// пока адаптируем текущие экраны.
export default function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);
  return isMobile;
}
