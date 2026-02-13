import nacl from 'tweetnacl';
import pkg from 'tweetnacl-util'
const { encodeBase64} = pkg;
// import { encodeBase64 } from 'tweetnacl-util';

const kp = nacl.sign.keyPair();

console.log("Public Key:");
console.log(encodeBase64(kp.publicKey));

console.log("\nPrivate Key:");
console.log(encodeBase64(kp.secretKey));