// Type declarations for the jsrsasign crypto wrapper (JS, not converted to TS)

export interface JWS {
  JWS: {
    parse(jwt: string): { headerObj: any; payloadObj: any };
    verify(jwt: string, key: any, algs: string[]): boolean;
  };
}

export interface KeyUtilType {
  getKey(key: any): any;
}

export interface X509Type {
  getPublicKeyFromCertHex(hex: string): any;
}

export interface CryptoType {
  Util: {
    hashString(value: string, alg: string): string;
  };
}

export declare const jws: JWS;
export declare const KeyUtil: KeyUtilType;
export declare const X509: X509Type;
export declare const crypto: CryptoType;
export declare function hextob64u(hex: string): string;
export declare function b64tohex(b64: string): string;
export declare const AllowedSigningAlgs: string[];
