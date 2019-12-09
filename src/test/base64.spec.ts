import { TestBed } from '@angular/core/testing';

import { Base64 } from '../app/base64';
import { Helper } from '../app/helper';

describe('base64 functions', ()=>{
    
    it('simple test', () => {
        var orig = "hello world";
        var origBuffer = Helper.StringToArrayBuffer(orig);

        var b64 = Base64.toBase64String(origBuffer);
        expect(b64).toBe("aGVsbG8gd29ybGQ=");
        var decoded = Base64.toArrayBuffer(b64);
        var decodedStr = Helper.ArrayBufferToUtf8String(decoded);
        expect(decodedStr).toBe(orig);
    });

    it('binary test', () => {
        binaryTest("00", "AA==");
        binaryTest("00010203040506", "AAECAwQFBg==");
    });

    function binaryTest(hexStr, base64)
    {
        var orig = hexStr;
        var origBuffer = Helper.HexStringToArrayBuffer(orig);

        var b64 = Base64.toBase64String(origBuffer);
        expect(b64).toBe(base64);
        var decoded = Base64.toArrayBuffer(b64);
        var decodedStr = Helper.ArrayBufferToHexString(decoded);
        expect(decodedStr).toBe(orig);
    }
});

