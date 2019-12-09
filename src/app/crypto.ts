import { Helper } from './helper';
import { Base64 } from './base64';
import PixiError, { E } from './error';


export abstract class DecoratedCryptoKey
{
   public Key: CryptoKey;
   public CryptoOptions: any;
}
export class MasterKey extends DecoratedCryptoKey {  
}
export class SessionKey extends DecoratedCryptoKey {  
}
export class EncryptionDetails {
  public CipherOptions: any;
  public WrappedSessionKey: WrappedKey;

  static transformObject(data: any)
  {
    data["CipherOptions"] = CipherOptionsHelper.fromJSON(data["CipherOptions"]);
    data["WrappedSessionKey"] = WrappedKey.fromJSON(data["WrappedSessionKey"]);
  }

  static fromJSON(data: any): EncryptionDetails {
    this.transformObject(data);
    return Helper.createRaw(EncryptedData, data);
  }
}
export class MasterKeyAndPasswordBlock
{
   parentMasterKey: MasterKey;
   catalogPasswordBlock: CatalogPasswordBlock;
}
export class EncryptedData extends EncryptionDetails {

   public CipherText: ArrayBuffer;

   public toJSON() {
     var clone = Object.assign({}, this) as Object; // we need this as we will change the type to string
     clone["CipherText"] = Base64.toBase64String(clone["CipherText"]);
     return clone;
   }
   static fromJSON(data: any): EncryptedData {
      EncryptionDetails.transformObject(data);
      if(data["CipherText"])
         data["CipherText"] = Base64.toArrayBuffer(data["CipherText"])
      return Helper.createRaw(EncryptedData, data);
   }
}
class CipherOptionsHelper {
  static fromJSON(data: any): any {
    if(data["name"] == AESGCM_CIPHER_ALGO)
       data = AesGcmWithIvOptions.fromJSON(data);
    return data;
  }
}

export class WrappedKey {
   public WrapOptions: any;
   public KeyOptions: any;
   public WrappedKey: ArrayBuffer;
   public toJSON(){
      var clone = Object.assign({}, this) as Object; // we need this as we will change the type to string
      clone["WrappedKey"] = Base64.toBase64String(clone["WrappedKey"]);
      return clone;
   }
   static fromJSON(data: any): WrappedKey {
      data["WrapOptions"] = CipherOptionsHelper.fromJSON(data["WrapOptions"]);
      data["KeyOptions"] = CipherOptionsHelper.fromJSON(data["KeyOptions"]);
      data["WrappedKey"] = Base64.toArrayBuffer(data["WrappedKey"])
      return Helper.createRaw(WrappedKey, data);
   }
}

export class AuthenticationData {
   public PasswordHash: string;
   public HashAlgorithm: string;
   public Iterations: number;
}

export class AesGcmOptions {
  public name: string = AESGCM_CIPHER_ALGO;
  public length: number = 256;
}

export class AesGcmWithIvOptions extends AesGcmOptions {
  public iv: Uint8Array;

  constructor() {
    super();
    this.iv = window.crypto.getRandomValues(new Uint8Array(12));
  } 
  public toJSON() {
    var clone = Object.assign({}, this) as Object;
    clone["iv"] = Base64.toBase64String(clone["iv"]);
    return clone;
  }
  static fromJSON(data: any): AesGcmWithIvOptions {
    data["iv"] = Base64.toUint8Array(data["iv"])
    return Helper.createRaw(AesGcmWithIvOptions, data);
 }

}

