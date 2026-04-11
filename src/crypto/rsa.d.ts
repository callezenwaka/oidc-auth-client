// Type declarations for the rsa crypto wrapper (JS, not converted to TS)

export { JWS, KeyUtilType, X509Type, CryptoType } from './jsrsasign.js';

export declare const jws: import('./jsrsasign.js').JWS;
export declare const KeyUtil: import('./jsrsasign.js').KeyUtilType;
export declare const X509: import('./jsrsasign.js').X509Type;
export declare const crypto: import('./jsrsasign.js').CryptoType;
export declare function hextob64u(hex: string): string;
export declare function b64tohex(b64: string): string;
export declare const AllowedSigningAlgs: string[];
