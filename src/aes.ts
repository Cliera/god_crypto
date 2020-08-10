// https://csrc.nist.gov/csrc/media/publications/fips/197/final/documents/fips-197.pdf
// https://csrc.nist.gov/csrc/media/projects/cryptographic-standards-and-guidelines/documents/aes-development/rijndael-ammended.pdf#page=19
// https://link.springer.com/content/pdf/10.1007/3-540-36400-5_13.pdf
// http://asmaes.sourceforge.net/rijndael/rijndaelImplementation.pdf
// https://www.movable-type.co.uk/scripts/aes.html
import {
  BlockCiper,
  BlockCiperConfig,
  BlockCiperOperation,
} from "./block_ciper_operator.ts";

// deno-fmt-ignore
const SBOX: any = [
  0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
  0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
  0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
  0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
  0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
  0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
  0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
  0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
  0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
  0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
  0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
  0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
  0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
  0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
  0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
  0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16,
];

const RCON = [0x00, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];

function rotWord(keySchedule: Uint8Array, column: number) {
  const offset = column * 4;
  const tmp = keySchedule[offset];
  keySchedule[offset] = keySchedule[offset + 1];
  keySchedule[offset + 1] = keySchedule[offset + 2];
  keySchedule[offset + 2] = keySchedule[offset + 3];
  keySchedule[offset + 3] = tmp;
}

function subWord(keySchedule: Uint8Array, column: number) {
  const offset = column * 4;
  for (let i = 0; i < 4; i++) {
    keySchedule[offset + i] = SBOX(keySchedule[offset + i]);
  }
}

function keyExpansion(key: Uint8Array) {
  const Nb = 4;
  const Nk = key.length / 4;
  const Nr = Nk + 6;

  const keySchedule = new Uint8Array(16 * (Nr + 1));
  keySchedule.set(key, 0);

  for (let i = Nk; i < (Nb * (Nr + 1)); i++) {
    const prevOffset = (i - Nk) * 4;
    const offset = i * 4;

    keySchedule[offset] = keySchedule[offset - 4];
    keySchedule[offset + 1] = keySchedule[offset - 3];
    keySchedule[offset + 2] = keySchedule[offset - 2];
    keySchedule[offset + 3] = keySchedule[offset - 1];

    if (i % Nk === 0) {
      rotWord(keySchedule, i);
      subWord(keySchedule, i);
      keySchedule[offset] ^= RCON[i / Nk];
    } else if (Nk > 6 && i % Nk === 4) {
      subWord(keySchedule, i);
    }

    keySchedule[offset] ^= keySchedule[prevOffset];
    keySchedule[offset + 1] ^= keySchedule[prevOffset + 1];
    keySchedule[offset + 2] ^= keySchedule[prevOffset + 2];
    keySchedule[offset + 3] ^= keySchedule[prevOffset + 3];
  }

  return keySchedule;
}

interface AESBlockCiperConfig {
  bits: number;
}

class AESBlockCiper implements BlockCiper {
  protected keySchedule: Uint8Array;

  constructor(key: Uint8Array, config: AESBlockCiperConfig) {
    this.keySchedule = keyExpansion(key);
  }

  protected ciper(m: Uint8Array) {
    const nb = 4;
    const nr = this.keySchedule.length / 16 - 1;

    const state = new Uint8Array(m);
    this.addRoundKey(state, 0);

    for (let i = 1; i < nr; i++) {
      this.subBytes(state);
      this.shiftRow(state);
      this.mixColumn(state);
      this.addRoundKey(state, i);
    }

    this.subBytes(state);
    this.shiftRow(state);
    this.addRoundKey(state, nr);

    return state;
  }

  protected subBytes(block: Uint8Array) {
    for (let i = 0; i < block.length; i++) {
      block[i] = SBOX(block[i]);
    }
  }

  protected shiftRow(block: Uint8Array) {
    let t = block[1];
    block[1] = block[5];
    block[5] = block[9];
    block[9] = block[13];
    block[13] = t;

    t = block[10];
    block[10] = block[2];
    block[2] = t;
    t = block[14];
    block[14] = block[6];
    block[6] = t;

    t = block[15];
    block[15] = block[11];
    block[11] = block[7];
    block[7] = block[3];
    block[3] = t;
  }

  protected addRoundKey(state: Uint8Array, round: number) {
    for (let i = 0; i < 16; i++) {
      state[i] ^= this.keySchedule[round * 16 + i];
    }
  }

  protected mixColumn(block: Uint8Array) {
    for (let i = 0; i < 4; i++) {
      const offset = i * 4;
      const a = [
        block[offset],
        block[offset + 1],
        block[offset + 2],
        block[offset + 3],
      ];
      const b = [
        a[0] & 0x80 ? a[0] << 1 ^ 0x011b : a[0] << 1,
        a[1] & 0x80 ? a[1] << 1 ^ 0x011b : a[1] << 1,
        a[2] & 0x80 ? a[2] << 1 ^ 0x011b : a[2] << 1,
        a[3] & 0x80 ? a[3] << 1 ^ 0x011b : a[3] << 1,
      ];

      block[offset] = b[0] ^ a[1] ^ b[1] ^ a[2] ^ a[3];
      block[offset + 1] = a[0] ^ b[1] ^ a[2] ^ b[2] ^ a[3];
      block[offset + 2] = a[0] ^ a[1] ^ b[2] ^ a[3] ^ b[3];
      block[offset + 3] = a[0] ^ b[0] ^ a[1] ^ a[2] ^ b[3];
    }
  }

  encrypt(m: Uint8Array): Uint8Array {
    return new Uint8Array();
  }

  decrypt(m: Uint8Array): Uint8Array {
    throw "Not implement";
  }
}

export class AES {
  protected ciper: AESBlockCiper;
  protected config: AESBlockCiperConfig & BlockCiperConfig;

  constructor(key: Uint8Array, config: AESBlockCiperConfig & BlockCiperConfig) {
    this.ciper = new AESBlockCiper(key, config);
    this.config = config;
  }

  encrypt(m: Uint8Array) {
    BlockCiperOperation.encrypt(m, this.ciper, this.config);
  }
}