export class DerivedMasterKey {
   public DeriveAlgo : any;
   public DeriveOptions: any;
   public MasterKey: MasterKey;
}
export class DerivedCatalog {
  public Seed: ArrayBuffer;
  public Algo: any;
  public Options: any;
  public toJSON() {
    var clone = Object.assign({}, this) as Object;
    clone["Seed"] = Base64.toBase64String(clone["Seed"]);
    return clone;
  }
  static fromJSON(data: any): DerivedCatalog {
    data["Seed"] = Base64.toUint8Array(data["Seed"])
    return Helper.createRaw(DerivedCatalog, data);
  }
}
export class CatalogPasswordBlock {
   public Derived ?: DerivedCatalog;
   public WrappedMasterKeys : Array<CatalogWrappedMasterKey>;
   public PasswordTest : EncryptedData;
   static fromJSON(data: any): CatalogPasswordBlock {
      if(data["Derived"]) data["Derived"] = DerivedCatalog.fromJSON(data["Derived"]);
      data["PasswordTest"] = EncryptedData.fromJSON(data["PasswordTest"]);
      for(var i = 0; i < data["WrappedMasterKeys"].length; i++) {
        data["WrappedMasterKeys"][i] = CatalogWrappedMasterKey.fromJSON(data["WrappedMasterKeys"][i]);
      }
      return Helper.createRaw(CatalogPasswordBlock, data);
   }
}
export class CatalogWrappedMasterKey {
  public Comment : string;
  public FirstTime ?: boolean;
  public DeriveAlgo : any;
  public DeriveOptions: any;
  public WrappedKey : WrappedKey;
  static fromJSON(data: any): CatalogWrappedMasterKey {
     data["WrappedKey"] = WrappedKey.fromJSON(data["WrappedKey"]);
     return Helper.createRaw(CatalogWrappedMasterKey, data);
  }
}
export class CatalogMasterKey {
  public MasterKey : MasterKey;
  public DecodedKeyBlock : CatalogWrappedMasterKey;
}

const KEY_USAGES_WRAP = ["wrapKey", "unwrapKey", "encrypt", "decrypt"];
const KEY_USAGES_SESSION = ["encrypt", "decrypt", "wrapKey", "unwrapKey" ];

const AUTH_HASH_ITERATION = 100;
const AUTH_HASH_ALGO = "SHA-512";
const DERIVE_HASH_ALGO = "SHA-256";
const DERIVE_HMAC_ALGO = "HMAC";
const AESGCM_CIPHER_ALGO = "AES-GCM";

const PASSWORD_VERIFICATION_DATA = "abcdefgh12345678";

export class Crypto {

  /*
  example output:
{
"alg":"A256GCM", 
"ext": true, 
"k": "9QrdUTKcNPNUseIisFWYrnWrUxmea1Puc2RRAKxj3-A",
"key_ops": ["encrypt", "decrypt", "wrapKey", "unwrapKey"], 
"kty": "oct"
}

  */
  public static async ExportMasterKey(keyToExport: MasterKey) : Promise<JsonWebKey>
  {
    return await window.crypto.subtle.exportKey("jwk", keyToExport.Key);
  }
  public static async ImportMasterKey(keyToImport: JsonWebKey) : Promise<MasterKey>
  {
    var options = new AesGcmWithIvOptions();
    var ck = await window.crypto.subtle.importKey("jwk", keyToImport, options, true, KEY_USAGES_WRAP);
    return {
      Key: ck,
      CryptoOptions: options,
    };
  }

  public static async WrapKey(keyToWrap: DecoratedCryptoKey, keyToWrapWith: MasterKey) : Promise<WrappedKey>
  {
     var cipherOptions = new AesGcmWithIvOptions();

     var ab = await window.crypto.subtle.wrapKey(
      "jwk", //can be "jwk", "raw", "spki", or "pkcs8"
      keyToWrap.Key, //the key you want to wrap, must be able to export to above format
      keyToWrapWith.Key, //the AES-GCM key with "wrapKey" usage flag
      cipherOptions
     );

     var re : WrappedKey = Helper.createRaw(WrappedKey, {
        WrapOptions: cipherOptions,
        KeyOptions: keyToWrap.CryptoOptions,
        WrappedKey: ab
     });

     return re;
  }

  private static async UnwrapKey(keyToUnwrap: WrappedKey, masterKey: MasterKey, keyUsage: Array<string>) : Promise<DecoratedCryptoKey>
  {
    var ab = await window.crypto.subtle.unwrapKey(
      "jwk", 
      keyToUnwrap.WrappedKey,
      masterKey.Key,
      keyToUnwrap.WrapOptions,
      keyToUnwrap.KeyOptions,
      true, //whether the key is extractable (i.e. can be used in exportKey)
      keyUsage
     );

     return {
        CryptoOptions: keyToUnwrap.KeyOptions,
        Key: ab
     };
  }

