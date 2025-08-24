declare module '@dnd-kit/utilities' {
  export const CSS: {
    Transform: {
      toString(transform: {
        x: number;
        y: number;
        scaleX: number;
        scaleY: number;
      } | null): string;
    };
  };
}
