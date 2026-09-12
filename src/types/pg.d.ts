declare module 'pg' {
  export class Pool {
    constructor(config?: any);
    query(queryTextOrConfig: string | any, values?: any[]): Promise<any>;
    connect(): Promise<any>;
    end(): Promise<void>;
    on(event: string, listener: (...args: any[]) => void): this;
  }
  export class Client {
    constructor(config?: any);
    connect(): Promise<void>;
    query(queryTextOrConfig: string | any, values?: any[]): Promise<any>;
    end(): Promise<void>;
  }
}