  public static async UnwrapSessionKey(keyToUnwrap: WrappedKey, masterKey: MasterKey) : Promise<SessionKey>
  {
     return this.UnwrapKey(keyToUnwrap, masterKey, KEY_USAGES_SESSION);
  }
  public static async UnwrapWrapperKey(keyToUnwrap: WrappedKey, masterKey: MasterKey) : Promise<MasterKey>
  {
     return this.UnwrapKey(keyToUnwrap, masterKey, KEY_USAGES_WRAP);
  }

  private static async GenerateKey(options: any, keyModes: Array<string>): Promise<DecoratedCryptoKey>
  {
    var key = await window.crypto.subtle.generateKey(
      options,
      true, //whether the key is extractable (i.e. can be used in exportKey)
      keyModes
    );

    return {
      Key: key as CryptoKey,
      CryptoOptions: options,
    }
  }

  // this key will be used to wrap other keys (like the master key or individual session keys)
  public static async GenerateWrapperKey() : Promise<MasterKey>
  {
    return this.GenerateKey(new AesGcmWithIvOptions(), KEY_USAGES_WRAP);
  }

  // this key will be used to encrypt individual files
  public static async GenerateSessionKey() : Promise<SessionKey>
  {
    return this.GenerateKey(new AesGcmWithIvOptions(), KEY_USAGES_SESSION);
  }

  public static async ReencryptWrapper(encryptionDetailsToBeReencrypted: EncryptionDetails, oldMasterKey: MasterKey, newMasterKey: MasterKey) {
      var sessionKey = await Crypto.UnwrapSessionKey(encryptionDetailsToBeReencrypted.WrappedSessionKey, oldMasterKey);
      var newWrappedKey = await Crypto.WrapKey(sessionKey, newMasterKey)
      var clone = Helper.create(EncryptionDetails, encryptionDetailsToBeReencrypted);
      clone.WrappedSessionKey = newWrappedKey;
      return clone;
  }

  public static async CalculateHashAsHexString(algo: string, data: ArrayBuffer) : Promise<string>
  {
     var b = await window.crypto.subtle.digest(algo, data);
     return Helper.ArrayBufferToHexString(b);
  }

  public static async DeriveAuthenticationHashFromPassword(password: string) : Promise<AuthenticationData>
  {
     var passwordArray : any;
     passwordArray = Helper.StringToArrayBuffer(password);

     for(var i = 0; i < AUTH_HASH_ITERATION; i++) {
        passwordArray = await window.crypto.subtle.digest(AUTH_HASH_ALGO, passwordArray);
     }
     
     return {
       PasswordHash: Helper.ArrayBufferToHexString(passwordArray),
       HashAlgorithm: AUTH_HASH_ALGO,
       Iterations: AUTH_HASH_ITERATION,
     }
  }

  public static async DeriveWrapperKeyFromPasswordBuffer(passwordArray: ArrayBuffer, algo: any, cipherOptions: any) : Promise<DerivedMasterKey>
  {
    var ab = await window.crypto.subtle.digest(algo, passwordArray);

    var ck = await window.crypto.subtle.importKey(
      "raw", //can be "jwk" or "raw"
      ab,
      cipherOptions,
      true,
      KEY_USAGES_WRAP
    );

    return {
      DeriveAlgo: algo,
      DeriveOptions: cipherOptions,
      MasterKey: {
        Key: ck,
        CryptoOptions: cipherOptions,  
      }
    }
  }
  public static async DeriveWrapperKeyFromPassword(password: string) : Promise<DerivedMasterKey>
  {
    var passwordBuffer = Helper.StringToArrayBuffer(password);
    var cipherOptions = new AesGcmOptions(); // no iv is needed here
    return this.DeriveWrapperKeyFromPasswordBuffer(passwordBuffer, DERIVE_HASH_ALGO, cipherOptions);
  }

