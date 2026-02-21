import { useEffect } from 'react';

interface MouseTrackingCallbacks {
  onScrollUp: () => void;
  onScrollDown: () => void;
}

export function useMouseTracking({ onScrollUp, onScrollDown }: MouseTrackingCallbacks): void {
  useEffect(() => {
    const MOUSE_PREFIX = '\x1b[M';
    
    process.stdout.write('\x1b[?1000h');
    
    const rawDataHandler = (data: Buffer) => {
      const str = data.toString('binary');
      
      if (str.startsWith(MOUSE_PREFIX)) {
        const buttonByte = str.charCodeAt(3);
        const buttonCode = buttonByte - 32;
        
        if (buttonCode === 64 || buttonCode === 0) {
          onScrollUp();
        } else if (buttonCode === 65 || buttonCode === 1) {
          onScrollDown();
        }
      }
    };
    
    if (process.stdin.isTTY) {
      process.stdin.on('data', rawDataHandler);
    }
    
    return () => {
      process.stdout.write('\x1b[?1000l');
      if (process.stdin.isTTY) {
        process.stdin.off('data', rawDataHandler);
      }
    };
  }, [onScrollUp, onScrollDown]);
}
