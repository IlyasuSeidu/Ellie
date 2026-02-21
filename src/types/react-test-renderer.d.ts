declare module 'react-test-renderer' {
  import * as React from 'react';

  export interface ReactTestRendererJSON {
    type: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    props: any;
    children: Array<ReactTestRendererJSON | string> | null;
  }

  export interface ReactTestInstance {
    type: string | React.JSXElementConstructor<unknown>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    props: any;
    parent: ReactTestInstance | null;
    children: Array<ReactTestInstance | string>;
    findByType(type: string | React.JSXElementConstructor<unknown>): ReactTestInstance;
    findAllByType(type: string | React.JSXElementConstructor<unknown>): ReactTestInstance[];
  }

  export interface ReactTestRenderer {
    toJSON(): ReactTestRendererJSON | ReactTestRendererJSON[] | null;
    root: ReactTestInstance;
    update(nextElement: React.ReactElement): void;
    unmount(): void;
  }

  export function create(element: React.ReactElement, options?: unknown): ReactTestRenderer;
  export function act(callback: () => void): void;
  export function act(callback: () => Promise<void>): Promise<void>;
}