  // this will need to return which masterkey block it managed to unwrap
  public static async CatalogOpenPasswordBlock(password: string, catalogPasswordBlock : CatalogPasswordBlock) : Promise<CatalogMasterKey>
  {
     var passwordBuffer = Helper.StringToArrayBuffer(password);
     for(let entry of catalogPasswordBlock.WrappedMasterKeys)
     {
       try {
         // console.log("working on", entry, "deriving with", entry.WrappedKey.WrapOptions)
         var wrapper = await this.DeriveWrapperKeyFromPasswordBuffer(passwordBuffer, entry.DeriveAlgo, entry.DeriveOptions);
         var masterKey = await this.UnwrapWrapperKey(entry.WrappedKey, wrapper.MasterKey);

         // masterKey derivation always succeeds, so we need to verify whether we can access the built in password test
         await this.CatalogVerifyMasterKey(masterKey, catalogPasswordBlock);

         // all good!
         return {
           DecodedKeyBlock: entry,
           MasterKey: masterKey,         
         } 
       }
       catch(e)
       {
          // this might be ok, if the password belongs to another entry
       }       
     }

     throw new PixiError(E.InvalidPasswordError);
  }

  public static async CatalogVerifyMasterKey(masterKey: MasterKey, catalog: CatalogPasswordBlock)
  {
     var decrypted = await this.DecryptData(masterKey, catalog.PasswordTest);
     var str = Helper.ArrayBufferToUtf8String(decrypted);
     if(str != PASSWORD_VERIFICATION_DATA)
         throw new PixiError(E.InvalidPasswordError);

     // all good!
  }

  private static async CatalogGetWrappedMasterKey(existingMasterKey: MasterKey, password: string, comment: string) : Promise<CatalogWrappedMasterKey>
  {
    var passwordKey = await this.DeriveWrapperKeyFromPassword(password);
    var wrappedMasterKey = await this.WrapKey(existingMasterKey, passwordKey.MasterKey);
    var newAccess = {
      DeriveAlgo: passwordKey.DeriveAlgo,
      DeriveOptions: passwordKey.DeriveOptions,
      WrappedKey: wrappedMasterKey,
      Comment: comment,
    };
    return newAccess;
  }

  public static async CatalogAppendPasswordBlock(existingMasterKey: MasterKey, password: string, comment: string, catalog: CatalogPasswordBlock)
  {
    await this.CatalogVerifyMasterKey(existingMasterKey, catalog);
    
    //ok, the provided master key is compatible indeed, lets add it:
    var newAccess = await this.CatalogGetWrappedMasterKey(existingMasterKey, password, comment);

    catalog.WrappedMasterKeys.push(newAccess);
  }

  public static async CatalogNewPasswordBlock(password: string, comment: string) : Promise<CatalogPasswordBlock>
  {
     var newMasterKey = await this.GenerateWrapperKey();
     var encryptedData = await this.EncryptData(newMasterKey, Helper.StringToArrayBuffer(PASSWORD_VERIFICATION_DATA));
     var newAccess = await this.CatalogGetWrappedMasterKey(newMasterKey, password, comment);
     return {
       PasswordTest: encryptedData,
       WrappedMasterKeys: [newAccess]
     };
  }

  public static async EncryptData(masterKey: MasterKey, data: ArrayBuffer): Promise<EncryptedData>
  {
    var sessionKey = await this.GenerateSessionKey();
    var wrappedSessionKey = await this.WrapKey(sessionKey, masterKey);
    var cipherOptions = new AesGcmWithIvOptions();
    var cipherText = await this.EncryptDataRaw(sessionKey, data, cipherOptions);

    var re: EncryptedData = Helper.createRaw(EncryptedData, {
      CipherOptions: cipherOptions,
      WrappedSessionKey: wrappedSessionKey,
      CipherText: cipherText
    });

    return re;
  }

  public static async DecryptData(masterKey: MasterKey, encData: EncryptedData): Promise<ArrayBuffer>
  {
    var sessionKey = await this.UnwrapSessionKey(encData.WrappedSessionKey, masterKey);
    return await this.DecryptDataRaw(sessionKey, encData.CipherText, encData.CipherOptions);
  }

