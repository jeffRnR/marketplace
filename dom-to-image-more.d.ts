declare module "dom-to-image-more" {
  interface Options {
    quality?: number;
    scale?:   number;
    bgcolor?: string;
    width?:   number;
    height?:  number;
    style?:   object;
    filter?:  (node: Node) => boolean;
  }
  const domtoimage: {
    toPng:    (node: Element, options?: Options) => Promise<string>;
    toJpeg:   (node: Element, options?: Options) => Promise<string>;
    toSvg:    (node: Element, options?: Options) => Promise<string>;
    toBlob:   (node: Element, options?: Options) => Promise<Blob>;
    toPixelData: (node: Element, options?: Options) => Promise<Uint8ClampedArray>;
  };
  export default domtoimage;
}