  public static async EncryptDataRaw(sessionKey: SessionKey, data: ArrayBuffer, cipherOptions: any) : Promise<ArrayBuffer>
  {
     return await window.crypto.subtle.encrypt(cipherOptions, sessionKey.Key, data);
  }

  public static async DecryptDataRaw(sessionKey: SessionKey, encData: ArrayBuffer, cipherOptions: any) : Promise<ArrayBuffer>
  {
     return await window.crypto.subtle.decrypt(cipherOptions, sessionKey.Key, encData);
  }

  private static async DeriveMasterKey(masterKey: MasterKey, derivedInfo: DerivedCatalog, cipherOptions: any) : Promise<DerivedMasterKey>
  {
     var rawMaster = await window.crypto.subtle.exportKey("raw", masterKey.Key);
     var hmacKey = await window.crypto.subtle.importKey("raw", rawMaster, derivedInfo.Options, true, ["sign", "verify"]);
     var derivedBlob = await window.crypto.subtle.sign(derivedInfo.Algo, hmacKey, derivedInfo.Seed);
     var derivedKey = await window.crypto.subtle.importKey("raw", derivedBlob, cipherOptions, true, KEY_USAGES_WRAP);
     return {
        DeriveAlgo: derivedInfo.Algo,
        DeriveOptions: derivedInfo.Options,
        MasterKey: {
          CryptoOptions: cipherOptions,
          Key: derivedKey,  
        }
     };
  }

  private static async DeriveNewMasterKey(masterKey: MasterKey, seed: ArrayBuffer) : Promise<DerivedMasterKey>
  {
     var deriveInfo = new DerivedCatalog();
     deriveInfo.Seed = seed;
     deriveInfo.Algo = DERIVE_HMAC_ALGO;
     deriveInfo.Options = {   //this is the algorithm options
       name: DERIVE_HMAC_ALGO,
       hash: {name: DERIVE_HASH_ALGO},
     };

     return await this.DeriveMasterKey(masterKey, deriveInfo, new AesGcmWithIvOptions());
  }

  public static async GenerateRandomPassword(): Promise<string>
  {
    var seed = window.crypto.getRandomValues(new Uint8Array(16)).buffer as ArrayBuffer;
    return Crypto.CalculateHashAsHexString(DERIVE_HASH_ALGO, seed);
  }

  public static async CatalogNewDerivedPasswordBlock(parentMasterKey: MasterKey) : Promise<CatalogPasswordBlock>
  {
     var seed = window.crypto.getRandomValues(new Uint8Array(16)).buffer as ArrayBuffer;
     var derivedNewMasterKey = await this.DeriveNewMasterKey(parentMasterKey, seed);

     var encryptedData = await this.EncryptData(derivedNewMasterKey.MasterKey, Helper.StringToArrayBuffer(PASSWORD_VERIFICATION_DATA));

     var derived : DerivedCatalog = Helper.createRaw(DerivedCatalog, {
       Seed: seed,
       Algo: derivedNewMasterKey.DeriveAlgo,
       Options: derivedNewMasterKey.DeriveOptions,
     });

     var re : CatalogPasswordBlock = Helper.createRaw(CatalogPasswordBlock, {
       Derived: derived,
       PasswordTest: encryptedData,
       WrappedMasterKeys: []
     });

     return re;
  }

  public static async CatalogOpenDerivedPasswordBlock(parentMasterKey: MasterKey, catalogPasswordBlock : CatalogPasswordBlock) : Promise<MasterKey>
  {
     if(!catalogPasswordBlock.Derived)
        throw new PixiError(E.InvalidCatalogError);

     var derivedMasterKey = await this.DeriveMasterKey(parentMasterKey, catalogPasswordBlock.Derived, catalogPasswordBlock.PasswordTest.CipherOptions);

     // this method throws if the derived key is invalid
     await this.CatalogVerifyMasterKey(derivedMasterKey.MasterKey, catalogPasswordBlock);

     return derivedMasterKey.MasterKey;
  }


}
